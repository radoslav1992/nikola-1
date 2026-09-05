/**
 * Listing storage with stale-while-revalidate.
 *
 * Priority:  KV (env.LISTINGS, optional)  →  edge Cache API  →  bundled seed (data/seed.json).
 * Reads never block on the network once something is cached; refreshes run in ctx.waitUntil.
 */
import seed from '../data/seed.json';
import { fetchAllListings, fetchDetail } from './scraper.js';
import { attachCoords } from './geo.js';
import testimonialsSeed from '../data/testimonials.json';
import { fetchTestimonials } from './testimonials.js';

const LISTINGS_KEY = 'listings:v2';
const CACHE_ORIGIN = 'https://cache.ni-imoti.internal';
const DETAIL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const LISTINGS_CACHE_SECONDS = 60 * 60 * 24 * 14; // 14 days (we refresh far more often)

function refreshMs(env) {
  const h = parseFloat(env?.REFRESH_HOURS);
  return (Number.isFinite(h) && h > 0 ? h : 6) * 3600 * 1000;
}

/* ─────────── low-level read/write ─────────── */

async function cacheGet(key) {
  try {
    const res = await caches.default.match(new Request(`${CACHE_ORIGIN}/${key}`));
    return res ? await res.json() : null;
  } catch {
    return null;
  }
}

