/**
 * Coordinates for listings.
 *
 * Listings only carry a place name ("близо до гр. Севлиево", "с. Орешене"), so the map works in layers:
 *   1. exact coordinates from the property's own page/map endpoint (detail.coords), when fetched;
 *   2. a built-in gazetteer of towns and villages in Nikola's area;
 *   3. Nominatim (OpenStreetMap) geocoding for unknown places — only from the cron, rate-limited and cached;
 *   4. the regional capital as a last resort.
 * Town-level results are marked approximate and spread in a small ring so markers don't stack.
 */
import { townOf } from './catalog.js';

// [lat, lng] — town centres, good to ~1 km. Keys are the bare names produced by townOf().
export const PLACES = {
  'Севлиево': [43.0256, 25.1133], 'Габрово': [42.8747, 25.3342], 'Априлци': [42.8422, 24.9147], 'Велико Търново': [43.0757, 25.6172],
  'Ловеч': [43.1370, 24.7150], 'Тетевен': [42.9167, 24.2667], 'Павликени': [43.2428, 25.3217], 'Трявна': [42.8667, 25.5000],
  'Троян': [42.8942, 24.7108], 'Дряново': [42.9800, 25.4700], 'Плачковци': [42.8167, 25.4833], 'Елена': [42.9297, 25.8783],
  'Лясковец': [43.1064, 25.7189], 'Горна Оряховица': [43.1281, 25.6928], 'Ябланица': [43.0311, 24.1111], 'Угърчин': [43.1000, 24.4167],
  'Летница': [43.3111, 25.0728], 'Сухиндол': [43.1917, 25.1783], 'Свищов': [43.6194, 25.3500], 'Полски Тръмбеш': [43.3714, 25.6339],
  'Стражица': [43.2333, 25.9667], 'Златарица': [43.0500, 25.9000], 'Килифарево': [42.9833, 25.6333], 'Дебелец': [43.0439, 25.6208],
  'Арбанаси': [43.0947, 25.6717], 'Рибарица': [42.8833, 24.3333], 'Гложене': [42.9958, 24.1717], 'Луковит': [43.2064, 24.1589],
  'Орешене': [43.0100, 24.0700], 'Черни Вит': [42.8933, 24.1800], 'Голям извор': [42.9800, 24.3500], 'Малък извор': [42.9500, 24.3000],
  'Лесидрен': [43.0500, 24.4500], 'Шипково': [42.8500, 24.6333], 'Орешак': [42.8833, 24.7833], 'Чифлик': [42.8167, 24.6833],
  'Бели Осъм': [42.8500, 24.6500], 'Боженци': [42.8500, 25.4167], 'Царева ливада': [42.9333, 25.4667], 'Кръвеник': [42.8167, 25.0500],
  'Столът': [42.8500, 25.0667], 'Стоките': [42.8333, 25.1000], 'Батошево': [42.9000, 25.0500], 'Шумата': [42.9500, 25.1500],
  'Крамолин': [43.1333, 25.2667], 'Добромирка': [43.1000, 25.2167], 'Крушево': [42.9000, 25.1500], 'Сенник': [43.0500, 25.1667],
  'Градница': [42.9500, 25.0167], 'Ряховците': [42.9833, 25.1000], 'Душево': [43.0333, 25.0833], 'Агатово': [43.1500, 25.0500],
  'Бяла река': [43.1000, 25.1000], 'Плевен': [43.4170, 24.6067], 'София': [42.6977, 23.3219], 'Русе': [43.8356, 25.9657],
  'Казанлък': [42.6194, 25.3931], 'Стара Загора': [42.4258, 25.6345], 'Варна': [43.2141, 27.9147], 'Бургас': [42.5048, 27.4626],
  'Пловдив': [42.1354, 24.7453], 'Габровска област': [42.95, 25.25], 'Ловешка област': [43.05, 24.60], 'Великотърновска област': [43.15, 25.65],
};

const REGION_FALLBACK = {
  'Габровска област': 'Габрово', 'Ловешка област': 'Ловеч', 'Великотърновска област': 'Велико Търново', 'Софийска област': 'София',
  'Плевенска област': 'Плевен', 'Русенска област': 'Русе', 'Старозагорска област': 'Стара Загора', 'Варненска област': 'Варна',
  'Бургаска област': 'Бургас', 'Пловдивска област': 'Пловдив',
};

