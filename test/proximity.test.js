import { test } from "node:test";
import assert from "node:assert/strict";
import { nearby } from "../src/spatial.js";
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
    assert.match(result.distanceMeaning, /according to the listing/);
    assert.equal((await search({ max: 30000 })).total, 0);
    assert.equal((await search({ language: "en" })).total, 1);
  } finally {
    DB.close();
  }
});
