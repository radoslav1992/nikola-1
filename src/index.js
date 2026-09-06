/**
 * НИ Имоти — Cloudflare Worker entry point.
 *
 * Routes (each also under /en/… for English):
 *   /                     home
 *   /imoti                all listings with filters + pagination
 *   /imot/:id/:slug       property page
 *   /img/agent.jpg        agent photo (proxied from the agency site)
 *   /img/:size/:file      property photos (proxied + cached)
 *   /api/listings         JSON of the current listings
 *   /api/ask   (POST)     AI search / question about a property
 *   /api/contact (POST)   contact form
 *   /api/refresh          manual re-scrape (needs REFRESH_TOKEN secret)
 *   /api/debug/source     what suprimmo actually serves + how we parse it (token if REFRESH_TOKEN set)
 *   /sitemap.xml, /healthz
 * Static files in ./public are served by the assets binding before the Worker runs.
 */
import { getListings, getDetail, refreshListings, storeLead, readListings, getTestimonials, refreshTestimonials } from './store.js';
import { parseFilters } from './catalog.js';
import { searchListings, askAboutListing } from './ai.js';
import { renderHome } from './render/home.js';
import { renderListings } from './render/listings.js';
import { renderMap } from './render/map.js';
import { renderReviews, reviewsSection } from './render/testimonials.js';
import { renderProperty, renderNotFound } from './render/property.js';
import { cardGrid, listingPath } from './render/components.js';
import { toString } from './render/html.js';
import { href, waLink } from './render/layout.js';
import { SITE, AGENT } from './render/i18n.js';
import { IMAGE_BASE, AGENT_PHOTO_URL, debugSource } from './scraper.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx);
    } catch (err) {
      console.error('Unhandled error', err && err.stack ? err.stack : err);
      return new Response('Internal error', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      refreshListings(env, { network: true }).then(
        (d) => console.log(`cron: refreshed ${d.items.length} listings`),
        (e) => console.error('cron: refresh failed', e && e.message),
      ),
    );
    ctx.waitUntil(
      refreshTestimonials(env).then(
        (d) => console.log(`cron: refreshed ${d.items.length} testimonials`),
        (e) => console.error('cron: testimonials refresh failed', e && e.message),
      ),
    );
  },
};

/* ───────────────────────── routing ───────────────────────── */

async function handle(request, env, ctx) {
  const url = new URL(request.url);

  // www → apex
  if (url.hostname.startsWith('www.') && !url.hostname.endsWith('.workers.dev')) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }

  let path = url.pathname.replace(/\/{2,}/g, '/');
  let lang = 'bg';
  if (path === '/en' || path.startsWith('/en/')) {
    lang = 'en';
    path = path.slice(3) || '/';
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  if (path === '/healthz') return json({ ok: true, site: SITE.domain, time: new Date().toISOString() });

  if (path.startsWith('/img/')) return serveImage(request, path, ctx);

  if (path.startsWith('/api/')) return handleApi(request, env, ctx, path, url, lang);

  if (path === '/sitemap.xml') return sitemap(env, ctx);

  if (path === '/') {
    const [data, testimonials] = await Promise.all([getListings(env, ctx), getTestimonials(env, ctx)]);
    return htmlResponse(renderHome({ lang, data, env, testimonials }));
  }

  if (path === '/otzivi' || path === '/reviews') {
    const [data, testimonials] = await Promise.all([getListings(env, ctx), getTestimonials(env, ctx)]);
    return htmlResponse(renderReviews({ lang, data, testimonials, env }));
  }

  if (path === '/imoti') {
    const data = await getListings(env, ctx);
    const filters = parseFilters(url.searchParams);
    return htmlResponse(renderListings({ lang, data, filters, env, query: url.searchParams.toString() }));
  }

  if (path === '/karta' || path === '/map') {
    const data = await getListings(env, ctx);
    const filters = parseFilters(url.searchParams);
    return htmlResponse(renderMap({ lang, data, filters, env, query: url.searchParams.toString() }));
  }

  const propM = path.match(/^\/imot\/(\d+)(?:\/([^/]*))?$/);
  if (propM) {
    const id = parseInt(propM[1], 10);
    const data = await getListings(env, ctx);
    const listing = data.items.find((l) => l.id === id);
    if (!listing) return htmlResponse(renderNotFound({ lang, env, path }), 404);
    const canonicalPath = listingPath(listing);
    if (path !== canonicalPath) return Response.redirect(new URL(href(lang, canonicalPath), url).toString(), 301);
    const detail = await getDetail(env, ctx, listing);
    return htmlResponse(renderProperty({ lang, data, listing, detail, env }));
  }

  // Static assets (public/) or 404
  if (env.ASSETS) {
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;
  }
  return htmlResponse(renderNotFound({ lang, env, path }), 404);
}

