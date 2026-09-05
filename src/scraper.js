/**
 * Scraper for Nikola Ivanov's offers on suprimmo.bg.
 *
 * Source: https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/  (paginated, 24 cards per page,
 *         next pages at /oferti-na-brokera-nikola-ivanov/page/N/).
 *
 * Everything here is plain string/regex work so it runs identically in the Cloudflare Worker
 * and in Node (see test/scraper.test.js, which uses a fixture cut from the real page).
 */

export const SOURCE_BASE = 'https://www.suprimmo.bg';
export const BROKER_PATH = '/oferti-na-brokera-nikola-ivanov/';
export const IMAGE_BASE = 'https://static4.superimoti.bg/property-images';
export const AGENT_PHOTO_URL = 'https://www.luximmo.bg/sales-agents-images/big/467_1.jpg';
export const BROKER_ID = 467;

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'bg-BG,bg;q=0.9,en;q=0.7',
  'cache-control': 'no-cache',
};

/* ───────────────────────────── text helpers ───────────────────────────── */

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  ndash: '–', mdash: '—', hellip: '…', euro: '€', deg: '°', sup2: '²', bdquo: '„', ldquo: '“', rdquo: '”',
};

export function decodeEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => (n.toLowerCase() in NAMED_ENTITIES ? NAMED_ENTITIES[n.toLowerCase()] : m));
}

/** Strip tags, decode entities, normalise whitespace (nbsp → space). */
export function clean(str) {
  if (!str) return '';
  return decodeEntities(String(str).replace(/<[^>]*>/g, ' '))
    .replace(/[ \s]+/g, ' ')
    .trim();
}

