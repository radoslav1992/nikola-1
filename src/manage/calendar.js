import { HttpError, clean, id, now, audit } from "./http.js";
export async function availableSlots(env, from = now()) {
  return (
    await env.DB.prepare(
      "SELECT id,starts_at,ends_at FROM slots WHERE state='open' AND starts_at>=? AND starts_at<=? ORDER BY starts_at LIMIT 60",
    )
      .bind(from, new Date(Date.now() + 60 * 86400000).toISOString())
      .all()
  ).results;
}
export async function createSlot(env, body) {
  const starts = new Date(body.starts_at),
    ends = new Date(body.ends_at);
  if (
    !Number.isFinite(+starts) ||
    !Number.isFinite(+ends) ||
    starts <= new Date() ||
    ends <= starts ||
    ends - starts > 8 * 3600000
  )
    throw new HttpError(400, "Невалиден бъдещ час или продължителност.");
  try {
    await env.DB.prepare(
      "INSERT INTO slots(id,starts_at,ends_at,state) VALUES (?,?,?,?)",
    )
      .bind(
        id(),
        starts.toISOString(),
        ends.toISOString(),
        body.blocked ? "blocked" : "open",
      )
      .run();
  } catch {
    throw new HttpError(409, "Има застъпващ се час.");
  }
  await audit(env, "calendar.slot");
  return { ok: true };
}
export async function book(env, body) {
  const name = clean(body.name, 120),
    contact = clean(body.contact, 160),
    slot = clean(body.slot_id, 100),
    property = Number(body.property_id) || null;
  if (!name || !contact || !slot || body.confirmed !== true)
    throw new HttpError(
      400,
      "Нужни са име, контакт, час и изрично потвърждение.",
    );
  if (
    property &&
    !(await env.DB.prepare(
      "SELECT id FROM properties WHERE id=? AND publication='published' AND status='active'",
    )
      .bind(property)
      .first())
  )
    throw new HttpError(400, "Имотът не е наличен за оглед.");
  const appointmentId = id();
  try {
    await env.DB.prepare(
      "INSERT INTO appointments(id,slot_id,property_id,name,contact,message,conversation_id,created_at) VALUES (?,?,?,?,?,?,?,?)",
    )
      .bind(
        appointmentId,
        slot,
        property,
        name,
        contact,
        clean(body.message, 3000),
        clean(body.conversation_id, 100) || null,
        now(),
      )
      .run();
  } catch (e) {
    if (/slot_unavailable|UNIQUE/.test(e.message))
      throw new HttpError(409, "Часът вече е зает. Изберете друг.");
    throw e;
  }
  return {
    ok: true,
    appointment_id: appointmentId,
    slot: await env.DB.prepare("SELECT starts_at,ends_at FROM slots WHERE id=?")
      .bind(slot)
      .first(),
    timezone: "Europe/Sofia",
  };
}
export async function cancelAppointment(env, appointmentId) {
  const result = await env.DB.prepare(
    "UPDATE appointments SET status='cancelled' WHERE id=? AND status='confirmed'",
  )
    .bind(appointmentId)
    .run();
  if (!result.meta.changes)
    throw new HttpError(404, "Активният оглед не е намерен.");
  await audit(env, "appointment.cancel", appointmentId);
  return { ok: true };
}
export function icsCalendar(rows) {
  const esc = (s) =>
    String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const date = (s) => s.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NI Imoti//Calendar//BG",
    ...rows
      .filter((r) => r.status === "confirmed")
      .flatMap((r) => [
        "BEGIN:VEVENT",
        `UID:${r.id}@niimoti.com`,
        `DTSTAMP:${date(now())}`,
        `DTSTART:${date(r.starts_at)}`,
        `DTEND:${date(r.ends_at)}`,
        `SUMMARY:${esc("Оглед: " + r.name)}`,
        `DESCRIPTION:${esc(r.contact + "\n" + r.message)}`,
        "END:VEVENT",
      ]),
    "END:VCALENDAR",
  ].join("\r\n");
}
