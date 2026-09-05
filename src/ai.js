/**
 * AI helpers backed by Workers AI (binding `AI`). Everything degrades to a keyword search
 * when the binding is missing or the model call fails, so the site never depends on it.
 */
import { heuristicSearch, summarize } from './catalog.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

async function runModel(env, messages, { json = false, maxTokens = 600 } = {}) {
  if (!env?.AI?.run) throw new Error('AI binding not configured');
  const res = await env.AI.run(MODEL, {
    messages,
    max_tokens: maxTokens,
    temperature: 0.2,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  const text = typeof res === 'string' ? res : res?.response ?? res?.result?.response ?? '';
  return String(text).trim();
}

function langName(lang) {
  return lang === 'en' ? 'English' : 'Bulgarian';
}

/** Free-text property search → { ids, answer, source } */
export async function searchListings(env, items, query, lang) {
  const fallback = () => {
    const h = heuristicSearch(items, query);
    return { ids: h.items.map((l) => l.id), answer: '', source: 'keyword' };
  };
  try {
    const catalog = items.map(summarize).join('\n');
    const sys = `You are the search assistant for niimoti.com, the website of Bulgarian real-estate agent Nikola Ivanov (Veliko Tarnovo). You receive the full catalogue of his current listings (one per line, starting with #id) and a buyer's request. Pick the listings that best match the request (up to 6, best first). Prices are in EUR; "наем" means monthly rent. Be strict about hard constraints like max price, rent vs sale and property type; be flexible about location wording (a village "близо до" a town counts as that town's area). Respond ONLY with JSON: {"ids":[123,456],"answer":"one or two short sentences in ${langName(lang)} explaining the picks or, if nothing fits, what is closest"}.`;
    const out = await runModel(env, [
      { role: 'system', content: sys },
      { role: 'user', content: `CATALOGUE:\n${catalog}\n\nREQUEST: ${query}` },
    ], { json: true, maxTokens: 400 });
    const parsed = safeJson(out);
    const valid = new Set(items.map((l) => l.id));
    const ids = Array.isArray(parsed?.ids) ? parsed.ids.map(Number).filter((id) => valid.has(id)).slice(0, 6) : [];
    if (!ids.length) {
      const fb = fallback();
      return { ...fb, answer: typeof parsed?.answer === 'string' ? parsed.answer : '' };
    }
    return { ids, answer: typeof parsed?.answer === 'string' ? parsed.answer.slice(0, 500) : '', source: 'ai' };
  } catch {
    return fallback();
  }
}

/** Question about a single property → { answer, source } */
export async function askAboutListing(env, listing, detail, question, lang) {
  const facts = [summarize(listing), ...(detail?.features || []).map((f) => `${f.label}: ${f.value}`)].join('\n');
  const description = (detail?.paragraphs || []).join('\n\n');
  try {
    const sys = `You are an assistant on niimoti.com answering questions about ONE property listed by Bulgarian real-estate agent Nikola Ivanov. Use only the facts and description provided. If the information is not in the listing, say so briefly and suggest contacting Nikola (phone ${'+359 882 638 423'}). For general Bulgarian property-buying questions (taxes, fees, process) you may answer from general knowledge, clearly marked as general guidance: typical buyer costs are ~3% municipal transfer tax (varies by municipality), notary and registration fees, and agency commission — advise confirming with Nikola. Answer in ${langName(lang)}, in at most 120 words, plain text, no markdown.`;
    const answer = await runModel(env, [
      { role: 'system', content: sys },
      { role: 'user', content: `FACTS:\n${facts}\n\nDESCRIPTION:\n${description || '(no description available)'}\n\nQUESTION: ${question}` },
    ], { maxTokens: 300 });
    if (!answer) throw new Error('empty');
    return { answer: answer.slice(0, 1200), source: 'ai' };
  } catch {
    return {
      answer: lang === 'en'
        ? 'The assistant is not available right now. Please call or message Nikola directly — he knows this property personally.'
        : 'Асистентът не е наличен в момента. Моля, обадете се или пишете директно на Никола — той познава имота лично.',
      source: 'fallback',
    };
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* ignore */ }
    }
    return null;
  }
}
