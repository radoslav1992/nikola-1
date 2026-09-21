import { publicCatalogue } from "./catalogue.js";
import { listingPath, imgUrl } from "../render/components.js";
import { esc } from "../render/html.js";

// Deliberate allowlist: never export a database row or source JSON wholesale.
function entry(listing, origin, prefix, lang) {
  return {
    id: listing.id,
    reference: listing.ref,
    language: lang,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    deal: listing.rent ? "rent" : "sale",
    status: listing.status,
    price_eur: listing.price ?? null,
    price_on_request: listing.price == null,
    location: {
      settlement: listing.place,
      region: listing.region,
      region_key: listing.regionKey,
      precision: "settlement_only",
    },
    area_m2: listing.area ?? null,
    plot_area_m2: listing.plotArea ?? null,
    bedrooms: listing.bedrooms ?? null,
    floors: listing.floors ?? null,
    facts: Object.fromEntries(
      Object.entries(listing.facts || {}).map(([key, fact]) => [
        key,
        { text: fact.text, reviewed_at: fact.reviewedAt },
      ]),
    ),
    images: listing.images.map(
      (file) => new URL(imgUrl(file, "big"), origin).href,
    ),
    updated_at: listing.updatedAt,
    url: `${origin}${prefix}${listingPath(listing)}`,
    details_url: `${origin}${prefix}/feeds/properties/${listing.id}.json`,
  };
}
const note = {
  bg: "Каталогът съдържа само публикувани активни или резервирани имоти. ID е вътрешният идентификатор за get_property, а reference е отделната референция на обявата. Проверете цена и наличност чрез get_property по ID преди препоръка: запазено копие на тази страница може да е остаряло. Липсващите данни са неизвестни, не отрицателен отговор. Локацията е населено място, не точен адрес.",
  en: "Only published active or reserved properties are included. ID is the internal identifier used by get_property; reference is the separate listing reference. Confirm price and availability with get_property using ID before recommending a property: a stored copy of this page may be outdated. Missing data means unknown, not a negative answer. Location identifies the settlement, never the exact address.",
};
const labels = {
  bg: [
    "Цена (EUR)",
    "Наличност",
    "Тип",
    "Сделка",
    "Населено място",
    "Област",
    "Площ (m²)",
    "Двор (m²)",
    "Спални",
    "Етажи",
    "Обновен",
  ],
  en: [
    "Price (EUR)",
    "Availability",
    "Type",
    "Transaction",
    "Settlement",
    "Region",
    "Area (m²)",
    "Plot area (m²)",
    "Bedrooms",
    "Floors",
    "Updated",
  ],
};
function facts(item, lang) {
  const unknown = lang === "en" ? "Not specified" : "Не е посочено";
  const values = [
    item.price_eur ?? (lang === "en" ? "On request" : "При запитване"),
    item.status,
    item.type,
    item.deal,
    item.location.settlement,
    item.location.region,
    item.area_m2,
    item.plot_area_m2,
    item.bedrooms,
    item.floors,
    item.updated_at,
  ];
  return labels[lang].map((label, i) => [label, values[i] ?? unknown]);
}
function description(item, lang) {
  return [
    `ID: ${item.id}`,
    `Reference: ${item.reference}`,
    ...facts(item, lang).map(([k, v]) => `${k}: ${v}`),
    "",
    item.description,
    "",
    ...Object.entries(item.facts).map(
      ([key, f]) => `${key}: ${f.text} (${f.reviewed_at})`,
    ),
    `Details: ${item.details_url}`,
  ].join("\n");
}
const xml = (value) =>
  esc(
    String(value ?? "").replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,
      "",
    ),
  );

