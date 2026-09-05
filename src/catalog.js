/**
 * Filtering, sorting and grouping of listings (pure functions, shared by pages, the API and AI fallback).
 */
import { CATEGORIES, transliterate } from './render/i18n.js';

export const PAGE_SIZE = 24;

const norm = (s) => transliterate(String(s || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Distinct property types in the order they first appear. */
export function distinctTypes(items) {
  const seen = new Map();
  for (const l of items) if (l.type && !seen.has(l.type)) seen.set(l.type, (seen.get(l.type) || 0) + 1);
  return [...seen.keys()];
}

/** "близо до гр. Севлиево" → "Севлиево"; "гр. Габрово / кв. Център" → "Габрово"; "с. Орешене" → "Орешене" */
export function townOf(place) {
  return String(place || '')
    .replace(/^близо до\s*/i, '')
    .replace(/^(гр|с|к\.к)\.\s*/i, '')
    .split(/\s*\/\s*/)[0]
    .trim();
}

/** Towns + regions with counts, most frequent first. */
export function regionChips(items) {
  const counts = new Map();
  for (const l of items) {
    const town = townOf(l.place);
    if (town) counts.set(town, (counts.get(town) || 0) + 1);
  }
  const chips = [...counts.entries()].map(([label, count]) => ({ key: label, label, count }));
  chips.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'bg'));
  return chips;
}

export function parseFilters(searchParams) {
  const g = (k) => (searchParams.get(k) || '').trim();
  const budget = g('budget');
  let min = toNum(g('min'));
  let max = toNum(g('max'));
  if (budget) {
    const [a, b] = budget.split('-');
    if (a) min = min ?? toNum(a);
    if (b) max = max ?? toNum(b);
  }
  return {
    q: g('q').slice(0, 200),
    loc: g('loc').slice(0, 120),
    type: g('type').slice(0, 80),
    cat: g('cat').slice(0, 40),
    deal: ['sale', 'rent'].includes(g('deal')) ? g('deal') : '',
    min,
    max,
    sort: ['top', 'price_asc', 'price_desc', 'area_asc', 'area_desc'].includes(g('sort')) ? g('sort') : 'top',
    page: Math.max(1, parseInt(g('page'), 10) || 1),
    budget,
  };
}

