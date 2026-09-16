import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupByRegion, regionOf } from '../src/regions.js';
import { parseFilters, applyFilters, heuristicSearch } from '../src/catalog.js';
import { searchListings, askAboutListing } from '../src/ai.js';
import { buyerFacts } from '../src/knowledge.js';
import { renderHome } from '../src/render/home.js';
import { renderListings } from '../src/render/listings.js';
import { renderProperty } from '../src/render/property.js';
import { renderSeller } from '../src/render/seller.js';
import { T } from '../src/render/i18n.js';
const data = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url)));
const items = data.items;

test('regional grouping preserves catalogue and respects known towns over provinces', () => {
  assert.equal(regionOf({ place: 'гр. Априлци', region: 'Ловешка област' }), 'sevlievo');
  assert.equal(regionOf({ place: 'с. Орешене', region: 'Ловешка област' }), 'teteven');
  assert.equal(regionOf({ place: 'с. Неизвестно', region: 'Габровска област' }), 'other');
  const ids = groupByRegion(items).flatMap((g) => g.items.map((l) => l.id));
  assert.equal(new Set(ids).size, items.length);
  assert.equal(ids.length, items.length);
  const f = parseFilters(new URLSearchParams('region=sevlievo&budget=0-30000'));
  const found = applyFilters(items, f);
  assert.ok(found.length && found.every((l) => regionOf(l) === 'sevlievo' && l.price <= 30000));
  assert.equal(parseFilters(new URLSearchParams('region=invalid')).region, '');
});

test('AI and fallback cannot escape structured budget, region or deal', async () => {
  const filters = parseFilters(new URLSearchParams('region=sevlievo&budget=0-30000&deal=sale'));
  const valid = applyFilters(items, filters).map((l) => l.id);
  const outside = items.find((l) => !valid.includes(l.id)).id;
  let prompt;
  const env = { AI: { run: async (_, request) => { prompt = request.messages[1].content; return { response: JSON.stringify({ ids: [outside, valid[0], valid[0]], answer: 'Match' }) }; } } };
  const ai = await searchListings(env, items, 'Къща', 'bg', filters);
  assert.deepEqual(ai.ids, [valid[0]]);
  assert.ok(!prompt.includes(`#${outside} |`));
  const fallback = await searchListings({}, items, 'Къща', 'bg', filters);
  assert.ok(fallback.ids.length && fallback.ids.every((id) => valid.includes(id)));
  assert.deepEqual((await searchListings(env, items, '', 'bg', { max: 1 })).ids, []);
  assert.deepEqual(heuristicSearch(items, 'house under 1 euro').items, []);
});

test('empty model matches stay empty; invalid model output falls back', async () => {
  const env = { AI: { run: async () => ({ response: '{"ids":[],"answer":"No match"}' }) } };
  assert.deepEqual((await searchListings(env, items, 'house', 'en')).ids, []);
  env.AI.run = async () => ({ response: 'broken JSON' });
  assert.ok((await searchListings(env, items, 'house', 'en')).ids.length);
});

test('broker facts require source and review date, and preserve language fallback', () => {
  const notes = { 123: {
    access: { text: { bg: 'Проверен достъп', en: 'Confirmed access' }, source: 'Оглед от брокера', reviewedAt: '2026-09-01' },
    yearRound: { text: 'Да', source: '', reviewedAt: '2026-09-01' },
    amenities: { text: 'Магазин', source: 'Оглед', reviewedAt: '2099-01-01' },
  } };
  const facts = buyerFacts(123, 'en', notes);
  assert.equal(facts[0].text, 'Confirmed access');
  assert.ok(facts.slice(1).every((f) => f.text === null));
  assert.ok(buyerFacts(999, 'bg', notes).every((f) => f.text === null));
});

test('property AI receives only listing evidence and disallows invented costs and distances', async () => {
  let messages;
  await askAboutListing({ AI: { run: async (_, input) => { messages = input.messages; return { response: 'Не е посочено.' }; } } }, items[0], null, T.bg.aiChips[3], 'bg');
  assert.match(messages[0].content, /Never infer distances/);
  assert.match(messages[0].content, /without estimating amounts/);
  assert.doesNotMatch(messages[0].content, /~3%/);
  assert.match(messages[1].content, /no description available/);
});

for (const lang of ['bg', 'en']) {
  test(`${lang}: pages expose buyer questions, region filters and separate seller flow`, () => {
    const home = renderHome({ lang, data, env: {} });
    assert.doesNotMatch(home, /cat=reduced|id="reduced"/);
    assert.match(home, /name="region"/);
    assert.match(home, /data-search-example/);
    assert.match(home, /predlozhete-imot/);
    const listing = items[1];
    const property = renderProperty({ lang, data, listing, detail: null, env: {} });
    assert.equal((property.match(/data-ai-chip/g) || []).length, 4);
    for (const q of T[lang].aiChips) assert.ok(property.includes(q));
    assert.ok(property.includes(T[lang].factUnknown));
    const filters = parseFilters(new URLSearchParams('region=sevlievo&budget=0-30000'));
    const list = renderListings({ lang, data, filters, env: {}, query: 'region=sevlievo&budget=0-30000' });
    assert.match(list, /value="sevlievo" selected/);
    assert.match(list, /karta\?region=sevlievo&amp;budget=0-30000/);
    const seller = renderSeller({ lang, env: {} });
    assert.match(seller, /name="intent" value="sell"/);
    assert.match(seller, /name="propertyLocation" required/);
    assert.match(seller, /name="propertyType" required/);
  });
}
