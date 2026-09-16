import notes from '../data/property-notes.js';

export const BUYER_FACT_KEYS = ['access', 'yearRound', 'amenities', 'nearestTown'];

/** Both the page and AI consume exactly the same reviewed facts. */
export function buyerFacts(id, lang = 'bg', records = notes) {
  const record = Object.hasOwn(records, String(id)) ? records[String(id)] : null;
  return BUYER_FACT_KEYS.map((key) => {
    const fact = record?.[key];
    const localized = typeof fact?.text === 'object' ? fact.text[lang] || fact.text.bg : fact?.text;
    const reviewed = typeof fact?.reviewedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fact.reviewedAt)
      && Number.isFinite(Date.parse(fact.reviewedAt)) && Date.parse(fact.reviewedAt) <= Date.now();
    const valid = typeof localized === 'string' && localized.trim() && typeof fact?.source === 'string' && fact.source.trim() && reviewed;
    return { key, text: valid ? localized.trim() : null, source: valid ? fact.source.trim() : null, reviewedAt: valid ? fact.reviewedAt : null };
  });
}
