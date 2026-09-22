import { HttpError, clean, now, id, audit } from "./http.js";
import { lookupPlace, regionCoords } from "../geo.js";
import { regionOf, REGIONS, REGION_NAMES } from "../regions.js";
import { slugify, transliterate } from "../render/i18n.js";
export const parse = (text, fallback = {}) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};
export async function settings(env) {
  if (!env.DB) return {};
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key='site'",
  ).first();
  return parse(row?.value);
}
export async function setSettings(env, value) {
  await env.DB.prepare(
    "INSERT INTO settings(key,value) VALUES ('site',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  )
    .bind(JSON.stringify(value))
    .run();
}
const strFields = [
  "title",
  "titleEn",
  "type",
  "place",
  "region",
  "regionKey",
  "description",
  "descriptionEn",
  "privateNotes",
  "privateAddress",
];
const numFields = ["price", "area", "plotArea", "bedrooms", "floors"];
const factKeys = [
  "access",
  "yearRound",
  "amenities",
  "nearestTown",
  "electricity",
  "water",
  "internet",
  "condition",
];
export function validateContent(input) {
  const out = {};
  for (const k of strFields)
    out[k] = clean(input[k], k.startsWith("description") ? 40000 : 2000);
  for (const k of numFields) {
    const v = input[k];
    out[k] = v === "" || v == null ? null : Number(v);
    if (out[k] != null && (!Number.isFinite(out[k]) || out[k] < 0))
      throw new HttpError(400, `Невалидно поле: ${k}`);
  }
  out.rent = Boolean(input.rent);
  out.images = (Array.isArray(input.images) ? input.images : [])
    .map((x) => clean(x, 300))
    .filter(
      (x) =>
        /^\/(?:media)\/[a-zA-Z0-9._-]+$/.test(x) ||
        /^[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i.test(x),
    )
    .slice(0, 80);
  out.facts = {};
  for (const k of factKeys) {
    const f = input.facts?.[k];
    if (f?.text)
      out.facts[k] = {
        text: clean(f.text, 3000),
        textEn: clean(f.textEn, 3000),
        source: clean(f.source, 300),
        reviewedAt: clean(f.reviewedAt, 10),
      };
  }
  out.locationConfirmed = Boolean(input.locationConfirmed);
  out.contentReviewed = Boolean(input.contentReviewed);
  return out;
}
export function publicListing(row, lang = "bg") {
  const source = parse(row.source_json),
    c = parse(row.content_json),
    imageList = c.images || [];
  const out = {
    id: row.id,
    ref: source.ref || `NI-${row.id}`,
    slug: slugify(c.title || source.title || String(row.id)),
    title:
      lang === "en" && c.titleEn ? c.titleEn : c.title || source.title || "",
    type: c.type || source.type || "",
    place: c.place || source.place || "",
    region: c.region || source.region || "",
    regionKey: c.regionKey || "",
    images: imageList,
    price: row.sync_price && row.source_id ? source.price : c.price,
    rent: c.rent ?? source.rent ?? false,
    area: c.area,
    plotArea: c.plotArea,
    bedrooms: c.bedrooms,
    floors: c.floors,
    status: row.status,
    order: source.order || 0,
    url: source.url || "",
    managed: true,
    updatedAt: row.updated_at,
  };
  // Never reuse source coordinates. Only settlement centres reach public views and tools.
  out.coords = lookupPlace(out.place, out.region);
  out.locationConfirmed = Boolean(c.locationConfirmed);
  out.description =
    lang === "en" && c.descriptionEn ? c.descriptionEn : c.description || "";
  out.descriptionTranslated = lang === "en" && Boolean(c.descriptionEn);
  out.facts = Object.fromEntries(
    factKeys
      .map((k) => [k, c.facts?.[k]])
      .filter(
        ([, f]) =>
          f?.source &&
          /^\d{4}-\d{2}-\d{2}$/.test(f.reviewedAt) &&
          Date.parse(f.reviewedAt) <= Date.now(),
      )
      .map(([k, f]) => [
        k,
        {
          text: lang === "en" && f.textEn ? f.textEn : f.text,
          source: f.source,
          reviewedAt: f.reviewedAt,
        },
      ]),
  );
  return out;
}
export async function publicCatalogue(env, lang = "bg") {
  const rows = await env.DB.prepare(
    "SELECT * FROM properties WHERE publication='published' AND status IN ('active','reserved') ORDER BY updated_at DESC",
  ).all();
  return {
    items: rows.results.map((r) => publicListing(r, lang)),
    fetchedAt: rows.results[0]?.updated_at || now(),
    managed: true,
    total: rows.results.length,
    regions: await regions(env),
  };
}
export async function getProperty(env, propertyId) {
  return env.DB.prepare("SELECT * FROM properties WHERE id=?")
    .bind(Number(propertyId))
    .first();
}
export function editorProperty(row) {
  const content = parse(row.content_json);
  // Preserve the last displayed price when a formerly synced property is edited.
  if (row.sync_price && row.source_id)
    content.price = parse(row.source_json).price ?? null;
  return {
    ...row,
    source: parse(row.source_json),
    content,
    source_json: undefined,
    content_json: undefined,
  };
}
export async function saveProperty(env, propertyId, body) {
  const previous = propertyId ? await getProperty(env, propertyId) : null;
  if (propertyId && !previous) throw new HttpError(404, "Имотът не е намерен.");
  const content = validateContent(body.content || {}),
    publication = body.publication || "draft",
    status = body.status || "active";
  if (
    !["draft", "published", "archived"].includes(publication) ||
    !["active", "reserved", "sold", "withdrawn"].includes(status)
  )
    throw new HttpError(400, "Невалиден статус.");
  if (publication === "published") {
    const missing = [
      [content.title, "заглавие (BG)"],
      [content.titleEn, "заглавие (EN)"],
      [content.type, "тип имот"],
      [content.place, "действително населено място"],
      [content.description, "пълно описание (BG)"],
      [content.descriptionEn, "пълно описание (EN)"],
      [content.images.length, "поне една снимка"],
      [content.locationConfirmed, "отметка за потвърдено населено място"],
      [
        content.contentReviewed,
        "отметка за преглед на съдържанието и личните данни",
      ],
    ]
      .filter(([valid]) => !valid)
      .map(([, label]) => label);
    if (/^(?:близо до|near\b)/i.test(content.place))
      missing.push("действително населено място вместо „близо до“");
    if (missing.length)
      throw new HttpError(
        400,
        `За публикуване липсват: ${missing.join("; ")}. Попълнете ги или запазете като „Чернова“.`,
      );
  }
  const propertyKey =
    previous?.id || Math.floor(Date.now() * 1000 + Math.random() * 1000);
  const syncedPrice = 0;
  if (previous) {
    const result = await env.DB.prepare(
      "UPDATE properties SET content_json=?,publication=?,status=?,sync_price=?,sync_status=?,needs_review=0,version=version+1,updated_at=? WHERE id=? AND version=?",
    )
      .bind(
        JSON.stringify(content),
        publication,
        status,
        syncedPrice,
        0,
        now(),
        propertyKey,
        Number(body.version),
      )
      .run();
    if (!result.meta.changes)
      throw new HttpError(
        409,
        "Имотът е променен междувременно. Презаредете, преди да записвате.",
      );
  } else
    await env.DB.prepare(
      "INSERT INTO properties(id,content_json,publication,status,sync_price,sync_status) VALUES (?,?,?,?,0,0)",
    )
      .bind(propertyKey, JSON.stringify(content), publication, status)
      .run();
  await audit(env, "property.save", propertyKey, publication);
  return editorProperty(await getProperty(env, propertyKey));
}
export function initialContent(l, detail = {}) {
  return {
    title: detail.title || l.title,
    type: l.type,
    place: l.place,
    region: l.region,
    regionKey: regionOf(l),
    price: l.price,
    rent: Boolean(l.rent),
    area: l.area,
    plotArea: l.plotArea,
    bedrooms: l.bedrooms,
    floors: l.floors,
    images: detail.images?.length ? detail.images : l.images || [],
    description: (detail.paragraphs || []).join("\n\n"),
    facts: {},
    contentReviewed: false,
    locationConfirmed: false,
  };
}
export async function importCatalogue(env, data) {
  if (!data.items?.length)
    throw new HttpError(502, "Празен импорт — запазваме каталога.");
  const timestamp = now(),
    seen = new Set();
  const statements = [];
  for (const l of data.items) {
    seen.add(l.id);
    statements.push(
      env.DB.prepare(
        `INSERT INTO properties(id,source_id,source_json,content_json,synced_at) VALUES (?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET source_json=excluded.source_json,synced_at=excluded.synced_at,source_missing=0,needs_review=CASE WHEN json_extract(properties.source_json,'$.price') IS NOT json_extract(excluded.source_json,'$.price') THEN 1 ELSE properties.needs_review END,status=CASE WHEN properties.sync_status=1 AND properties.source_missing>=2 AND properties.status='withdrawn' THEN 'active' ELSE properties.status END,version=properties.version+1,updated_at=excluded.synced_at`,
      ).bind(
        l.id,
        l.id,
        JSON.stringify(l),
        JSON.stringify(initialContent(l)),
        timestamp,
      ),
    );
  }
  for (let i = 0; i < statements.length; i += 50)
    await env.DB.batch(statements.slice(i, i + 50));
  const complete =
    (!data.failedPages || data.failedPages.length === 0) &&
    (!data.total || data.items.length >= data.total);
  if (complete) {
    const old = await env.DB.prepare(
      "SELECT id,source_id FROM properties WHERE source_id IS NOT NULL",
    ).all();
    for (const row of old.results) {
      if (seen.has(row.source_id)) continue;
      await env.DB.prepare(
        "UPDATE properties SET source_missing=source_missing+1,needs_review=1,status=CASE WHEN sync_status=1 AND source_missing>=1 THEN 'withdrawn' ELSE status END,version=version+1,updated_at=? WHERE id=?",
      )
        .bind(timestamp, row.id)
        .run();
    }
  }
  await env.DB.prepare(
    "INSERT INTO sync_runs(id,state,detail,created_at) VALUES (?,?,?,?)",
  )
    .bind(
      id(),
      complete ? "complete" : "partial",
      JSON.stringify({
        count: data.items.length,
        total: data.total,
        failedPages: data.failedPages || [],
      }),
      timestamp,
    )
    .run();
  return { count: data.items.length, complete };
}
export async function regions(env, includeDisabled = false) {
  const rows = env.DB
    ? await env.DB.prepare("SELECT * FROM regions ORDER BY position,key").all()
    : { results: [] };
  if (rows.results.length)
    return rows.results
      .map((r) => ({ key: r.key, ...parse(r.data_json) }))
      .filter((r) => includeDisabled || r.enabled !== false);
  return REGIONS.map((r, i) => ({
    key: r.key,
    name: REGION_NAMES[r.key],
    guide: {
      bg: "Разгледайте имотите в този район. За достъп, удобства и разстояния проверете информацията за конкретния имот или попитайте Никола.",
      en: "Browse properties in this area. For access, amenities and distances, check the individual property or ask Nikola.",
    },
    position: i,
    enabled: true,
  }));
}
export { distanceKm, nearby } from "../spatial.js";
export async function lead(env, data) {
  const leadId = id();
  await env.DB.prepare(
    "INSERT INTO leads(id,data_json,created_at) VALUES (?,?,?)",
  )
    .bind(leadId, JSON.stringify(data), now())
    .run();
  return leadId;
}
