import { test } from "node:test";
import assert from "node:assert/strict";
import { nearby } from "../src/spatial.js";
import { findSettlement, lookupPlace, provinceOf } from "../src/geo.js";
import { townOf } from "../src/catalog.js";
import { agentTool } from "../src/manage/eleven.js";
import { database, content } from "./db-helper.js";

const listing = {
  id: 23408,
  type: "Къща",
  price: 30500,
  place: "35 км от гр. Велико Търново",
  title: "Двуетажна, масивна къща в село на 35 км от Велико Търново",
};

test("35 km listing matches a 40 km radius without invented coordinates", () => {
  const [found] = nearby([listing], "Велико Търново", 40);
  assert.equal(found.id, 23408);
  assert.equal(found.distanceKm, 35);
  assert.equal(found.distanceSource, "listing_reported");
  assert.equal(found.distanceEvidence, listing.place);
  assert.equal(found.coords, undefined);
  assert.equal(nearby([listing], "Велико Търново", 35).length, 1);
  assert.equal(nearby([listing], "Велико Търново", 34).length, 0);
  assert.equal(nearby([listing], "Севлиево", 40).length, 0);
  assert.equal(nearby([listing], "Veliko Tarnovo", 40).length, 1);
});

test("reported distances support title, reviewed town fact, decimals and English", () => {
  for (const item of [
    { title: listing.title },
    { facts: { nearestTown: { text: "35 км от гр. Велико Търново" } } },
    { place: "35,5 км от Велико Търново" },
    { title: "House 35.5 km from Veliko Tarnovo" },
  ]) {
    assert.equal(nearby([item], "Велико Търново", 40).length, 1);
  }
});

test("vague, unrelated, conflicting and lower-bound distances do not create matches", () => {
  for (const item of [
    { place: "близо до гр. Велико Търново" },
    { place: "35 км от пътя Велико Търново–София" },
    { place: "над 35 км от Велико Търново" },
    { place: "30–35 км от Велико Търново" },
    { place: "от 30 до 35 км от Велико Търново" },
    { place: listing.place, title: "Къща на 60 км от Велико Търново" },
    { description: "Болницата е на 35 км от Велико Търново." },
  ])
    assert.deepEqual(nearby([item], "Велико Търново", 40), []);
  const [calculated] = nearby([{ place: "с. Кръвеник" }], "Априлци", 10);
  assert.equal(calculated.distanceSource, "settlement_centres");
  assert.ok(calculated.distanceKm > 5 && calculated.distanceKm < 10);
});

test("agent search returns the published 35 km house, retains budget filters and hides drafts", async () => {
  const DB = database();
  const env = {
    DB,
    SITE_URL: "https://example.com",
    AGENT_TOOL_SECRET: "test",
  };
  try {
    for (const [id, publication] of [
      [23408, "published"],
      [23409, "draft"],
    ]) {
      await DB.prepare(
        "INSERT INTO properties(id,content_json,publication) VALUES (?,?,?)",
      )
        .bind(id, JSON.stringify({ ...content, ...listing }), publication)
        .run();
    }
    const search = async (criteria) =>
      (
        await agentTool(
          new Request("https://example.com/api/agent/search_properties", {
            method: "POST",
            headers: {
              authorization: "Bearer test",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              cat: "houses",
              near: "Велико Търново",
              radius: 40,
              ...criteria,
            }),
          }),
          env,
          "search_properties",
        )
      ).json();
    const result = await search({});
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, 23408);
    assert.equal(result.items[0].distanceSource, "listing_reported");
    assert.equal(result.items[0].distanceKm, 35);
    assert.equal(result.items[0].coords, undefined);
    assert.match(result.distanceMeaning, /на около N км/);
    assert.doesNotMatch(result.distanceMeaning, /according to the listing/);
    assert.equal((await search({ max: 30000 })).total, 0);
    assert.equal((await search({ language: "en" })).total, 1);
  } finally {
    DB.close();
  }
});

test("every Bulgarian settlement can anchor a distance, with names resolved by province", () => {
  assert.equal(findSettlement("Сломер").province, "Велико Търново");
  assert.equal(findSettlement("с. Ловнидол").province, "Габрово");
  // "Априлци" and "Рибарица" also exist in other provinces.
  assert.equal(findSettlement("Априлци").province, "Ловеч");
  assert.equal(findSettlement("Apriltsi").province, "Ловеч");
  assert.equal(findSettlement("Рибарица").province, "Ловеч");
  assert.equal(findSettlement("Рибарица", "Софийска област").province, "София");
  // Two towns called Бяла in other provinces: no guess.
  assert.equal(findSettlement("Бяла"), null);
  assert.equal(findSettlement("Несъществуващо"), null);
  assert.equal(provinceOf("Великотърновска област"), "Велико Търново");
  assert.equal(provinceOf("обл. Ловеч"), "Ловеч");

  const items = [
    { id: 4, place: "Сломер", region: "Велико Търново" },
    { id: 3, place: "Ловнидол", region: "Габрово" },
    { id: 5, place: "Габрово, кв. Ябълка", region: "Габрово" },
    { id: 9, place: "близо до гр. Севлиево", region: "Габровска област" },
  ];
  const [slomer] = nearby(items, "Павликени", 20);
  assert.equal(slomer.id, 4);
  assert.equal(slomer.distanceSource, "settlement_centres");
  assert.ok(slomer.distanceKm > 10 && slomer.distanceKm < 18);
  assert.deepEqual(
    nearby(items, "Севлиево", 20).map((l) => l.id),
    [3],
  );
  const district = nearby(items, "Габрово", 20).find((l) => l.id === 5);
  assert.match(district.distanceNote, /кв\. Ябълка/);
  assert.equal(nearby(items, "Бяла", 100).length, 0);
});

test("place names with a district resolve to their town", () => {
  assert.equal(townOf("Габрово, кв. Ябълка"), "Габрово");
  assert.equal(townOf("гр. Габрово / кв. Център"), "Габрово");
  const coords = lookupPlace("Габрово, кв. Ябълка", "Габрово");
  assert.equal(coords.source, "gazetteer");
  assert.ok(Math.abs(coords.lat - 42.87) < 0.05);
});