export function lookupPlace(place, region) {
  const town = townOf(place);
  if (town && PLACES[town]) return { lat: PLACES[town][0], lng: PLACES[town][1], approx: true, source: 'gazetteer' };
  return null;
}

export function regionCoords(region) {
  const t = REGION_FALLBACK[region];
  return t && PLACES[t] ? { lat: PLACES[t][0], lng: PLACES[t][1], approx: true, source: 'region' } : null;
}

/* ───────── Nominatim (only called from the cron, ≤1 req/s per their usage policy) ───────── */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const GEO_UA = 'niimoti.com listings map (contact: via site form)';

export async function geocodePlace(place, region, fetchImpl = fetch) {
  const town = townOf(place);
  if (!town) return null;
  const q = `${town}, ${String(region || '').replace(/\s*област$/i, '')}, България`;
  const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=bg`;
  const res = await fetchImpl(url, { headers: { 'user-agent': GEO_UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = await res.json();
  const hit = Array.isArray(arr) && arr[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: +lat.toFixed(5), lng: +lng.toFixed(5), approx: true, source: 'nominatim' };
}

/**
 * Attach `coords` to every listing (mutates items).
 * `cache`  : { get(key) → coords|null, put(key, coords) }  (KV / Cache API wrapper, optional)
 * `network`: allow Nominatim calls for unknown places (cron only).
 */
export async function attachCoords(items, { cache = null, network = false, fetchImpl = fetch, sleepMs = 1100, log = () => {} } = {}) {
  const unknown = new Map(); // place key → [items]
  for (const l of items) {
    if (l.coords && l.coords.lat && l.coords.lng) continue;
    const hit = lookupPlace(l.place, l.region);
    if (hit) { l.coords = hit; continue; }
    const key = `${townOf(l.place)}|${l.region || ''}`;
    if (!unknown.has(key)) unknown.set(key, []);
    unknown.get(key).push(l);
  }

  for (const [key, group] of unknown) {
    let hit = cache ? await cache.get(`geo:v1:${key}`).catch(() => null) : null;
    if (!hit && network) {
      try {
        hit = await geocodePlace(group[0].place, group[0].region, fetchImpl);
        if (hit && cache) await cache.put(`geo:v1:${key}`, hit).catch(() => {});
        log(`geocoded ${key} → ${hit ? `${hit.lat},${hit.lng}` : 'no result'}`);
      } catch (err) {
        log(`geocode failed for ${key}: ${err.message}`);
      }
      if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
    }
    const coords = hit || regionCoords(group[0].region);
    if (coords) for (const l of group) l.coords = coords;
  }
  spreadApproximate(items);
  return items;
}

/** Offset approximate markers that share a town so they don't stack (deterministic ring, ~300–900 m). */
export function spreadApproximate(items) {
  const groups = new Map();
  for (const l of items) {
    if (!l.coords || !l.coords.approx) continue;
    const k = `${l.coords.lat},${l.coords.lng}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.forEach((l, i) => {
      const ring = Math.floor(i / 8) + 1;
      const angle = (i % 8) * (Math.PI / 4) + ring * 0.4;
      const r = 0.004 * ring; // ≈ 450 m per ring
      l.coords = { ...l.coords, lat: +(l.coords.lat + r * Math.sin(angle)).toFixed(5), lng: +(l.coords.lng + (r * Math.cos(angle)) / Math.cos((l.coords.lat * Math.PI) / 180)).toFixed(5), base: [group[0].coords.lat, group[0].coords.lng] };
    });
  }
  return items;
}

/** Compact points for the map page. */
export function toMapPoints(items) {
  return items
    .filter((l) => l.coords && Number.isFinite(l.coords.lat) && Number.isFinite(l.coords.lng))
    .map((l) => ({
      id: l.id, lat: l.coords.lat, lng: l.coords.lng, approx: Boolean(l.coords.approx),
      title: l.title, type: l.type, place: l.place, region: l.region, price: l.price, rent: l.rent, discount: l.discount,
      img: l.images?.[0] || null, slug: l.slug, area: l.area, plotArea: l.plotArea, bedrooms: l.bedrooms,
    }));
}
