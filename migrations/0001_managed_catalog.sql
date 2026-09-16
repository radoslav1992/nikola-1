PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS properties (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 source_id INTEGER UNIQUE,
 source_json TEXT NOT NULL DEFAULT '{}',
 content_json TEXT NOT NULL DEFAULT '{}',
 publication TEXT NOT NULL DEFAULT 'draft' CHECK(publication IN ('draft','published','archived')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','reserved','sold','withdrawn')),
 sync_price INTEGER NOT NULL DEFAULT 1,
 sync_status INTEGER NOT NULL DEFAULT 1,
 source_missing INTEGER NOT NULL DEFAULT 0,
 needs_review INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 synced_at TEXT
);
CREATE INDEX IF NOT EXISTS properties_published ON properties(publication,status);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS regions (key TEXT PRIMARY KEY, data_json TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS notes_entity ON notes(entity_type,entity_id);
CREATE TABLE IF NOT EXISTS slots (id TEXT PRIMARY KEY, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','booked','blocked')), UNIQUE(starts_at));
CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, slot_id TEXT NOT NULL REFERENCES slots(id), property_id INTEGER REFERENCES properties(id), name TEXT NOT NULL, contact TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', conversation_id TEXT, status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS reserve_slot BEFORE INSERT ON appointments BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM slots WHERE id=NEW.slot_id AND state='open' AND starts_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')) THEN RAISE(ABORT,'slot_unavailable') END;
 UPDATE slots SET state='booked' WHERE id=NEW.slot_id;
END;
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', transcript_json TEXT NOT NULL DEFAULT '[]', metadata_json TEXT NOT NULL DEFAULT '{}', occurred_at TEXT NOT NULL, received_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, received_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS knowledge (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_id TEXT, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sync_runs (id TEXT PRIMARY KEY, state TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot ON appointments(slot_id) WHERE status='confirmed';
CREATE TRIGGER IF NOT EXISTS reopen_slot AFTER UPDATE OF status ON appointments WHEN NEW.status='cancelled' AND OLD.status='confirmed' BEGIN
 UPDATE slots SET state='open' WHERE id=NEW.slot_id;
END;
CREATE TRIGGER IF NOT EXISTS prevent_slot_overlap BEFORE INSERT ON slots BEGIN
 SELECT CASE WHEN EXISTS (SELECT 1 FROM slots WHERE starts_at < NEW.ends_at AND ends_at > NEW.starts_at) THEN RAISE(ABORT,'slot_overlap') END;
END;
CREATE TABLE IF NOT EXISTS media (key TEXT PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id), mime TEXT NOT NULL, created_at TEXT NOT NULL);
