import { test } from "node:test";
import assert from "node:assert/strict";
import { database, source, content } from "./db-helper.js";
import {
  importCatalogue,
  getProperty,
  saveProperty,
  editorProperty,
} from "../src/manage/catalogue.js";
import {
  standalonePreview,
  archiveImportedDrafts,
} from "../src/manage/standalone.js";
import { build } from "esbuild";
const bundle = await build({
  entryPoints: ["src/store.js"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { refreshListings } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);

test("standalone refresh never fetches source; saves preserve last displayed price and disable sync", async (t) => {
  const env = { DB: database() };
  t.after(() => env.DB.close());
  await importCatalogue(env, { items: [source], total: 1 });
  let row = await getProperty(env, 101);
  await env.DB.prepare(
    "UPDATE properties SET source_json=?,sync_price=1 WHERE id=101",
  )
    .bind(JSON.stringify({ ...source, price: 47000 }))
    .run();
  row = editorProperty(await getProperty(env, 101));
  assert.equal(row.content.price, 47000);
  const saved = await saveProperty(env, 101, {
    content: { ...content, price: row.content.price },
    version: row.version,
    publication: "published",
    sync_price: true,
    sync_status: true,
  });
  assert.equal(saved.sync_price, 0);
  assert.equal(saved.sync_status, 0);
  t.mock.method(globalThis, "fetch", () => {
    throw Error("Source must not be fetched");
  });
  const catalogue = await refreshListings(env);
  assert.equal(catalogue.items.length, 1);
  assert.equal(catalogue.items[0].price, 47000);
});

test("cleanup archives only untouched imports, keeps Ribaritsa and edited or associated drafts, rejects stale previews", async (t) => {
  const env = { DB: database() };
  t.after(() => env.DB.close());
  await importCatalogue(env, {
    items: [101, 102, 103, 104, 105].map((id) => ({ ...source, id })),
    total: 5,
  });
  let row = await getProperty(env, 102);
  await saveProperty(env, 102, {
    content: { ...content, place: "с. Рибарица" },
    version: row.version,
    publication: "published",
  });
  row = await getProperty(env, 103);
  await saveProperty(env, 103, {
    content: { ...content, title: "Подготвяна обява" },
    version: row.version,
    publication: "draft",
  });
  await env.DB.prepare(
    "INSERT INTO notes(id,entity_type,entity_id,body,created_at) VALUES ('n','property','104','Keep','2026-09-22')",
  ).run();
  await env.DB.prepare(
    "INSERT INTO media(key,property_id,mime,created_at) VALUES ('photo',105,'image/jpeg','2026-09-22')",
  ).run();
  const preview = await standalonePreview(env);
  assert.deepEqual(
    preview.candidates.map((p) => p.id),
    [101],
  );
  assert.equal(preview.preserved, 4);
  const result = await archiveImportedDrafts(env, preview.candidates);
  assert.equal(result.archived, 1);
  assert.equal((await getProperty(env, 102)).publication, "published");
  assert.equal((await getProperty(env, 103)).publication, "draft");
  assert.equal((await getProperty(env, 101)).publication, "archived");
  assert.equal(
    (await env.DB.prepare("SELECT count(*) AS n FROM properties").first()).n,
    5,
  );
  assert.equal(
    (await env.DB.prepare("SELECT count(*) AS n FROM media").first()).n,
    1,
  );
  await assert.rejects(
    archiveImportedDrafts(env, preview.candidates),
    (e) => e.status === 409,
  );
});
