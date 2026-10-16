import { test } from "node:test";
import assert from "node:assert/strict";
import { database, content, source } from "./db-helper.js";
import {
  importCatalogue,
  saveProperty,
  publicCatalogue,
  getProperty,
  editorProperty,
  mapPoint,
} from "../src/manage/catalogue.js";
import { nearby } from "../src/spatial.js";
import { placeParts, townOf } from "../src/catalog.js";
import { lookupPlace } from "../src/geo.js";
import { renderProperty } from "../src/render/property.js";
import { toMapPoints } from "../src/geo.js";

const env = () => ({ DB: database(), SITE_URL: "https://niimoti.com" });
async function publishWith(e, patch) {
  await importCatalogue(e, { items: [source], total: 1, failedPages: [] });
  const p = editorProperty(await getProperty(e, 101));
  return saveProperty(e, 101, {
    content: { ...content, ...patch },
    publication: "published",
    status: "active",
    version: p.version,
  });
}

test("a district names its town in either order", () => {
  for (const place of ["Габрово, кв. Ябълка", "кв. Ябълка, Габрово"]) {
    assert.deepEqual(placeParts(place), {
      town: "Габрово",
      district: "кв. Ябълка",
      rest: [],
    });
    assert.equal(townOf(place), "Габрово");
    // The listing keeps its map and its place on the overall map.
    assert.ok(Math.abs(lookupPlace(place, "Габрово").lat - 42.87) < 0.05);
  }
  assert.equal(townOf("Рибарица, Ловеч"), "Рибарица");
  assert.equal(townOf("близо до гр. Севлиево"), "Севлиево");
  const [listing] = nearby(
    [{ id: 5, place: "кв. Ябълка, Габрово", region: "Габрово" }],
    "Габрово",
    20,
  );
  assert.match(listing.distanceNote, /кв\. Ябълка/);
});

test("the approximate point is validated and snapped to about 1 km", () => {
  assert.equal(mapPoint(""), null);
  assert.equal(mapPoint(undefined), null);
  assert.deepEqual(mapPoint("42.80614, 25.21337"), { lat: 42.81, lng: 25.21 });
  assert.deepEqual(mapPoint({ lat: 42.8, lng: 25.2 }), {
    lat: 42.8,
    lng: 25.2,
  });
  for (const bad of ["25.21, 42.80", "abc", "48.85, 2.35"])
    assert.throws(
      () => mapPoint(bad),
      (e) => e.status === 400,
    );
});

test("Nikola's point drives the property map, the overall map, the map link and distances", async () => {
  const e = env();
  await publishWith(e, {
    place: "Габрово, кв. Ябълка",
    region: "Габрово",
    mapPoint: "42.80614, 25.21337",
  });
  const data = await publicCatalogue(e),
    [listing] = data.items;
  assert.deepEqual(listing.coords, {
    lat: 42.81,
    lng: 25.21,
    approx: true,
    source: "broker",
  });
  const page = renderProperty({
    lang: "bg",
    data,
    listing,
    detail: null,
    env: {},
  });
  assert.match(page, /data-lat="42.81" data-lng="25.21" data-approx="1"/);
  assert.ok(page.includes("query=42.81%2C25.21"));
  assert.equal(toMapPoints(data.items)[0].lat, 42.81);
  // About 10 km from the centre of Gabrovo, measured to Nikola's point.
  const [near] = nearby(data.items, "Габрово", 20);
  assert.equal(near.distanceSource, "approximate_location");
  assert.ok(near.distanceKm > 8 && near.distanceKm < 14, near.distanceKm);
  assert.equal(nearby(data.items, "Габрово", 5).length, 0);
});

test("without a point the map link names the district, not the town centre", async () => {
  const e = env();
  await publishWith(e, { place: "Габрово, кв. Ябълка", region: "Габрово" });
  const data = await publicCatalogue(e),
    [listing] = data.items;
  assert.equal(listing.coords.source, "gazetteer");
  const page = renderProperty({
    lang: "bg",
    data,
    listing,
    detail: null,
    env: {},
  });
  assert.ok(
    page.includes(
      `query=${encodeURIComponent("кв. Ябълка, Габрово, България")}`,
    ),
  );
});