/* ───────────────────────── API ───────────────────────── */

async function handleApi(request, env, ctx, path, url, lang) {
  if (path === '/api/listings') {
    const data = await getListings(env, ctx);
    return json({ total: data.items.length, priced: data.items.filter((l) => l.price != null).length, sourceTotal: data.total, fetchedAt: data.fetchedAt, seed: Boolean(data.seed), items: data.items }, 200, { 'cache-control': 'public, max-age=300' });
  }

  if (path === '/api/debug/source') {
    const token = url.searchParams.get('token') || '';
    if (env.REFRESH_TOKEN && token !== env.REFRESH_TOKEN) return json({ error: 'not found' }, 404);
    try {
      return json(await debugSource(fetch, { page: parseInt(url.searchParams.get('page') || '1', 10) || 1 }));
    } catch (err) {
      return json({ ok: false, error: String(err && err.message) }, 502);
    }
  }

  if (path === '/api/refresh') {
    const token = url.searchParams.get('token') || request.headers.get('x-refresh-token') || '';
    if (!env.REFRESH_TOKEN || token !== env.REFRESH_TOKEN) return json({ error: 'not found' }, 404);
    try {
      const data = await refreshListings(env);
      const reviews = await refreshTestimonials(env).catch((e) => ({ error: String(e && e.message) }));
      return json({ ok: true, testimonials: reviews.items ? reviews.items.length : reviews, items: data.items.length, total: data.total, pages: data.pages, failedPages: data.failedPages, fetchedAt: data.fetchedAt });
    } catch (err) {
      return json({ ok: false, error: String(err && err.message) }, 502);
    }
  }

  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const body = await readBody(request);
  const bodyLang = body.lang === 'en' ? 'en' : lang;

  if (path === '/api/ask') {
    const q = String(body.q || '').trim().slice(0, 400);
    if (!q) return json({ error: 'empty question' }, 400);
    const data = await getListings(env, ctx);
    const listingId = parseInt(body.listingId, 10);
    if (listingId) {
      const listing = data.items.find((l) => l.id === listingId);
      if (!listing) return json({ error: 'unknown listing' }, 404);
      const detail = await getDetail(env, ctx, listing);
      const res = await askAboutListing(env, listing, detail, q, bodyLang);
      return json(res);
    }
    const res = await searchListings(env, data.items, q, bodyLang);
    const items = res.ids.map((id) => data.items.find((l) => l.id === id)).filter(Boolean);
    return json({ ...res, count: items.length, html: items.length ? toString(cardGrid(items, bodyLang)) : '' });
  }

  if (path === '/api/contact') return handleContact(request, env, body, bodyLang);

  return json({ error: 'not found' }, 404);
}

async function handleContact(request, env, body, lang) {
  const name = String(body.name || '').trim().slice(0, 120);
  const contact = String(body.contact || '').trim().slice(0, 160);
  const message = String(body.message || '').trim().slice(0, 3000);
  const honeypot = String(body.website || '').trim();
  const listingRef = String(body.listingRef || '').trim().slice(0, 40);
  const listingTitle = String(body.listingTitle || '').trim().slice(0, 200);
  const listingId = parseInt(body.listingId, 10) || null;

  const waText = lang === 'en'
    ? `Hello Nikola, I am ${name || '...'}${listingRef ? `, interested in property ${listingRef}` : ''}. ${message}`.trim()
    : `Здравейте, Никола, аз съм ${name || '...'}${listingRef ? `, интересувам се от имот ${listingRef}` : ''}. ${message}`.trim();
  const whatsapp = waLink(waText);

  if (honeypot) return json({ ok: true, whatsapp }); // bots think they succeeded
  if (!name || !contact) return json({ ok: false, error: 'invalid', whatsapp }, 400);

  const lead = {
    name, contact, message, listingId, listingRef, listingTitle, lang,
    receivedAt: new Date().toISOString(),
    country: request.cf?.country || null,
    page: request.headers.get('referer') || null,
  };

  const [stored, mailed] = await Promise.all([storeLead(env, lead), sendLeadEmail(env, lead)]);
  const ok = stored || mailed;
  if (!ok) console.warn('Lead not delivered: configure a KV binding (LISTINGS) or RESEND_API_KEY + CONTACT_TO', lead);
  return json({ ok, stored, mailed, whatsapp }, ok ? 200 : 503);
}

