import { test } from "node:test";
import assert from "node:assert/strict";
import { agentTool } from "../src/manage/eleven.js";
import { database, content } from "./db-helper.js";

const long =
  "Дълго описание на имота с много подробности за къщата и двора. ".repeat(40);

const call = (env, name, body) =>
  agentTool(
    new Request(`https://example.com/api/agent/${name}`, {
      method: "POST",
      headers: {
        authorization: "Bearer test",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    env,
    name,
  ).then((r) => r.json());

test("agent search returns compact pages however large the catalogue is", async () => {
  const DB = database();
  const env = {
    DB,
    SITE_URL: "https://example.com",
    AGENT_TOOL_SECRET: "test",
  };
  try {
    for (let i = 1; i <= 11; i++)
      await DB.prepare(
        "INSERT INTO properties(id,content_json,publication) VALUES (?,?,?)",
      )
        .bind(
          1000 + i,
          JSON.stringify({
            ...content,
            title: `Къща ${i}`,
            price: 10000 * (12 - i),
            description: long,
            images: Array.from({ length: 30 }, (_, n) => `img-${i}-${n}.jpg`),
          }),
          "published",
        )
        .run();

    const first = await call(env, "search_properties", { cat: "houses" });
    assert.equal(first.total, 11);
    assert.equal(first.offset, 0);
    assert.equal(first.items.length, 8);
    assert.equal(first.nextOffset, 8);
    for (const item of first.items) {
      assert.equal(item.images, undefined);
      assert.equal(item.description, undefined);
      assert.equal(item.facts, undefined);
      assert.equal(item.imageCount, 30);
      assert.ok(item.summary.length <= 281 && item.summary.endsWith("…"));
      assert.deepEqual(item.verifiedFacts, ["access"]);
      assert.match(item.url, /^https:\/\/example\.com\//);
    }
    // Eight full listings used to be sent at once; a page is now a fraction.
    assert.ok(JSON.stringify(first).length < 8 * long.length);

    const rest = await call(env, "search_properties", {
      cat: "houses",
      offset: first.nextOffset,
    });
    assert.equal(rest.items.length, 3);
    assert.equal(rest.nextOffset, null);
    const seen = new Set([...first.items, ...rest.items].map((l) => l.id));
    assert.equal(seen.size, 11);

    const cheapest = await call(env, "search_properties", {
      cat: "houses",
      sort: "price_asc",
    });
    assert.deepEqual(
      cheapest.items.slice(0, 3).map((l) => l.price),
      [10000, 20000, 30000],
    );
    const near = await call(env, "search_properties", {
      near: "Априлци",
      radius: 30,
      sort: "price_desc",
    });
    assert.equal(near.items[0].price, 110000);
    assert.equal(near.items[0].distanceSource, "settlement_centres");

    const full = await call(env, "get_property", { property_id: 1001 });
    assert.equal(full.description, long);
    assert.equal(full.images, undefined);
    assert.equal(full.imageCount, 30);
    assert.equal(full.facts.access.text, "Асфалтов път");
  } finally {
    DB.close();
  }
});
