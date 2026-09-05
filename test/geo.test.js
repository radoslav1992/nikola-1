import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { lookupPlace, regionCoords, attachCoords, spreadApproximate, toMapPoints, geocodePlace, PLACES } from '../src/geo.js';

const seed = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url), 'utf8'));

test('gazetteer covers every place in the seed', () => {
  for (const l of seed.items) assert.ok(lookupPlace(l.place, l.region), `missing ${l.place}`);
});

test('gazetteer values are plausible Bulgarian coordinates', () => {
  for (const [name, [lat, lng]] of Object.entries(PLACES)) {
    assert.ok(lat > 41 && lat < 44.5, `${name} lat`);
    assert.ok(lng > 22 && lng < 29, `${name} lng`);
  }
  assert.equal(regionCoords('Габровска област').lat, PLACES['Габрово'][0]);
  assert.equal(regionCoords('Няма област'), null);
});

test('attachCoords: known towns offline, unknown → cache → nominatim → region fallback', async () => {
  const items = [
    { id: 1, place: 'близо до гр. Севлиево', region: 'Габровска област' },
    { id: 2, place: 'с. Непознато', region: 'Ловешка област' },
    { id: 3, place: 'с. Друго', region: 'Габровска област' },
    { id: 4, place: 'с. Друго', region: 'Габровска област' },
    { id: 5, place: 'гр. Габрово', region: 'Габровска област', coords: { lat: 42.9, lng: 25.3, approx: false, source: 'detail' } },
  ];
  const store = new Map([['geo:v1:Друго|Габровска област', { lat: 42.9, lng: 25.2, approx: true, source: 'nominatim' }]]);
  const cache = { get: async (k) => store.get(k) || null, put: async (k, v) => { store.set(k, v); } };
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => [{ lat: '43.1234', lon: '24.5678' }] };
  };
  await attachCoords(items, { cache, network: true, fetchImpl: fakeFetch, sleepMs: 0 });

  assert.equal(items[0].coords.source, 'gazetteer');
  assert.equal(items[1].coords.source, 'nominatim');
  assert.equal(items[1].coords.lat, 43.1234);
  assert.equal(calls.length, 1, 'only the truly unknown place hits the network');
  assert.match(calls[0], /nominatim\.openstreetmap\.org.*%D0%9D%D0%B5%D0%BF%D0%BE%D0%B7%D0%BD%D0%B0%D1%82%D0%BE/);
  assert.ok(store.has('geo:v1:Непознато|Ловешка област'), 'result cached');
  assert.equal(items[2].coords.source, 'nominatim'); // from cache, no network
  assert.equal(items[4].coords.source, 'detail'); // exact coords untouched
  assert.equal(items[4].coords.lat, 42.9);
});

test('attachCoords without network falls back to the regional capital', async () => {
  const items = [{ id: 1, place: 'с. Непознато', region: 'Ловешка област' }];
  await attachCoords(items, { network: false, sleepMs: 0 });
  assert.equal(items[0].coords.source, 'region');
  assert.equal(items[0].coords.lat, PLACES['Ловеч'][0]);
});

test('approximate markers in the same town are spread apart, exact ones are not moved', () => {
  const base = { lat: 43.0256, lng: 25.1133, approx: true };
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i, coords: { ...base } }));
  items.push({ id: 99, coords: { lat: 43.0256, lng: 25.1133, approx: false } });
  spreadApproximate(items);
  const keys = new Set(items.slice(0, 10).map((l) => `${l.coords.lat},${l.coords.lng}`));
  assert.equal(keys.size, 10);
  for (const l of items.slice(0, 10)) {
    assert.ok(Math.abs(l.coords.lat - base.lat) < 0.01 && Math.abs(l.coords.lng - base.lng) < 0.015, 'stays within ~1 km');
  }
  assert.equal(items[10].coords.lat, 43.0256);
});

test('map points are compact and skip listings without coordinates', async () => {
  const items = seed.items.map((l) => ({ ...l }));
  await attachCoords(items, { network: false, sleepMs: 0 });
  const pts = toMapPoints([...items, { id: 0, title: 'x' }]);
  assert.equal(pts.length, seed.items.length);
  assert.ok(pts.every((p) => p.id && p.lat && p.lng && p.title && p.slug));
  assert.ok(!('images' in pts[0]));
});

test('geocodePlace tolerates empty results and bad status', async () => {
  assert.equal(await geocodePlace('с. Х', 'Ловешка област', async () => ({ ok: true, json: async () => [] })), null);
  await assert.rejects(geocodePlace('с. Х', 'Ловешка област', async () => ({ ok: false, status: 429 })), /429/);
});