async function sendLeadEmail(env, lead) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) return false;
  const subject = `${SITE.name}: запитване от ${lead.name}${lead.listingRef ? ` за ${lead.listingRef}` : ''}`;
  const text = [
    `Име: ${lead.name}`,
    `Контакт: ${lead.contact}`,
    lead.listingRef ? `Имот: ${lead.listingRef} — ${lead.listingTitle}` : null,
    lead.listingId ? `Линк: ${(env.SITE_URL || `https://${SITE.domain}`).replace(/\/$/, '')}/imot/${lead.listingId}` : null,
    '',
    lead.message || '(без съобщение)',
    '',
    `Език: ${lead.lang} · Държава: ${lead.country || '?'} · Получено: ${lead.receivedAt}`,
    lead.page ? `Страница: ${lead.page}` : null,
  ].filter((x) => x != null).join('\n');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM || `${SITE.name} <onboarding@resend.dev>`,
        to: env.CONTACT_TO.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: /@/.test(lead.contact) ? lead.contact : undefined,
        subject,
        text,
      }),
    });
    if (!res.ok) console.warn('Resend error', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.warn('Resend failed', err && err.message);
    return false;
  }
}

async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) return (await request.json()) || {};
    if (ct.includes('form')) {
      const fd = await request.formData();
      return Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));
    }
    const text = await request.text();
    try { return JSON.parse(text); } catch { return Object.fromEntries(new URLSearchParams(text)); }
  } catch {
    return {};
  }
}

/* ───────────────────────── images ───────────────────────── */

const IMAGE_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  referer: 'https://www.suprimmo.bg/',
};

async function serveImage(request, path, ctx) {
  let upstream;
  if (path === '/img/agent.jpg') {
    upstream = AGENT_PHOTO_URL;
  } else {
    const m = path.match(/^\/img\/(medium|big|small)\/([A-Za-z0-9._-]+)$/);
    const file = m && decodeURIComponent(m[2]);
    if (!m || !/^\d+T\d+_\d+\.(jpe?g|png|webp)$/i.test(file)) return new Response('Not found', { status: 404 });
    upstream = `${IMAGE_BASE}/${m[1]}/${file}`;
  }

  const cacheKey = new Request(new URL(path, request.url).toString(), { method: 'GET' });
  const cache = caches.default;
  const hit = await cache.match(cacheKey).catch(() => null);
  if (hit) return hit;

  let res;
  try {
    res = await fetch(upstream, { headers: IMAGE_HEADERS, cf: { cacheEverything: true, cacheTtl: 60 * 60 * 24 * 30 } });
  } catch {
    res = null;
  }
  if (!res || !res.ok) {
    if (path === '/img/agent.jpg') return placeholderAvatar();
    return new Response('Image unavailable', { status: 502 });
  }
  const out = new Response(res.body, {
    status: 200,
    headers: {
      'content-type': res.headers.get('content-type') || 'image/jpeg',
      'cache-control': 'public, max-age=2592000, immutable',
      'x-image-source': new URL(upstream).hostname,
    },
  });
  if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, out.clone()).catch(() => {}));
  return out;
}

function placeholderAvatar() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><rect width="480" height="480" fill="#EEF1EA"/><circle cx="240" cy="190" r="90" fill="#C9D3C4"/><path d="M80 440c20-90 90-140 160-140s140 50 160 140z" fill="#C9D3C4"/><text x="240" y="215" text-anchor="middle" font-family="Georgia,serif" font-size="72" fill="#F6F3EC">НИ</text></svg>`;
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' } });
}

/* ───────────────────────── sitemap ───────────────────────── */

async function sitemap(env, ctx) {
  const site = (env.SITE_URL || `https://${SITE.domain}`).replace(/\/$/, '');
  const data = await getListings(env, ctx);
  const urls = [];
  const add = (p, priority, lastmod) => {
    for (const lang of ['bg', 'en']) {
      urls.push(`<url><loc>${escXml(site + href(lang, p))}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${priority}</priority></url>`);
    }
  };
  add('/', '1.0', data.fetchedAt);
  add('/imoti', '0.9', data.fetchedAt);
  add('/karta', '0.6', data.fetchedAt);
  add('/otzivi', '0.5', data.fetchedAt);
  for (const l of data.items) add(listingPath(l), '0.7', data.fetchedAt);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ───────────────────────── helpers ───────────────────────── */

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=120, s-maxage=300, stale-while-revalidate=600' : 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'content-language': html.includes('<html lang="en">') ? 'en' : 'bg',
    },
  });
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

// Referenced for completeness; keeps tree-shaking honest in case of future use.
export { readListings, AGENT };
