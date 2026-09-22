import { initialContent, parse } from "./catalogue.js";
import { HttpError, now, id } from "./http.js";

// Conservative: keep every draft with edits, notes, uploaded media or bookings.
function untouched(row) {
  if (!row.source_id || row.publication !== "draft" || row.used) return false;
  const content = parse(row.content_json),
    initial = initialContent(parse(row.source_json));
  const keys = new Set([...Object.keys(content), ...Object.keys(initial)]);
  return [...keys].every(
    (key) => JSON.stringify(content[key]) === JSON.stringify(initial[key]),
  );
}
export async function standalonePreview(env) {
  const { results } = await env.DB.prepare(
    `SELECT p.*,
    (EXISTS(SELECT 1 FROM media WHERE property_id=p.id)
     OR EXISTS(SELECT 1 FROM appointments WHERE property_id=p.id)
     OR EXISTS(SELECT 1 FROM notes WHERE entity_type='property' AND entity_id=CAST(p.id AS TEXT))) AS used
    FROM properties p`,
  ).all();
  return {
    candidates: results.filter(untouched).map((r) => ({
      id: r.id,
      version: r.version,
      title: parse(r.content_json).title || String(r.id),
    })),
    preserved: results.filter(
      (r) => !untouched(r) && r.publication !== "archived",
    ).length,
  };
}
export async function archiveImportedDrafts(env, requested) {
  if (
    !Array.isArray(requested) ||
    requested.length > 1000 ||
    requested.some(
      (r) =>
        !r || !Number.isSafeInteger(r.id) || !Number.isSafeInteger(r.version),
    )
  )
    throw new HttpError(400, "Невалиден списък.");
  const preview = await standalonePreview(env);
  const allowed = new Map(preview.candidates.map((r) => [r.id, r.version]));
  if (requested.some((r) => allowed.get(r.id) !== r.version))
    throw new HttpError(
      409,
      "Каталогът е променен. Прегледайте списъка отново.",
    );
  if (!requested.length) return { archived: 0 };
  const result = await env.DB.batch([
    ...requested.map((r) =>
      env.DB.prepare(
        "UPDATE properties SET publication='archived',sync_price=0,sync_status=0,version=version+1,updated_at=? WHERE id=? AND version=? AND publication='draft' AND NOT EXISTS(SELECT 1 FROM media WHERE property_id=properties.id) AND NOT EXISTS(SELECT 1 FROM appointments WHERE property_id=properties.id) AND NOT EXISTS(SELECT 1 FROM notes WHERE entity_type='property' AND entity_id=CAST(properties.id AS TEXT))",
      ).bind(now(), r.id, r.version),
    ),
    env.DB.prepare(
      "INSERT INTO audit_log(id,action,detail,created_at) VALUES (?,?,?,?)",
    ).bind(
      id(),
      "catalogue.archive_imported_drafts",
      JSON.stringify(requested.map((r) => r.id)),
      now(),
    ),
  ]);
  return {
    archived: result.slice(0, -1).reduce((n, r) => n + r.meta.changes, 0),
  };
}
