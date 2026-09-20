import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { unstable_splitSqlQuery } from "wrangler";

const sql = readFileSync(
  new URL("../migrations/0001_managed_catalog.sql", import.meta.url),
  "utf8",
);
const statements = unstable_splitSqlQuery(sql);
function migrate(db) {
  for (const statement of statements) db.prepare(statement).run();
}

test("migration survives partial console setup and repeated application without losing data", () => {
  const db = new DatabaseSync(":memory:");
  try {
    for (const statement of statements.filter(
      (s) => !s.startsWith("CREATE TRIGGER"),
    )) {
      db.prepare(statement).run();
    }
    db.prepare(
      "INSERT INTO properties (source_id,content_json) VALUES (123,?)",
    ).run('{"title":"Keep this draft"}');
    migrate(db);
    migrate(db);
    assert.equal(
      db
        .prepare("SELECT content_json FROM properties WHERE source_id=123")
        .get().content_json,
      '{"title":"Keep this draft"}',
    );
    assert.deepEqual(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name",
        )
        .all()
        .map((r) => r.name),
      ["prevent_slot_overlap", "reopen_slot", "reserve_slot"],
    );
  } finally {
    db.close();
  }
});

test("database guards reject unavailable slots and roll back failed reservations", () => {
  const db = new DatabaseSync(":memory:");
  try {
    migrate(db);
    const slot = db.prepare(
      "INSERT INTO slots (id,starts_at,ends_at,state) VALUES (?,?,?,?)",
    );
    const booking = db.prepare(
      "INSERT INTO appointments (id,slot_id,name,contact,created_at) VALUES (?,?,'Buyer','test@example.com','2099-01-01')",
    );
    for (const [id, day, state] of [
      ["open", "2099-01-01", "open"],
      ["blocked", "2099-01-02", "blocked"],
      ["past", "2000-01-01", "open"],
      ["other", "2099-01-03", "open"],
    ]) {
      slot.run(id, `${day}T10:00:00.000Z`, `${day}T11:00:00.000Z`, state);
    }
    for (const id of ["missing", "blocked", "past"]) {
      assert.throws(() => booking.run(id, id), /slot_unavailable/);
    }
    booking.run("first", "open");
    assert.equal(
      db.prepare("SELECT state FROM slots WHERE id='open'").get().state,
      "booked",
    );
    assert.throws(() => booking.run("second", "open"), /slot_unavailable/);
    assert.throws(() => booking.run("first", "other"), /UNIQUE/);
    assert.equal(
      db.prepare("SELECT state FROM slots WHERE id='other'").get().state,
      "open",
    );
    db.exec("UPDATE appointments SET status='cancelled' WHERE id='first'");
    booking.run("replacement", "open");
    assert.throws(
      () =>
        slot.run(
          "overlap",
          "2099-01-01T10:30:00.000Z",
          "2099-01-01T11:30:00.000Z",
          "open",
        ),
      /slot_overlap/,
    );
    slot.run(
      "adjacent",
      "2099-01-01T11:00:00.000Z",
      "2099-01-01T12:00:00.000Z",
      "open",
    );
  } finally {
    db.close();
  }
});
