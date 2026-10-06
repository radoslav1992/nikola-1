import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { unstable_splitSqlQuery } from "wrangler";
import { database, content, source } from "./db-helper.js";
import {
  importCatalogue,
  saveProperty,
  getProperty,
  publicListing,
} from "../src/manage/catalogue.js";
import { agentTool } from "../src/manage/eleven.js";

const publish = async (env, id, publication = "published") =>
  saveProperty(env, id, {
    content,
    publication,
    version: (await getProperty(env, id)).version,
  });

test("migration numbers already published properties in creation order", () => {
  const db = new DatabaseSync(":memory:");
  const run = (file) => {
    const sql = readFileSync(
      new URL(`../migrations/${file}`, import.meta.url),
      "utf8",
    );
    for (const statement of unstable_splitSqlQuery(sql))
      db.prepare(statement).run();
  };
  try {
    run("0001_managed_catalog.sql");
    const insert = db.prepare(
      "INSERT INTO properties (id,publication,created_at) VALUES (?,?,?)",
    );
    insert.run(10, "published", "2026-02-01T00:00:00.000Z");
    insert.run(11, "published", "2026-01-01T00:00:00.000Z");
    insert.run(12, "draft", "2025-12-01T00:00:00.000Z");
    insert.run(13, "archived", "2025-11-01T00:00:00.000Z");
    run("0002_public_number.sql");
    assert.deepEqual(
      db
        .prepare("SELECT id,public_no FROM properties ORDER BY id")
        .all()
        .map((r) => [r.id, r.public_no]),
      [
        [10, 2],
        [11, 1],
        [12, null],
        [13, null],
      ],
    );
    assert.throws(
      () => db.prepare("UPDATE properties SET public_no=1 WHERE id=10").run(),
      /UNIQUE/,
    );
  } finally {
    db.close();
  }
});

test("public numbers are given on first publication, kept, and resolvable by the assistant", async () => {
  const env = {
    DB: database(),
    SITE_URL: "https://mybalkanplace.com",
    AGENT_TOOL_SECRET: "tool",
  };
  await importCatalogue(env, {
    items: [
      source,
      { ...source, id: 102, ref: "VT 102" },
      { ...source, id: 103, ref: "VT 103" },
    ],
    total: 3,
  });
  assert.equal((await getProperty(env, 101)).public_no, null);
  await publish(env, 102);
  await publish(env, 101);
  assert.equal((await getProperty(env, 102)).public_no, 1);
  assert.equal((await getProperty(env, 101)).public_no, 2);
  // Unpublishing and republishing keeps the number; drafts never use one up.
  await publish(env, 102, "draft");
  await publish(env, 102);
  assert.equal((await getProperty(env, 102)).public_no, 1);
  assert.equal((await getProperty(env, 103)).public_no, null);
  const listing = publicListing(await getProperty(env, 101));
  assert.equal(listing.number, "00002");
  assert.equal(listing.ref, "00002");
  // A visitor says "имот 00002": the agent passes 2 and gets property 101.
  const getPropertyTool = async (body) =>
    (
      await agentTool(
        new Request("https://mybalkanplace.com/api/agent/get_property", {
          method: "POST",
          headers: {
            authorization: "Bearer tool",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        env,
        "get_property",
      )
    ).json();
  assert.equal((await getPropertyTool({ property_id: 2 })).id, 101);
  assert.equal((await getPropertyTool({ property_id: 101 })).number, "00002");
});

test("saving and publishing still work before the numbering migration runs", async () => {
  const env = { DB: database({ until: "0001" }) };
  await importCatalogue(env, { items: [source], total: 1 });
  const saved = await publish(env, 101);
  assert.equal(saved.publication, "published");
  const listing = publicListing(await getProperty(env, 101));
  assert.equal(listing.number, null);
  assert.equal(listing.ref, source.ref);
});
