import { test } from "node:test";
import assert from "node:assert/strict";
import { database, content, source } from "./db-helper.js";
import {
  importCatalogue,
  saveProperty,
  publicCatalogue,
  getProperty,
  editorProperty,
  setSettings,
} from "../src/manage/catalogue.js";
import { nearby } from "../src/spatial.js";
import { heuristicSearch, parseFilters, applyFilters } from "../src/catalog.js";
import { createSlot, book, cancelAppointment } from "../src/manage/calendar.js";
import { renderProperty } from "../src/render/property.js";
import { renderHome } from "../src/render/home.js";
import { renderListings } from "../src/render/listings.js";
import { serveMedia } from "../src/manage/media.js";
const env = () => ({ DB: database(), SITE_URL: "https://niimoti.com" });
async function imported(e) {
  await importCatalogue(e, { items: [source], total: 1, failedPages: [] });
  return editorProperty(await getProperty(e, 101));
}
async function publish(e) {
  const p = await imported(e);
  return saveProperty(e, 101, {
    content,
    publication: "published",
    status: "active",
    sync_price: true,
    sync_status: true,
    version: p.version,
  });
}
test("imports remain drafts; publication requires full translated content and verified village", async () => {
  const e = env(),
    p = await imported(e);
  assert.equal((await publicCatalogue(e)).items.length, 0);
  for (const patch of [
    { descriptionEn: "" },
    { locationConfirmed: false },
    { contentReviewed: false },
    { place: "близо до гр. Априлци" },
  ])
    await assert.rejects(
      saveProperty(e, 101, {
        content: { ...content, ...patch },
        publication: "published",
        version: p.version,
      }),
      (x) => x.status === 400,
    );
});
test("publication errors list only the missing requirements and drafts remain saveable", async () => {
  const e = env();
  try {
    await assert.rejects(
      saveProperty(e, null, {
        content: { ...content, titleEn: "", place: "близо до гр. Севлиево" },
        publication: "published",
      }),
      (error) => {
        assert.equal(error.status, 400);
        assert.ok(error.message.includes("заглавие (EN)"));
        assert.ok(error.message.includes("вместо „близо до“"));
        assert.ok(!error.message.includes("описание (BG)"));
        assert.ok(!error.message.includes("снимка"));
        return true;
      },
    );
    const draft = await saveProperty(e, null, {
      content: {},
      publication: "draft",
    });
    assert.equal(draft.publication, "draft");
    assert.equal((await publicCatalogue(e)).items.length, 0);
  } finally {
    e.DB.close();
  }
});
test("source prices update without overwriting curated content; stale editor rejected; incomplete import never withdraws", async () => {
  const e = env(),
    p = await publish(e);
  await importCatalogue(e, {
    items: [{ ...source, price: 47000, title: "Changed source" }],
    total: 1,
  });
  const c = await publicCatalogue(e);
  assert.equal(c.items[0].price, 47000);
  assert.equal(c.items[0].title, content.title);
  assert.equal(c.items[0].description, content.description);
  await assert.rejects(
    saveProperty(e, 101, {
      content,
      publication: "published",
      version: p.version,
    }),
    (x) => x.status === 409,
  );
  await importCatalogue(e, {
    items: [{ ...source, id: 102 }],
    total: 2,
    failedPages: [2],
  });
  assert.equal((await getProperty(e, 101)).source_missing, 0);
  await importCatalogue(e, { items: [{ ...source, id: 102 }], total: 1 });
  assert.equal((await getProperty(e, 101)).status, "active");
  await importCatalogue(e, { items: [{ ...source, id: 102 }], total: 1 });
  assert.equal((await getProperty(e, 101)).status, "withdrawn");
  assert.equal((await publicCatalogue(e)).items.length, 0);
});
test("manual price survives source refresh when automatic price disabled", async () => {
  const e = env(),
    p = await publish(e);
  await saveProperty(e, 101, {
    content,
    publication: "published",
    version: p.version,
    sync_price: false,
  });
  await importCatalogue(e, { items: [{ ...source, price: 99999 }], total: 1 });
  assert.equal((await publicCatalogue(e)).items[0].price, 45000);
});
test("public catalogue and rendered pages omit private fields and exact coordinates; English keeps same property URL", async () => {
  const e = env();
  await publish(e);
  for (const lang of ["bg", "en"]) {
    const data = await publicCatalogue(e, lang),
      listing = data.items[0];
    const body = renderProperty({
      lang,
      data,
      listing,
      detail: { paragraphs: listing.description.split("\n\n") },
      env: e,
    });
    const payload = JSON.stringify(data) + body;
    for (const secret of [
      "SECRET_ADDRESS",
      "SECRET_NOTES",
      "42.84449999",
      "25.00519999",
      "source_json",
      "privateAddress",
    ])
      assert.ok(!payload.includes(secret), secret);
    assert.equal(listing.coords.approx, true);
    assert.ok(body.includes("/en/imot/101/"));
    assert.ok(
      body.includes(
        content[lang === "en" ? "descriptionEn" : "description"].split(
          "\n\n",
        )[1],
      ),
    );
  }
});
test("custom region definitions drive catalogue and homepage without depending on prototypes", async () => {
  const e = env(),
    p = await publish(e);
  await e.DB.prepare("INSERT INTO regions(key,data_json) VALUES (?,?)")
    .bind(
      "balkan",
      JSON.stringify({
        name: { bg: "Балкан", en: "Balkan" },
        guide: { bg: "Проверен район", en: "Verified area" },
      }),
    )
    .run();
  await saveProperty(e, 101, {
    content: { ...content, regionKey: "balkan" },
    publication: "published",
    version: p.version,
  });
  const data = await publicCatalogue(e);
  const f = parseFilters(new URLSearchParams("region=balkan"));
  assert.equal(applyFilters(data.items, f).length, 1);
  assert.ok(
    renderHome({
      lang: "bg",
      data,
      env: e,
      testimonials: { items: [] },
    }).includes("/raion/balkan"),
  );
  assert.ok(
    renderListings({ lang: "en", data, filters: f, env: e }).includes("Balkan"),
  );
});
test("proximity finds Kravenik near Apriltsi despite different province, excludes unconfirmed near-town proxies", () => {
  const items = [
    { ...source, price: 40000 },
    { ...source, id: 102, place: "близо до гр. Априлци" },
    { ...source, id: 103, place: "гр. Велико Търново" },
  ];
  const found = nearby(items, "Априлци", 10);
  assert.deepEqual(
    found.map((l) => l.id),
    [101],
  );
  assert.ok(found[0].distanceKm > 5 && found[0].distanceKm < 10);
  for (const q of [
    "къща близо до Априлци до 50000 евро",
    "house near Apriltsi under 50k",
  ])
    assert.deepEqual(
      heuristicSearch(items, q).items.map((l) => l.id),
      [101],
    );
});
test("calendar prevents overlapping slots and duplicate bookings, cancels atomically, and rejects past/unconfirmed", async () => {
  const e = env();
  await publish(e);
  const starts = new Date(Date.now() + 86400000).toISOString(),
    ends = new Date(Date.now() + 90000000).toISOString();
  await createSlot(e, { starts_at: starts, ends_at: ends });
  await assert.rejects(
    createSlot(e, {
      starts_at: new Date(Date.now() + 87000000).toISOString(),
      ends_at: ends,
    }),
    (x) => x.status === 409,
  );
  const slot = await e.DB.prepare("SELECT id FROM slots").first();
  const b = {
    slot_id: slot.id,
    property_id: 101,
    name: "Test",
    contact: "test@example.com",
    confirmed: true,
  };
  await assert.rejects(
    book(e, { ...b, confirmed: false }),
    (x) => x.status === 400,
  );
  const results = await Promise.allSettled([book(e, b), book(e, b)]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    results.filter((x) => x.status === "rejected" && x.reason.status === 409)
      .length,
    1,
  );
  const id = results.find((x) => x.status === "fulfilled").value.appointment_id;
  await cancelAppointment(e, id);
  assert.equal(
    (await e.DB.prepare("SELECT state FROM slots").first()).state,
    "open",
  );
  await book(e, b);
  await assert.rejects(
    createSlot(e, { starts_at: "2000-01-01", ends_at: "2000-01-02" }),
    (x) => x.status === 400,
  );
});
test("blocked calendar periods prevent adding overlapping availability", async () => {
  const e = env(),
    starts_at = new Date(Date.now() + 86400000).toISOString(),
    ends_at = new Date(Date.now() + 90000000).toISOString();
  await createSlot(e, { starts_at, ends_at, blocked: true });
  await assert.rejects(
    createSlot(e, {
      starts_at: new Date(Date.now() + 87000000).toISOString(),
      ends_at,
    }),
    (x) => x.status === 409,
  );
});
test("private media is unavailable until the owning property is published and references it", async () => {
  const e = env();
  await imported(e);
  e.MEDIA = { get: async () => ({ body: "bytes" }) };
  await e.DB.prepare(
    "INSERT INTO media(key,property_id,mime,created_at) VALUES (?,?,?,?)",
  )
    .bind("photo.jpg", 101, "image/jpeg", new Date().toISOString())
    .run();
  const r = new Request("https://niimoti.com/media/photo.jpg");
  assert.equal((await serveMedia(r, e)).status, 404);
  assert.equal((await serveMedia(r, e, true)).status, 200);
  const p = await getProperty(e, 101);
  await saveProperty(e, 101, {
    content: { ...content, images: ["/media/photo.jpg"] },
    publication: "published",
    version: p.version,
  });
  assert.equal((await serveMedia(r, e)).status, 200);
});
