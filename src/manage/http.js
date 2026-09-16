export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
export function requireDB(env) {
  if (!env.DB)
    throw new HttpError(
      503,
      "Базата не е настроена. Следвайте docs/DEPLOYMENT.md.",
    );
}
export async function bodyJSON(request, max = 250000) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "Твърде голяма заявка.");
  const text = await request.text();
  if (text.length > max) throw new HttpError(413, "Твърде голяма заявка.");
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw 0;
    return value;
  } catch {
    throw new HttpError(400, "Невалидни данни.");
  }
}
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const clean = (value, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    throw new HttpError(403, "Невалиден произход на заявката.");
}
export async function audit(env, action, entity = "", detail = "") {
  await env.DB.prepare(
    "INSERT INTO audit_log (id,action,entity_id,detail,created_at) VALUES (?,?,?,?,?)",
  )
    .bind(id(), action, String(entity), detail.slice(0, 1000), now())
    .run();
}
export async function rateLimit(env, request, scope, limit = 30, seconds = 60) {
  requireDB(env);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const raw = new TextEncoder().encode(scope + ":" + ip);
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", raw)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const time = Math.floor(Date.now() / 1000);
  const key = `${scope}:${hash}:${Math.floor(time / seconds)}`;
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(key, time + seconds)
    .first();
  if (row.count > limit)
    throw new HttpError(429, "Твърде много опити. Опитайте по-късно.");
}