function toNum(s) {
  if (!s) return null;
  const n = parseInt(String(s).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function applyFilters(items, f) {
  let out = items.slice();
  if (f.cat) {
    const cat = CATEGORIES.find((c) => c.key === f.cat);
    if (cat) out = out.filter(cat.test);
  }
  if (f.type) out = out.filter((l) => l.type === f.type);
  if (f.deal === 'rent') out = out.filter((l) => l.rent);
  if (f.deal === 'sale') out = out.filter((l) => !l.rent);
  if (f.loc) {
    const n = norm(f.loc);
    out = out.filter((l) => norm(`${l.place} ${l.region} ${l.title}`).includes(n));
  }
  if (f.min != null) out = out.filter((l) => l.price != null && l.price >= f.min);
  if (f.max != null) out = out.filter((l) => l.price != null && l.price <= f.max);
  if (f.q) {
    const words = norm(f.q).split(' ').filter((w) => w.length > 1);
    out = out.filter((l) => {
      const hay = norm(`${l.title} ${l.type} ${l.place} ${l.region} ${l.ref}`);
      return words.every((w) => hay.includes(w));
    });
  }
  return sortItems(out, f.sort);
}

export function sortItems(items, sort) {
  const by = (fn, dir = 1) => (a, b) => {
    const x = fn(a), y = fn(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir;
  };
  const out = items.slice();
  switch (sort) {
    case 'price_asc': return out.sort(by((l) => l.price, 1));
    case 'price_desc': return out.sort(by((l) => l.price, -1));
    case 'area_asc': return out.sort(by((l) => l.area ?? l.plotArea, 1));
    case 'area_desc': return out.sort(by((l) => l.area ?? l.plotArea, -1));
    default: return out.sort(by((l) => l.order ?? 0, 1));
  }
}

export function paginate(items, page, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { page: p, pages, total: items.length, items: items.slice((p - 1) * size, p * size) };
}

/** Similar listings: same type first, then same town/region, excluding self. */
export function similarTo(items, l, n = 3) {
  const town = townOf(l.place);
  const score = (o) => (o.type === l.type ? 2 : 0) + (townOf(o.place) === town ? 2 : 0) + (o.region === l.region ? 1 : 0) + (o.rent === l.rent ? 1 : 0);
  return items
    .filter((o) => o.id !== l.id)
    .map((o) => [score(o), o])
    .sort((a, b) => b[0] - a[0] || (a[1].order ?? 0) - (b[1].order ?? 0))
    .slice(0, n)
    .map(([, o]) => o);
}

/**
 * Keyword fallback for the AI search: pulls a max price ("до 50 000", "under 50k"),
 * a town and a category out of free text.
 */
export function heuristicSearch(items, query) {
  const q = ` ${norm(query)} `;
  const has = (...words) => words.some((w) => new RegExp(`\\b${w}`).test(q));
  const f = { q: '', loc: '', type: '', cat: '', deal: '', min: null, max: null, sort: 'top', page: 1 };

  const priceM = q.match(/\b(?:do|pod|under|below|up to|max|maks|okolo|around|about)\s*(\d(?:[\d\s]*\d)?)\s*(k\b|hil|hilyadi|thousand)?/);
  if (priceM) {
    let v = parseInt(priceM[1].replace(/\s/g, ''), 10);
    if (priceM[2]) v *= 1000;
    else if (v < 1000) v *= 1000;
    if (Number.isFinite(v) && v > 0) f.max = v;
  }
  if (has('naem', 'rent', 'renting', 'lease')) f.deal = 'rent';
  else if (has('kupya', 'pokupka', 'buy', 'purchase', 'prodazhba', 'sale')) f.deal = 'sale';

  if (has('sklad', 'magazin', 'ofis', 'biznes', 'business', 'warehouse', 'shop', 'office', 'hotel', 'restorant', 'restaurant', 'tseh', 'commercial')) f.cat = 'business';
  else if (has('apartament', 'apartment', 'flat', 'studio')) f.cat = 'apartments';
  else if (has('zemedel', 'agricultur', 'farmland', 'niva', 'gora', 'forest', 'loze', 'vineyard')) f.cat = 'land';
  else if (has('partsel', 'plot', 'upi', 'zemya', 'land', 'teren')) f.cat = 'plots';
  else if (has('kasht', 'kushta', 'kushti', 'house', 'houses', 'home', 'vila', 'villa', 'bungal', 'cottage', 'imot s dvor')) f.cat = 'houses';
  if (has('namalen', 'reduced', 'discount', 'promo', 'evtin', 'cheap', 'bargain')) f.cat = f.cat || 'reduced';

  for (const l of items) {
    const town = norm(townOf(l.place));
    if (town && q.includes(` ${town} `)) { f.loc = townOf(l.place); break; }
  }
  if (!f.loc) {
    for (const l of items) {
      const region = norm(String(l.region || '').replace(/\s*област$/i, ''));
      if (region && q.includes(region)) { f.loc = l.region; break; }
    }
  }

  let res = applyFilters(items, f);
  if (!res.length && f.max) { f.max = null; res = applyFilters(items, f); }
  if (!res.length && f.loc) { f.loc = ''; res = applyFilters(items, f); }
  if (!res.length && f.cat) { f.cat = ''; res = applyFilters(items, f); }
  return { items: res.slice(0, 6), filters: f };
}

/** Compact one-line summary per listing for AI prompts. */
export function summarize(l) {
  const parts = [`#${l.id}`, l.type, l.title, l.place, l.region];
  if (l.area != null) parts.push(`площ ${l.area} м²`);
  if (l.plotArea != null) parts.push(`двор ${l.plotArea} м²`);
  if (l.bedrooms != null) parts.push(`${l.bedrooms} спални`);
  if (l.floors != null) parts.push(`${l.floors} ет.`);
  parts.push(l.rent ? `наем ${l.price} €/мес` : `цена ${l.price} €`);
  if (l.discount) parts.push(`намалена -${l.discount}%`);
  if (l.akt16) parts.push('акт 16');
  return parts.filter(Boolean).join(' | ');
}
