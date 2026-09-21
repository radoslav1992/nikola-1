import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { database, content, source } from "./db-helper.js";
import {
  importCatalogue,
  saveProperty,
  getProperty,
  setSettings,
} from "../src/manage/catalogue.js";
import { hmac } from "../src/manage/auth.js";
const bundled = await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
});
const { default: worker } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text).toString("base64")
);
test("Worker routes use managed data, hide drafts/media, preserve English URL, protect admin and accept enquiries", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 503 }),
  );
  const env = {
    DB: database(),
    SITE_URL: "https://niimoti.com",
    ADMIN_SESSION_SECRET: "secret",
    ADMIN_PASSWORD_HASH: "hash",
    MEDIA: { get: async () => ({ body: "image" }) },
  };
  const call = (path, body, headers = {}) =>
    worker.fetch(
      new Request(
        "https://niimoti.com" + path,
        body
          ? {
              method: "POST",
              body: JSON.stringify(body),
              headers: {
                origin: "https://niimoti.com",
                "content-type": "application/json",
                ...headers,
              },
            }
          : { headers },
      ),
      env,
      { waitUntil: () => {} },
    );
  await importCatalogue(env, { items: [source], total: 1 });
  await env.DB.prepare(
    "INSERT INTO media(key,property_id,mime,created_at) VALUES (?,?,?,?)",
  )
    .bind("hidden.jpg", 101, "image/jpeg", new Date().toISOString())
    .run();
  assert.equal((await call("/media/hidden.jpg")).status, 404);
  assert.equal((await call("/api/admin/properties")).status, 401);
  assert.equal((await call("/api/listings")).status, 200);
  assert.equal((await (await call("/api/listings")).json()).items.length, 0);
  assert.equal((await call("/imot/101")).status, 404);
  assert.equal((await call("/api/debug/source")).status, 404);
  await saveProperty(env, 101, {
    content,
    publication: "published",
    version: (await getProperty(env, 101)).version,
  });
  const data = await (await call("/api/listings")).json(),
    slug = data.items[0].slug;
  for (const path of [
    "/agent/catalog",
    "/feeds/properties.xml",
    "/feeds/properties.json",
    "/feeds/properties/101.json",
  ]) {
    const feed = await call(path);
    assert.equal(feed.status, 200);
    assert.equal(feed.headers.get("cache-control"), "no-store");
    assert.ok((await feed.text()).includes(content.title));
  }
  assert.equal(
    (await (await call("/en/feeds/properties/101.json")).json()).description,
    content.descriptionEn,
  );
  assert.equal((await call("/feeds/properties/999.json")).status, 404);
  for (const lang of ["", "/en"]) {
    const r = await call(`${lang}/imot/101/${slug}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "no-store");
    const html = await r.text();
    assert.ok(html.includes("/assistant.js"));
    assert.ok(!html.includes("SECRET_ADDRESS"));
    assert.ok(html.includes(lang ? content.titleEn : content.title));
  }
  assert.equal((await call("/raion/sevlievo")).status, 200);
  const home = await call("/");
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes("data-agent-search"));
  assert.equal(
    (
      await call("/api/contact", {
        name: "Seller",
        contact: "test@example.com",
        intent: "sell",
        propertyLocation: "Кръвеник",
        propertyType: "Къща",
      })
    ).status,
    200,
  );
  assert.equal(
    (await env.DB.prepare("SELECT count(*) AS n FROM leads").first()).n,
    1,
  );
  const expiry = Date.now() + 3600000,
    nonce = "nonce",
    sig = await hmac(
      env.ADMIN_SESSION_SECRET,
      `${expiry}.${nonce}.${env.ADMIN_PASSWORD_HASH}`,
    ),
    cookie = `ni_admin=${expiry}.${nonce}.${sig}`;
  assert.equal((await call("/media/hidden.jpg", null, { cookie })).status, 200);
  assert.equal(
    (
      await call(
        "/api/admin/properties",
        {},
        { cookie, origin: "https://evil.test" },
      )
    ).status,
    403,
  );
});
