import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { database, content, source } from "./db-helper.js";
import {
  importCatalogue,
  saveProperty,
  getProperty,
} from "../src/manage/catalogue.js";
import { catalogueFeed } from "../src/manage/feed.js";

test("public feeds export full curated content, escape HTML/XML, and never leak private source data", async () => {
  const env = { DB: database(), SITE_URL: "https://unused-domain.test" };
  const call = (path, lang = "bg", method = "GET") =>
    catalogueFeed(
      new Request(
        "https://preview.workers.dev" + (lang === "en" ? "/en" : "") + path,
        { method },
      ),
      env,
      path,
      lang,
    );
  await importCatalogue(env, {
    items: [source, { ...source, id: 102 }],
    total: 2,
  });
  await saveProperty(env, 101, {
    content: {
      ...content,
      title: "Къща & двор <script>alert(1)</script>",
      description: content.description + '\n<&"\u0001',
      facts: { ...content.facts, water: { text: "UNREVIEWED_WATER" } },
    },
    publication: "published",
    sync_price: true,
    version: (await getProperty(env, 101)).version,
  });
  let res = await call("/feeds/properties.json");
  const data = await res.json();
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(data.total, 1);
  const item = data.items[0];
  assert.equal(item.id, 101);
  assert.equal(item.price_eur, 50000);
  assert.equal(item.description, content.description + '\n<&"\u0001');
  assert.equal(item.facts.access.text, "Асфалтов път");
  assert.equal(item.facts.water, undefined);
  assert.match(item.url, /^https:\/\/preview.workers.dev\/imot\/101\//);
  assert.equal(
    item.details_url,
    "https://preview.workers.dev/feeds/properties/101.json",
  );
  for (const path of [
    "/agent/catalog",
    "/feeds/properties.xml",
    "/feeds/properties.json",
    "/feeds/properties/101.json",
  ]) {
    const body = await (await call(path)).text();
    for (const forbidden of [
      "SECRET_ADDRESS",
      "SECRET_NOTES",
      "42.84449999",
      "25.00519999",
      "source_json",
      "content_json",
      "suprimmo.bg",
      "UNREVIEWED_WATER",
    ])
      assert.ok(!body.includes(forbidden), path + " leaked " + forbidden);
  }
  const html = new JSDOM(await (await call("/agent/catalog")).text());
  assert.equal(html.window.document.querySelectorAll("script").length, 0);
  assert.equal(html.window.document.querySelectorAll("article").length, 1);
  assert.equal(
    html.window.document.querySelector("h2").textContent,
    item.title,
  );
  html.window.close();
  const rss = new JSDOM(await (await call("/feeds/properties.xml")).text(), {
    contentType: "text/xml",
  });
  assert.equal(rss.window.document.querySelectorAll("item").length, 1);
  assert.equal(
    rss.window.document.querySelector("item title").textContent,
    item.title,
  );
  assert.ok(
    rss.window.document
      .querySelector("item description")
      .textContent.includes(content.description),
  );
  rss.window.close();
  const english = await (await call("/feeds/properties.json", "en")).json();
  assert.equal(english.items[0].title, content.titleEn);
  assert.equal(english.items[0].description, content.descriptionEn);
  assert.match(english.items[0].details_url, /\/en\/feeds\//);
  assert.equal((await call("/feeds/properties/102.json")).status, 404);
  assert.equal((await call("/feeds/properties/999.json")).status, 404);
  assert.equal(
    (await call("/feeds/properties.json", "bg", "POST")).status,
    405,
  );
  assert.equal(await (await call("/agent/catalog", "bg", "HEAD")).text(), "");
  // Price changes and unpublishing must be reflected on the very next fetch.
  await env.DB.prepare("UPDATE properties SET source_json=? WHERE id=101")
    .bind(JSON.stringify({ ...source, price: 49000 }))
    .run();
  assert.equal(
    (await (await call("/feeds/properties/101.json")).json()).price_eur,
    49000,
  );
  for (const status of ["reserved", "sold", "withdrawn"]) {
    await env.DB.prepare("UPDATE properties SET status=? WHERE id=101")
      .bind(status)
      .run();
    assert.equal(
      (await (await call("/feeds/properties.json")).json()).total,
      status === "reserved" ? 1 : 0,
    );
  }
  await env.DB.prepare(
    "UPDATE properties SET status='active', publication='draft' WHERE id=101",
  ).run();
  assert.equal((await call("/feeds/properties/101.json")).status, 404);
  assert.equal((await (await call("/feeds/properties.json")).json()).total, 0);
  env.DB.close();
});
test("missing database returns unavailable instead of a misleading empty catalogue", async () => {
  assert.equal(
    (
      await catalogueFeed(
        new Request("https://niimoti.com/agent/catalog"),
        {},
        "/agent/catalog",
      )
    ).status,
    503,
  );
});