async function cachePut(key, value, seconds) {
  try {
    await caches.default.put(
      new Request(`${CACHE_ORIGIN}/${key}`),
      new Response(JSON.stringify(value), {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${seconds}` },
      }),
    );
  } catch {
    /* Cache API unavailable (e.g. some local dev setups) — ignore */
  }
}

async function kvGet(env, key) {
  if (!env?.LISTINGS) return null;
  try {
    return await env.LISTINGS.get(key, 'json');
  } catch {
    return null;
  }
}

async function kvPut(env, key, value, opts = {}) {
  if (!env?.LISTINGS) return false;
  try {
    await env.LISTINGS.put(key, JSON.stringify(value), opts);
    return true;
  } catch {
    return false;
  }
}

export async function readListings(env) {
  return (await kvGet(env, LISTINGS_KEY)) || (await cacheGet(LISTINGS_KEY)) || null;
}

async function writeListings(env, data) {
  await Promise.all([kvPut(env, LISTINGS_KEY, data), cachePut(LISTINGS_KEY, data, LISTINGS_CACHE_SECONDS)]);
}

/* ─────────── refresh ─────────── */

let inflight = null;

/** KV/Cache-backed store for geocoding results (place → coords). */
function geoCache(env) {
  return {
    get: async (key) => (await kvGet(env, key)) || (await cacheGet(key)),
    put: async (key, value) => {
      await Promise.all([kvPut(env, key, value), cachePut(key, value, 60 * 60 * 24 * 90)]);
    },
  };
}

/**
 * Scrape suprimmo.bg, attach coordinates and persist. De-duplicated per isolate.
 * `network: true` (cron only) lets unknown villages be geocoded via Nominatim; request-time
 * refreshes stay offline so they finish within the Worker's background time budget.
 */
export async function refreshListings(env, { log = console.log, network = false } = {}) {
  if (inflight) return inflight;
  inflight = (async () => {
    const previous = await readListings(env);
    const data = await fetchAllListings({ log });
    data.refreshedBy = 'live';
    // Keep coordinates we already know (exact ones from property pages, geocoded villages).
    if (previous?.items) {
      const known = new Map(previous.items.map((l) => [l.id, l.coords]).filter(([, c]) => c));
      for (const l of data.items) if (known.has(l.id)) l.coords = known.get(l.id);
    }
    await attachCoords(data.items, { cache: geoCache(env), network, log });
    await writeListings(env, data);
    log(`Stored ${data.items.length} listings (${data.total} total on source)`);
    return data;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Returns the listings dataset, never throwing.
 * - cached & fresh → cached
 * - cached & stale → cached now, refresh in background
 * - nothing cached → try live fetch (bounded), otherwise the bundled seed
 */
export async function getListings(env, ctx) {
  const cached = await readListings(env);
  if (cached && Array.isArray(cached.items) && cached.items.length) {
    const age = Date.now() - Date.parse(cached.fetchedAt || 0);
    if (!(age < refreshMs(env)) && ctx?.waitUntil) {
      ctx.waitUntil(refreshListings(env, { log: () => {} }).catch(() => {}));
    }
    return cached;
  }

  // Cold start: try a live scrape but don't hang the request for long.
  try {
    const live = await withTimeout(refreshListings(env, { log: () => {} }), 12000);
    if (live?.items?.length) return live;
  } catch {
    /* fall through to seed */
  }
  const fallback = { ...seed, items: seed.items.map((l) => ({ ...l })), stale: true };
  await attachCoords(fallback.items, { network: false, sleepMs: 0 });
  return fallback;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/* ─────────── property details ─────────── */

export async function getDetail(env, ctx, listing) {
  const key = `detail:v2:${listing.id}`;
  const cached = (await kvGet(env, key)) || (await cacheGet(key));
  if (cached) {
    const age = Date.now() - Date.parse(cached.fetchedAt || 0);
    if (age > DETAIL_TTL_SECONDS * 1000 && ctx?.waitUntil) {
      ctx.waitUntil(fetchAndStoreDetail(env, listing, key).catch(() => {}));
    }
    return cached;
  }
  try {
    return await withTimeout(fetchAndStoreDetail(env, listing, key), 8000);
  } catch {
    return null;
  }
}

async function fetchAndStoreDetail(env, listing, key) {
  const detail = await fetchDetail(listing);
  await Promise.all([
    kvPut(env, key, detail, { expirationTtl: DETAIL_TTL_SECONDS * 4 }),
    cachePut(key, detail, DETAIL_TTL_SECONDS),
  ]);
  // Exact pin found → upgrade the listing's coordinates in the shared dataset so the map uses it.
  if (detail.coords && !detail.coords.approx) {
    try {
      const data = await readListings(env);
      const l = data?.items?.find((x) => x.id === listing.id);
      if (l && (!l.coords || l.coords.approx)) {
        l.coords = detail.coords;
        await writeListings(env, data);
      }
    } catch {
      /* best effort */
    }
  }
  return detail;
}

/* ─────────── leads (contact form) ─────────── */

export async function storeLead(env, lead) {
  const id = `lead:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
  return kvPut(env, id, lead);
}

/* ─────────── testimonials ─────────── */

const TESTIMONIALS_KEY = 'testimonials:v1';
let inflightTestimonials = null;

export async function refreshTestimonials(env, { log = console.log } = {}) {
  if (inflightTestimonials) return inflightTestimonials;
  inflightTestimonials = (async () => {
    const data = await fetchTestimonials(fetch, { log });
    await Promise.all([kvPut(env, TESTIMONIALS_KEY, data), cachePut(TESTIMONIALS_KEY, data, LISTINGS_CACHE_SECONDS)]);
    log(`Stored ${data.items.length} testimonials`);
    return data;
  })().finally(() => {
    inflightTestimonials = null;
  });
  return inflightTestimonials;
}

/** Testimonials with stale-while-revalidate (24 h); never throws. */
export async function getTestimonials(env, ctx) {
  const cached = (await kvGet(env, TESTIMONIALS_KEY)) || (await cacheGet(TESTIMONIALS_KEY));
  if (cached?.items?.length) {
    const age = Date.now() - Date.parse(cached.fetchedAt || 0);
    if (age > 24 * 3600 * 1000 && ctx?.waitUntil) ctx.waitUntil(refreshTestimonials(env, { log: () => {} }).catch(() => {}));
    return cached;
  }
  try {
    const live = await withTimeout(refreshTestimonials(env, { log: () => {} }), 6000);
    if (live?.items?.length) return live;
  } catch {
    /* fall through */
  }
  return testimonialsSeed;
}