export function toInt(str) {
  if (str == null) return null;
  const digits = String(str).replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export function toFloat(str) {
  if (str == null) return null;
  const m = String(str).replace(/\s/g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function uniq(arr) {
  return [...new Set(arr)];
}

/* ───────────────────────────── listing pages ───────────────────────────── */

export function pageUrl(page) {
  const p = Number(page) || 1;
  return p <= 1 ? `${SOURCE_BASE}${BROKER_PATH}` : `${SOURCE_BASE}${BROKER_PATH}page/${p}/`;
}

/** "201 намерени оферти / Страницa 1 от 9" → { total, page, pages } */
export function parsePageMeta(html) {
  const total = toInt((html.match(/(\d[\d\s]*)\s+намерени\s+оферт/i) || [])[1]);
  // The site writes "Страницa" with a Latin "a", so match loosely.
  const pm = html.match(/Страниц\S*\s+(\d+)\s+от\s+(\d+)/i);
  let page = pm ? parseInt(pm[1], 10) : 1;
  let pages = pm ? parseInt(pm[2], 10) : null;
  if (!pages) {
    let max = 1;
    for (const m of html.matchAll(/oferti-na-brokera-nikola-ivanov\/page\/(\d+)\//g)) {
      max = Math.max(max, parseInt(m[1], 10));
    }
    pages = max;
  }
  return { total: total ?? null, page, pages };
}

const CARD_SPLIT = /<div class="panel rel shadow offer" data-prop-id="(\d+)"/g;

/** Parse one search-results page into { items, total, page, pages }. */
export function parseListingPage(html) {
  const meta = parsePageMeta(html);
  const starts = [...html.matchAll(CARD_SPLIT)];
  const items = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : findCardsEnd(html, start);
    const block = html.slice(start, end);
    const item = parseCard(block, parseInt(starts[i][1], 10));
    if (item) items.push(item);
  }
  return { items, ...meta };
}

function findCardsEnd(html, from) {
  const candidates = [
    html.indexOf('<ul class="pagination', from),
    html.indexOf('<script type="application/ld+json">', from),
    html.indexOf('</section>', from),
  ].filter((i) => i > from);
  return candidates.length ? Math.min(...candidates) : html.length;
}

function labelToField(label) {
  const l = label.toLowerCase();
  if (l.includes('спал')) return 'bedrooms';
  if (l.includes('етаж')) return 'floors';
  if (l.includes('бан')) return 'bathrooms';
  if (l.includes('парцел')) return 'plotArea';
  if (l.includes('сград')) return 'area';
  if (l.includes('площ')) return 'area';
  return null;
}

export function parseCard(block, idFromAttr) {
  const id = idFromAttr ?? toInt((block.match(/data-prop-id="(\d+)"/) || [])[1]);
  if (!id) return null;

  const urlM = block.match(/data-url="([^"]+)"/) || block.match(/href="(https:\/\/www\.suprimmo\.bg\/imot-\d+-[^"]+)"/);
  const url = urlM ? decodeEntities(urlM[1]) : `${SOURCE_BASE}/imot-${id}/`;
  const slug = (url.match(/imot-\d+-([^/?#]+)/) || [])[1] || '';

  const images = uniq(
    [...block.matchAll(/property-images\/(?:medium|big|small)\/([\w.-]+?\.jpe?g)/gi)].map((m) => m[1]),
  );

  const titleM = block.match(/<a class="lnk" title="([^"]*)"/) || block.match(/alt="([^"]*?)\s*\d*"\s+title=/);
  let title = clean(titleM ? titleM[1] : '');
  title = title.replace(/\s*-\s*SUPRIMMO\s*$/i, '').trim();

  const type = clean((block.match(/<div class="ttl">([\s\S]*?)<\/div>/) || [])[1]);

  let place = '';
  let region = '';
  const locM = block.match(/<div class="loc">([\s\S]*?)(?:<a\b|<\/div>)/);
  if (locM) {
    const parts = locM[1].split(/<br\s*\/?>/i);
    place = clean(parts[0]).replace(/\s*\/\s*/g, ' / ');
    const rest = clean(parts.slice(1).join(' '));
    region = rest.split(',')[0].trim();
  }

  const stats = { area: null, plotArea: null, bedrooms: null, floors: null, bathrooms: null };
  const lst = (block.match(/<div class="lst">([\s\S]*?)<\/div>/) || [])[1] || '';
  for (const m of lst.matchAll(/<b>([\s\S]*?)<\/b>\s*<i>([\s\S]*?)<\/i>/g)) {
    const field = labelToField(clean(m[1]));
    if (field && stats[field] == null) stats[field] = toInt(m[2]);
  }

  const priceM = block.match(/(Наем)?(?:&nbsp;| )([\d\s ]+?)\s*<span class="curr_conv">(?:€|&euro;|&#8364;)<\/span>(\/месец)?/);
  const price = priceM ? toInt(priceM[2]) : null;
  const rent = Boolean(priceM && (priceM[1] || priceM[3])) || /badge light[^>]*>\s*под наем/i.test(block);
  const oldPrice = toInt((block.match(/<s class="color-alert[^"]*">\s*([\d\s ]+?)\s*<span class="curr_conv">/) || [])[1]);
  const discount = toInt((block.match(/<span class="font-small">\s*-(\d+)%/) || [])[1]);
  const pricePerSqm = toFloat((block.match(/([\d.,]+)\s*(?:€|&euro;|&#8364;)\/м(?:²|&sup2;|&#178;)/) || [])[1]);

  const akt16 = /badge act\b[\s\S]{0,80}?акт\s*16/i.test(block);
  const reduced = /badge alert/.test(block) || discount != null || oldPrice != null;

  const refM = block.match(/ref_no=([^"&]+)/);
  const ref = refM ? clean(decodeURIComponent(refM[1].replace(/\+/g, ' '))) : `VT ${id}`;

  return {
    id,
    ref,
    url,
    slug,
    title,
    type,
    place,
    region,
    area: stats.area,
    plotArea: stats.plotArea,
    bedrooms: stats.bedrooms,
    floors: stats.floors,
    price,
    oldPrice,
    discount,
    pricePerSqm,
    rent,
    akt16,
    reduced,
    images,
  };
}

/* ───────────────────────────── detail pages ───────────────────────────── */

const FEATURE_LABELS = [
  'спални', 'спалня', 'бани', 'баня', 'етаж', 'етажност', 'година', 'строеж', 'отопление', 'състояние',
  'обзавеждане', 'строителство', 'изложение', 'паркинг', 'гараж', 'двор', 'площ', 'гледка', 'вода', 'ток',
  'канализация', 'достъп', 'разстояние', 'акт', 'тип', 'стаи', 'тераса', 'покрив', 'дограма', 'категория',
];

function parseJsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1].trim());
      if (Array.isArray(v)) out.push(...v);
      else out.push(v);
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out;
}

function metaContent(html, attr, name) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${name}["']`, 'i');
  const m = html.match(re) || html.match(re2);
  return m ? decodeEntities(m[1]).trim() : '';
}

function paragraphsFromHtml(fragment) {
  const withBreaks = fragment
    .replace(/<\/(p|div|li|h\d)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');
  return clean(withBreaks.replace(/\n/g, ' ¶ '))
    .split('¶')
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/**
 * Best-effort parse of a property detail page. Everything is optional — the site
 * falls back to the card data when a field cannot be found.
 */
export function parseDetail(html, id) {
  const idPat = id ? String(id) : '\\d+';
  const imgRe = new RegExp(`property-images\\/(?:big|medium|small|large|orig)\\/(\\d+T${idPat}_(\\d+))\\.(jpe?g|png|webp)`, 'gi');
  const found = new Map();
  for (const m of html.matchAll(imgRe)) {
    const name = `${m[1]}.${m[3].toLowerCase()}`;
    const n = parseInt(m[2], 10);
    if (!found.has(name)) found.set(name, n);
  }
  const images = [...found.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);

  const ld = parseJsonLd(html);
  const ldTypes = ['product', 'realestatelisting', 'offer', 'house', 'residence', 'singlefamilyresidence', 'place', 'accommodation', 'apartment', 'landform'];
  let ldDescription = '';
  for (const obj of ld) {
    const t = String(obj && obj['@type'] || '').toLowerCase();
    if (obj && typeof obj.description === 'string' && (ldTypes.includes(t) || !t)) {
      if (obj.description.length > ldDescription.length) ldDescription = decodeEntities(obj.description);
    }
  }

  let paragraphs = [];
  const headM = html.match(/<h[1-4][^>]*>\s*(?:Описание|Описание на имота|Подробно описание)[^<]*<\/h[1-4]>([\s\S]*?)(?=<h[1-4]\b|<section\b|<footer\b|$)/i);
  if (headM) paragraphs = paragraphsFromHtml(headM[1]);
  if (paragraphs.join(' ').length < 80) {
    const idM = html.match(/<div[^>]+(?:id|class)="[^"]*(?:description|descr|prop-desc|prop_text|imot-text)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    if (idM) {
      const alt = paragraphsFromHtml(idM[1]);
      if (alt.join(' ').length > paragraphs.join(' ').length) paragraphs = alt;
    }
  }
  const metaDesc = metaContent(html, 'property', 'og:description') || metaContent(html, 'name', 'description');
  if (paragraphs.join(' ').length < 80) {
    const best = ldDescription.length > metaDesc.length ? ldDescription : metaDesc;
    paragraphs = best ? best.split(/\n{2,}|\r?\n/).map((s) => clean(s)).filter(Boolean) : [];
  }
  // Drop boilerplate the agency appends to meta descriptions.
  paragraphs = paragraphs.filter((p) => !/SUPRIMMO\s*[➤►]|посетете сайта|☎/i.test(p));

  const features = [];
  const seen = new Set();
  for (const m of html.matchAll(/<(b|strong|dt|th|span)\b[^>]*>\s*([^<:]{2,40}?)\s*:?\s*<\/\1>\s*(?:<[^>]+>\s*)*([^<]{1,90})/gi)) {
    const label = clean(m[2]);
    const value = clean(m[3]).replace(/^[:\-–]\s*/, '');
    const l = label.toLowerCase();
    if (!value || value.length > 80 || !FEATURE_LABELS.some((k) => l.includes(k))) continue;
    if (/^(www\.|http)/i.test(value)) continue;
    const key = l.replace(/[^a-zа-я0-9]/gi, '');
    if (seen.has(key)) continue;
    seen.add(key);
    features.push({ label: label.replace(/:$/, ''), value });
    if (features.length >= 16) break;
  }

  const lat = toFloat((html.match(/(?:"lat(?:itude)?"|lat(?:itude)?\s*[:=])\s*["']?(4[0-4]\.\d{3,})/i) || [])[1]);
  const lng = toFloat((html.match(/(?:"l(?:o)?ng(?:itude)?"|l(?:o)?ng(?:itude)?\s*[:=])\s*["']?(2[2-8]\.\d{3,})/i) || [])[1]);
  const youtube = (html.match(/youtube\.com\/(?:watch\?v=|embed\/)([\w-]{11})/) || html.match(/youtu\.be\/([\w-]{11})/) || [])[1] || null;

  const title = clean(metaContent(html, 'property', 'og:title') || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
    .replace(/\s*[-—|].*SUPRIMMO.*$/i, '')
    .trim();

  return {
    title: title || null,
    images,
    paragraphs,
    features,
    coords: lat && lng ? { lat, lng } : null,
    youtube,
  };
}

/* ───────────────────────────── fetching ───────────────────────────── */

async function fetchHtml(url, fetchImpl = fetch) {
  const res = await fetchImpl(url, { headers: BROWSER_HEADERS, redirect: 'follow', cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  if (typeof res.arrayBuffer !== 'function') return await res.text(); // test doubles
  return decodeHtmlBytes(new Uint8Array(await res.arrayBuffer()), res.headers?.get?.('content-type') || '');
}

/* ───────────────────────────── charset handling ─────────────────────────────
 * suprimmo.bg serves its HTML as windows-1251 (Cyrillic). Decoding it as UTF-8 turns every
 * Bulgarian character into U+FFFD, so we honour the declared charset. The 1251 table is
 * inlined so this works even where TextDecoder lacks legacy encodings.
 */

const CP1251_HIGH =
  'ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—™љ›њќћџ ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї°±Ііґµ¶·ё№є»јЅѕї' +
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя';

export function decodeCp1251(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += b < 0x80 ? String.fromCharCode(b) : CP1251_HIGH[b - 0x80];
  }
  return out;
}

function sniffCharset(bytes, contentType) {
  const fromHeader = (String(contentType).match(/charset=["']?([\w-]+)/i) || [])[1];
  if (fromHeader) return fromHeader.toLowerCase();
  let head = '';
  const n = Math.min(bytes.length, 6144);
  for (let i = 0; i < n; i++) head += String.fromCharCode(bytes[i]);
  const fromMeta = (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  return fromMeta ? fromMeta.toLowerCase() : '';
}

export function decodeHtmlBytes(bytes, contentType = '') {
  const charset = sniffCharset(bytes, contentType);
  if (/1251|cyrillic/.test(charset)) return decodeCp1251(bytes);
  let text;
  try {
    text = new TextDecoder(charset || 'utf-8', { fatal: false }).decode(bytes);
  } catch {
    text = new TextDecoder('utf-8').decode(bytes);
  }
  // Declared/assumed UTF-8 but the decode is full of replacement characters → almost certainly 1251.
  if ((text.match(/\uFFFD/g) || []).length > 20) return decodeCp1251(bytes);
  return text;
}

/**
 * Fetch every page of the broker's offers. Throws if the first page yields no cards,
 * so callers keep their previous cache instead of overwriting it with nothing.
 */
export async function fetchAllListings({ fetchImpl = fetch, maxPages = 40, concurrency = 3, log = () => {} } = {}) {
  const first = parseListingPage(await fetchHtml(pageUrl(1), fetchImpl));
  if (!first.items.length) throw new Error('No property cards found on page 1 — page layout changed or request was blocked');
  log(`page 1/${first.pages}: ${first.items.length} cards, total ${first.total}`);

  const pages = Math.min(first.pages || 1, maxPages);
  const byId = new Map(first.items.map((it) => [it.id, it]));
  const queue = [];
  for (let p = 2; p <= pages; p++) queue.push(p);

  const failures = [];
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      try {
        const res = parseListingPage(await fetchHtml(pageUrl(p), fetchImpl));
        log(`page ${p}/${pages}: ${res.items.length} cards`);
        for (const it of res.items) if (!byId.has(it.id)) byId.set(it.id, it);
      } catch (err) {
        failures.push(p);
        log(`page ${p} failed: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, worker));

  const items = [...byId.values()].map((it, i) => ({ ...it, order: i }));
  return {
    items,
    total: first.total ?? items.length,
    pages,
    failedPages: failures,
    fetchedAt: new Date().toISOString(),
    source: pageUrl(1),
  };
}

export async function fetchDetail(listing, fetchImpl = fetch) {
  const html = await fetchHtml(listing.url, fetchImpl);
  const detail = parseDetail(html, listing.id);
  if (!detail.coords) {
    // The listing cards link to a small map popup per property; it usually carries the exact pin.
    try {
      const mapHtml = await fetchHtml(`${SOURCE_BASE}/get_prop_map_ajax_v7.php?IID=${listing.id}`, fetchImpl);
      detail.coords = parseCoords(mapHtml);
    } catch {
      /* optional */
    }
  }
  if (detail.coords) detail.coords = { ...detail.coords, approx: false, source: 'detail' };
  return { ...detail, fetchedAt: new Date().toISOString() };
}

/** Find a Bulgarian lat/lng pair in arbitrary markup/script (Google/Leaflet/OSM embeds, JSON, query strings). */
export function parseCoords(text) {
  if (!text) return null;
  const s = String(text);
  const patterns = [
    /(?:"lat(?:itude)?"|\blat(?:itude)?)\s*[:=]\s*["']?(4[1-4]\.\d{3,})[\s\S]{0,80}?(?:"l(?:o)?ng(?:itude)?"|\bl(?:o)?ng(?:itude)?)\s*[:=]\s*["']?(2[2-8]\.\d{3,})/i,
    /LatLng\(\s*(4[1-4]\.\d{3,})\s*,\s*(2[2-8]\.\d{3,})/i,
    /[?&](?:q|ll|center|query)=(4[1-4]\.\d{3,})\s*,\s*(2[2-8]\.\d{3,})/i,
    /\[\s*(4[1-4]\.\d{3,})\s*,\s*(2[2-8]\.\d{3,})\s*\]/,
    /(4[1-4]\.\d{4,})\s*,\s*(2[2-8]\.\d{4,})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}
