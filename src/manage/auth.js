import { HttpError, json, bodyJSON, sameOrigin, rateLimit } from "./http.js";
const enc = new TextEncoder();
export const hex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
export function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export async function verifyPassword(password, encoded) {
  const [version, salt, expected] = String(encoded || "").split(":");
  if (version !== "pbkdf2" || !salt || !expected) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return equal(
    hex(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: enc.encode(salt),
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        256,
      ),
    ),
    expected,
  );
}
export async function isAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET || !env.ADMIN_PASSWORD_HASH) return false;
  const cookie =
    request.headers.get("cookie")?.match(/(?:^|;\s*)ni_admin=([^;]+)/)?.[1] ||
    "";
  const [expiry, nonce, sig] = cookie.split(".");
  if (
    !expiry ||
    !nonce ||
    !sig ||
    Number(expiry) < Date.now() ||
    Number(expiry) > Date.now() + 13 * 3600000
  )
    return false;
  return equal(
    sig,
    await hmac(
      env.ADMIN_SESSION_SECRET,
      `${expiry}.${nonce}.${env.ADMIN_PASSWORD_HASH}`,
    ),
  );
}
export async function requireAdmin(request, env) {
  if (!(await isAdmin(request, env)))
    throw new HttpError(401, "Влезте в админ панела.");
  if (!["GET", "HEAD"].includes(request.method)) sameOrigin(request);
}
export async function login(request, env) {
  sameOrigin(request);
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET)
    throw new HttpError(
      503,
      "Настройте ADMIN_PASSWORD_HASH и ADMIN_SESSION_SECRET.",
    );
  await rateLimit(env, request, "login", 5, 900);
  const body = await bodyJSON(request, 4000);
  if (
    !(await verifyPassword(
      String(body.password || ""),
      env.ADMIN_PASSWORD_HASH,
    ))
  )
    throw new HttpError(401, "Невалидна парола.");
  const expiry = Date.now() + 12 * 3600000,
    nonce = crypto.randomUUID();
  const sig = await hmac(
    env.ADMIN_SESSION_SECRET,
    `${expiry}.${nonce}.${env.ADMIN_PASSWORD_HASH}`,
  );
  return json({ ok: true }, 200, {
    "set-cookie": `ni_admin=${expiry}.${nonce}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,
  });
}
export const logout = () =>
  json({ ok: true }, 200, {
    "set-cookie":
      "ni_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
  });
