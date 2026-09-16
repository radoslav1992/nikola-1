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
export function nearby(items, place, radius = 20) {
  const origin = lookupPlace(place);
  if (!origin) return [];
  return items
    .filter((l) => !/^близо до|^near /i.test(l.place))
    .map((l) => ({ l, c: lookupPlace(l.place, l.region) }))
    .filter((x) => x.c)
    .map((x) => ({
      ...x.l,
      distanceKm: Math.round(distanceKm(origin, x.c) * 10) / 10,
    }))
    .filter((l) => l.distanceKm <= radius)
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
