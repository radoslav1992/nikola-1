import { stripImageMetadata } from "./image-metadata.js";
import { HttpError, id, now } from "./http.js";
export async function uploadImage(request, env, propertyId) {
  if (!env.MEDIA)
    throw new HttpError(503, "Настройте R2 binding MEDIA за снимки.");
  if (
    !(await env.DB.prepare("SELECT id FROM properties WHERE id=?")
      .bind(propertyId)
      .first())
  )
    throw new HttpError(404, "Имотът не е намерен.");
  if (Number(request.headers.get("content-length")) > 8 * 1024 * 1024)
    throw new HttpError(413, "Снимката е над 8 MB.");
  let bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024 || bytes.length < 12)
    throw new HttpError(413, "Снимките трябва да са до 8 MB.");
  let mime, ext;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = "image/jpeg";
    ext = "jpg";
  } else if (bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10") {
    mime = "image/png";
    ext = "png";
  } else if (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    mime = "image/webp";
    ext = "webp";
  } else throw new HttpError(400, "Разрешени са JPEG, PNG и WebP.");
  try {
    bytes = stripImageMetadata(bytes, mime);
  } catch {
    throw new HttpError(400, "Повреден файл на снимка.");
  }
  const key = `${id()}.${ext}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
  await env.DB.prepare(
    "INSERT INTO media(key,property_id,mime,created_at) VALUES (?,?,?,?)",
  )
    .bind(key, propertyId, mime, now())
    .run();
  return { url: "/media/" + key };
}
export async function serveMedia(request, env, admin = false) {
  if (!env.DB || !env.MEDIA) return new Response("Not found", { status: 404 });
  const key = new URL(request.url).pathname.slice(7);
  if (!/^[\w.-]+$/.test(key)) return new Response("Not found", { status: 404 });
  const row = await env.DB.prepare(
    "SELECT m.*,p.publication,p.status,p.content_json FROM media m JOIN properties p ON p.id=m.property_id WHERE m.key=?",
  )
    .bind(key)
    .first();
  if (
    !row ||
    (!admin &&
      (row.publication !== "published" ||
        !["active", "reserved"].includes(row.status) ||
        !JSON.parse(row.content_json).images?.includes("/media/" + key)))
  )
    return new Response("Not found", { status: 404 });
  const file = await env.MEDIA.get(key);
  return file
    ? new Response(file.body, {
        headers: {
          "content-type": row.mime,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      })
    : new Response("Not found", { status: 404 });
}
