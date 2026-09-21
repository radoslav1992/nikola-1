import { lookupPlace, PLACES } from "./geo.js";
import { transliterate } from "./render/i18n.js";
export function distanceKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
const normalizedPlace = (value) =>
  transliterate(String(value || ""))
    .toLowerCase()
    .trim()
    .replace(/^(?:gr\.|s\.|town of|village of)\s*/, "")
    .replace(/\s+/g, " ");
const settlement = (value) =>
  Object.keys(PLACES).find(
    (name) =>
      !name.includes("област") &&
      normalizedPlace(name) === normalizedPlace(value),
  );

// Explicit listing distances are useful even when the village is undisclosed.
// Never turn "near X" into X's coordinates or infer distances to other towns.
function reportedDistance(listing, town) {
  const evidence = [
    listing.place,
    listing.title,
    listing.facts?.nearestTown?.text,
  ];
  const hits = [];
  const name = normalizedPlace(town).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?<![\\d.,])([0-9]+(?:[.,][0-9]+)?)\\s*(?:km|км)\\.?\\s+(?:ot|from)\\s+(?:(?:gr\\.|s\\.|town of|village of)\\s*)?${name}(?![a-z])`,
    "g",
  );
  for (const raw of evidence.filter(Boolean)) {
    const text = transliterate(raw).toLowerCase();
    for (const match of text.matchAll(pattern)) {
      // Do not misread the upper/lower end of a range or a lower bound.
      const prefix = text.slice(0, match.index).trimEnd();
      if (
        /(?:[\d.,]\s*(?:[-–—]|do|to|i|and)|\b(?:nad|poveche ot|over|more than|between))\s*$/.test(
          prefix,
        )
      )
        continue;
      hits.push({ km: Number(match[1].replace(",", ".")), evidence: raw });
    }
  }
  if (!hits.length || new Set(hits.map((x) => x.km)).size !== 1) return null;
  return {
    distanceKm: hits[0].km,
    distanceSource: "listing_reported",
    distanceReference: town,
    distanceEvidence: hits[0].evidence,
  };
}
export function nearby(items, place, radius = 20) {
  const town = settlement(place);
  const origin = town && lookupPlace(town);
  if (!origin) return [];
  return items
    .map((l) => {
      const actualTown = settlement(l.place);
      const coords = actualTown && lookupPlace(actualTown);
      const distance = coords
        ? {
            distanceKm: distanceKm(origin, coords),
            distanceSource: "settlement_centres",
            distanceReference: town,
          }
        : reportedDistance(l, town);
      return distance ? { ...l, ...distance } : null;
    })
    .filter((l) => l && l.distanceKm <= radius)
    .map((l) => ({ ...l, distanceKm: Math.round(l.distanceKm * 10) / 10 }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
export function proximityQuery(query) {
  const q =
    " " +
    transliterate(query)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ") +
    " ";
  if (!/\b(near|around|blizo|okolo)\b/.test(q)) return "";
  return (
    Object.keys(PLACES)
      .sort((a, b) => b.length - a.length)
      .find((p) => q.includes(" " + transliterate(p).toLowerCase() + " ")) || ""
  );
}