export async function catalogueFeed(request, env, path, lang = "bg") {
  const headers = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, follow",
  };
  const reply = (body, type, status = 200, extra = {}) =>
    new Response(request.method === "HEAD" ? null : body, {
      status,
      headers: {
        ...headers,
        "content-type": `${type}; charset=utf-8`,
        ...extra,
      },
    });
  if (!["GET", "HEAD"].includes(request.method))
    return reply("Method not allowed", "text/plain", 405, {
      allow: "GET, HEAD",
    });
  if (!env.DB) return reply("Catalogue unavailable", "text/plain", 503);
  const origin = new URL(request.url).origin;
  const prefix = lang === "en" ? "/en" : "";
  const catalogue = await publicCatalogue(env, lang);
  const items = catalogue.items.map((listing) =>
    entry(listing, origin, prefix, lang),
  );
  const generatedAt = new Date().toISOString();
  const detail = path.match(/^\/feeds\/properties\/(\d+)\.json$/);
  if (detail) {
    const item = items.find((item) => item.id === Number(detail[1]));
    return item
      ? reply(
          JSON.stringify({ generated_at: generatedAt, ...item }),
          "application/json",
        )
      : reply(
          JSON.stringify({ error: "Property is not published or available" }),
          "application/json",
          404,
        );
  }
  if (path === "/feeds/properties.json")
    return reply(
      JSON.stringify({
        schema_version: 1,
        generated_at: generatedAt,
        language: lang,
        total: items.length,
        guidance: note[lang],
        items,
      }),
      "application/json",
    );
  if (path === "/feeds/properties.xml") {
    return reply(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:ni="urn:ni-imoti:property"><channel>
<title>НИ Имоти — ${lang === "en" ? "Property catalogue" : "Каталог с имоти"}</title><link>${xml(origin + prefix + "/agent/catalog")}</link><description>${xml(note[lang])}</description><language>${lang}</language><lastBuildDate>${new Date(generatedAt).toUTCString()}</lastBuildDate>
${items.map((item) => `<item><guid isPermaLink="false">urn:ni-imoti:property:${item.id}</guid><title>${xml(item.title)}</title><link>${xml(item.url)}</link><description>${xml(description(item, lang))}</description><ni:id>${item.id}</ni:id><ni:location>${xml(item.location.settlement)}</ni:location><ni:status>${xml(item.status)}</ni:status>${item.price_eur == null ? "" : `<ni:price currency="EUR">${xml(item.price_eur)}</ni:price>`}<ni:details>${xml(item.details_url)}</ni:details><ni:updated>${xml(item.updated_at)}</ni:updated></item>`).join("\n")}
</channel></rss>`,
      "application/rss+xml",
    );
  }
  const title =
    lang === "en"
      ? "NI Imoti — property catalogue"
      : "НИ Имоти — каталог с имоти";
  return reply(
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="alternate" type="application/rss+xml" href="${prefix}/feeds/properties.xml"><link rel="alternate" type="application/json" href="${prefix}/feeds/properties.json"><style>body{font:16px/1.65 system-ui,sans-serif;color:#203a30;max-width:880px;margin:auto;padding:32px 20px;background:#fafcf9}header,article{padding:24px;background:white;border:1px solid #dde7df;border-radius:16px;margin-bottom:20px}h1,h2{line-height:1.25}a{color:#12694f}pre{white-space:pre-wrap;font:inherit;overflow-wrap:anywhere}dt{font-weight:600}dd{margin:0 0 8px}nav{display:flex;gap:20px;flex-wrap:wrap}</style></head><body><header><h1>${title}</h1><p>${esc(note[lang])}</p><p>${lang === "en" ? "Properties" : "Имоти"}: ${items.length} · ${esc(generatedAt)}</p><nav><a href="${prefix}/feeds/properties.json">JSON</a><a href="${prefix}/feeds/properties.xml">RSS</a><a href="${lang === "en" ? "" : "/en"}/agent/catalog">${lang === "en" ? "Български" : "English"}</a></nav></header><main>
${
  items.length
    ? items
        .map(
          (item) =>
            `<article id="property-${item.id}"><h2>${esc(item.title)}</h2><p>ID: <strong>${item.id}</strong> · Reference: ${esc(item.reference)}</p><dl>${facts(
              item,
              lang,
            )
              .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
              .join(
                "",
              )}</dl><pre>${esc(item.description)}</pre>${Object.entries(
              item.facts,
            )
              .map(
                ([k, f]) =>
                  `<p><strong>${esc(k)}:</strong> ${esc(f.text)} (${esc(f.reviewed_at)})</p>`,
              )
              .join(
                "",
              )}<nav><a href="${esc(item.url)}">${lang === "en" ? "Property page" : "Страница на имота"}</a><a href="${esc(item.details_url)}">JSON · ID ${item.id}</a></nav></article>`,
        )
        .join("\n")
    : `<p>${lang === "en" ? "No published properties currently available." : "В момента няма публикувани налични имоти."}</p>`
}
</main></body></html>`,
    "text/html",
  );
}
