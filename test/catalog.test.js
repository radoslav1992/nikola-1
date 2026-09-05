import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { applyFilters, parseFilters, paginate, heuristicSearch, regionChips, townOf, similarTo, distinctTypes } from '../src/catalog.js';
import { typeLabel, placeLabel, regionLabel, fmtPrice, fmtNumber, transliterate, slugify } from '../src/render/i18n.js';

const seed = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url), 'utf8'));
const items = seed.items;

test('seed has 24 listings with images and prices', () => {
  assert.equal(items.length, 24);
  assert.ok(items.every((l) => l.images.length >= 3 && l.price > 0 && l.title && l.type));
});

test('townOf strips prefixes', () => {
  assert.equal(townOf('близо до гр. Севлиево'), 'Севлиево');
  assert.equal(townOf('гр. Габрово / кв. Център'), 'Габрово');
  assert.equal(townOf('с. Орешене'), 'Орешене');
});

test('region chips are sorted by frequency', () => {
  const chips = regionChips(items);
  assert.equal(chips[0].label, 'Севлиево');
  assert.ok(chips[0].count >= chips[1].count);
});

test('filters: category, deal, budget, location, sort', () => {
  const f = parseFilters(new URLSearchParams('cat=houses&budget=0-30000&sort=price_asc'));
  const res = applyFilters(items, f);
  assert.ok(res.length > 0);
  assert.ok(res.every((l) => /къщ|бунгал/i.test(l.type) && l.price <= 30000 && !l.rent));
  for (let i = 1; i < res.length; i++) assert.ok(res[i - 1].price <= res[i].price);

  const rent = applyFilters(items, parseFilters(new URLSearchParams('deal=rent')));
  assert.deepEqual(rent.map((l) => l.id), [91005]);

  const loc = applyFilters(items, parseFilters(new URLSearchParams('loc=sevlievo')));
  assert.ok(loc.length >= 8 && loc.every((l) => /Севлиево/.test(l.place + l.title)));

  const q = applyFilters(items, parseFilters(new URLSearchParams('q=Априлци къща')));
  assert.ok(q.length >= 3 && q.every((l) => /Априлци/.test(l.title + l.place)));
});

test('pagination clamps and slices', () => {
  const p = paginate(items, 99, 10);
  assert.equal(p.pages, 3);
  assert.equal(p.page, 3);
  assert.equal(p.items.length, 4);
});

test('heuristic search understands price, town, type and rent in BG and EN', () => {
  let r = heuristicSearch(items, 'къща до 30 000 евро близо до Севлиево');
  assert.equal(r.filters.max, 30000);
  assert.equal(r.filters.cat, 'houses');
  assert.equal(r.filters.loc, 'Севлиево');
  assert.ok(r.items.length > 0 && r.items.every((l) => l.price <= 30000));

  r = heuristicSearch(items, 'warehouse for rent');
  assert.equal(r.filters.deal, 'rent');
  assert.equal(r.filters.cat, 'business');
  assert.deepEqual(r.items.map((l) => l.id), [91005]);

  r = heuristicSearch(items, 'plot of land under 25k near Gabrovo');
  assert.equal(r.filters.cat, 'plots');
  assert.equal(r.filters.max, 25000);
  assert.equal(r.filters.loc, 'Габрово');

  r = heuristicSearch(items, 'нещо евтино');
  assert.equal(r.filters.cat, 'reduced');
  assert.ok(r.items.length > 0);
});

test('similar listings prefer same type and town', () => {
  const house = items.find((l) => l.id === 89460);
  const sim = similarTo(items, house, 3);
  assert.equal(sim.length, 3);
  assert.ok(!sim.some((l) => l.id === house.id));
  assert.ok(sim.every((l) => l.type === 'Къща'));
});

test('i18n helpers', () => {
  assert.equal(typeLabel('Парцел в регулация', 'en'), 'Regulated plot');
  assert.equal(typeLabel('Къща', 'bg'), 'Къща');
  assert.equal(placeLabel('близо до гр. Севлиево', 'en'), 'near Sevlievo');
  assert.equal(placeLabel('гр. Габрово / кв. Център', 'en'), 'Gabrovo, Tsentar district');
  assert.equal(regionLabel('Габровска област', 'en'), 'Gabrovska province');
  assert.equal(fmtNumber(110000), '110 000');
  assert.equal(fmtPrice({ price: 2308, rent: true }, 'en'), '2 308 €/month');
  assert.equal(transliterate('Велико Търново'), 'Veliko Tarnovo');
  assert.equal(slugify('Къща с двор, близо до язовир'), 'kashta-s-dvor-blizo-do-yazovir');
  assert.deepEqual(distinctTypes(items).slice(0, 2), ['Парцел в регулация', 'Къща']);
});
