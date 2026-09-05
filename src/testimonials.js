/**
 * Customer testimonials for Nikola from the agency's feedback page:
 *   https://www.luximmo.com/customers/feedback/index.html?seller=467
 *
 * The parser is deliberately structure-agnostic: it looks for repeated blocks that contain a
 * person's name, an optional date/rating and a paragraph of text, and also honours JSON-LD
 * Review objects when present. Everything degrades to the bundled seed (data/testimonials.json).
 */
import { clean, decodeEntities, decodeHtmlBytes, BROKER_ID } from './scraper.js';

export const FEEDBACK_URL = `https://www.luximmo.com/customers/feedback/index.html?seller=${BROKER_ID}`;

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'accept-language': 'bg-BG,bg;q=0.9,en;q=0.7',
};

const DATE_RE = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/;
const MONTHS = { януари: 1, февруари: 2, март: 3, април: 4, май: 5, юни: 6, юли: 7, август: 8, септември: 9, октомври: 10, ноември: 11, декември: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

export function parseDate(text) {
  if (!text) return null;
  const m = String(text).match(DATE_RE);
  if (m) {
    const [d, mo, y] = m[1] ? [m[1], m[2], m[3]] : [m[6], m[5], m[4]];
    const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  const w = String(text).toLowerCase().match(/(\d{1,2})?\s*([а-яa-z]+)\s+(\d{4})/);
  if (w && MONTHS[w[2]]) return `${w[3]}-${String(MONTHS[w[2]]).padStart(2, '0')}-${String(w[1] || 1).padStart(2, '0')}`;
  return null;
}

function stars(fragment) {
  const m = fragment.match(/(\d(?:[.,]\d)?)\s*(?:\/\s*5|звезд|stars?)/i) || fragment.match(/rating[^>]*?(\d(?:[.,]\d)?)/i);
  if (m) return Math.min(5, parseFloat(m[1].replace(',', '.')));
  const filled = (fragment.match(/fa-star(?![-\w])|star(?:_|-)?full|★/gi) || []).length;
  return filled >= 1 && filled <= 5 ? filled : null;
}

function textOf(fragment) {
  return clean(fragment.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n')).trim();
}

/** Split HTML into candidate blocks by repeated "review-ish" containers. */
function candidateBlocks(html) {
  const classRe = /<(div|li|article|section|blockquote|tr)\b[^>]*class="[^"]*(feedback|review|testimonial|otziv|comment|opinion|customer|mnenie|item|panel|card|callout)[^"]*"[^>]*>/gi;
  const starts = [...html.matchAll(classRe)];
  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : Math.min(html.length, start + 6000);
    blocks.push(html.slice(start, end));
  }
  if (blocks.length) return blocks;
  // Fallback: paragraphs preceded by a bold/strong name.
  return [...html.matchAll(/<(?:b|strong|h[2-5])[^>]*>[\s\S]{2,80}?<\/(?:b|strong|h[2-5])>[\s\S]{0,400}?<p[^>]*>[\s\S]{40,}?<\/p>/gi)].map((m) => m[0]);
}

function fromJsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1].trim());
      const arr = Array.isArray(v) ? v : [v];
      for (const o of arr) {
        const reviews = o?.['@type'] === 'Review' ? [o] : Array.isArray(o?.review) ? o.review : [];
        for (const r of reviews) {
          const text = clean(r.reviewBody || r.description || '');
          if (text.length < 20) continue;
          out.push({
            name: clean(r.author?.name || r.author || '') || null,
            date: parseDate(r.datePublished || '') || null,
            rating: r.reviewRating?.ratingValue ? Number(r.reviewRating.ratingValue) : null,
            text,
          });
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}

/**
 * Exact parser for the LUXIMMO feedback page:
 *   <div class="... comment-by ...">Name (dd.mm.yyyy)</div> … <div class="... comment-container ..."><p>text</p></div>
 */
export function parseLuximmoComments(html) {
  const out = [];
  const re = /<div[^>]*class="[^"]*\bcomment-by\b[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*\bcomment-container\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  for (const m of html.matchAll(re)) {
    const head = clean(m[1]);
    const text = textOf(m[2]).replace(/\s*\n\s*/g, ' ').trim();
    if (text.length < 10) continue;
    const dm = head.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    const name = clean(dm ? dm[1] : head) || null;
    const date = parseDate(dm ? dm[2] : head);
    const propM = m[0].match(/\b(VT|SOF|VAR|BUR|PL)\s?\d{3,6}\b/i);
    out.push({ name, date, rating: null, text, property: propM ? clean(propM[0]) : null });
  }
  return out;
}

export function parseTestimonials(html) {
  const exact = parseLuximmoComments(html);
  if (exact.length) return finalize(exact);
  const ld = fromJsonLd(html);
  const found = [];
  for (const block of candidateBlocks(html)) {
    const inner = block.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    // Longest paragraph-like text is the testimonial body.
    const paras = [...inner.matchAll(/<(p|div|blockquote|q|span|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map((m) => textOf(m[2]))
      .filter((s) => s.length >= 40 && !/cookie|бисквитк|©|all rights|всички права/i.test(s));
    const text = paras.sort((a, b) => b.length - a.length)[0];
    if (!text) continue;
    const nameM = inner.match(/<(?:b|strong|h[2-6]|cite|span[^>]*class="[^"]*(?:name|author|client|customer)[^"]*")[^>]*>([\s\S]{2,80}?)<\//i);
    let name = nameM ? clean(nameM[1]) : null;
    if (name && (name.length > 60 || text.startsWith(name))) name = null;
    const date = parseDate(textOf(inner).replace(text, ''));
    const rating = stars(inner);
    const propM = inner.match(/\b(VT|SOF|VAR|BUR|PL)\s?\d{3,6}\b/i) || inner.match(/imot-(\d+)/i);
    found.push({ name, date, rating, text, property: propM ? clean(propM[0]) : null });
  }
  return finalize([...ld, ...found]);
}

/** De-duplicate by text prefix, trim, tag language. */
function finalize(all) {
  const seen = new Set();
  const items = [];
  for (const t of all) {
    const key = t.text.slice(0, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ ...t, text: t.text.slice(0, 1500), lang: /[а-я]/i.test(t.text) ? 'bg' : 'en' });
  }
  return items;
}

/** Follow pagination links that keep the seller parameter (page=N / p=N / &start=N). */
export function paginationLinks(html, baseUrl) {
  const urls = new Set();
  for (const m of html.matchAll(/href="([^"]*seller=467[^"]*)"/gi)) {
    const u = decodeEntities(m[1]);
    if (/(?:[?&](?:page|p|pg|start|offset)=\d+)/i.test(u)) {
      try { urls.add(new URL(u, baseUrl).toString()); } catch { /* ignore */ }
    }
  }
  return [...urls].filter((u) => u !== baseUrl).slice(0, 10);
}

export async function fetchTestimonials(fetchImpl = fetch, { log = () => {} } = {}) {
  const get = async (url) => {
    const res = await fetchImpl(url, { headers: HEADERS, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    if (typeof res.arrayBuffer !== 'function') return await res.text();
    return decodeHtmlBytes(new Uint8Array(await res.arrayBuffer()), res.headers?.get?.('content-type') || '');
  };
  const first = await get(FEEDBACK_URL);
  let items = parseTestimonials(first);
  log(`feedback page 1: ${items.length} testimonials`);
  for (const url of paginationLinks(first, FEEDBACK_URL)) {
    try {
      const more = parseTestimonials(await get(url));
      log(`feedback ${url}: ${more.length}`);
      items = items.concat(more);
    } catch (err) {
      log(`feedback page failed: ${err.message}`);
    }
  }
  const seen = new Set();
  items = items.filter((t) => { const k = t.text.slice(0, 80).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  if (!items.length) throw new Error('No testimonials found — page layout unknown or request blocked');
  return { items, fetchedAt: new Date().toISOString(), source: FEEDBACK_URL };
}
