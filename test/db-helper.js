import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
export function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../migrations/0001_managed_catalog.sql", import.meta.url),
      "utf8",
    ),
  );
  class Statement {
    constructor(sql, args = []) {
      this.sql = sql;
      this.args = args;
    }
    bind(...args) {
      return new Statement(this.sql, args);
    }
    async first(column) {
      const r = sqlite.prepare(this.sql).get(...this.args) || null;
      return column ? r?.[column] : r;
    }
    async all() {
      return { results: sqlite.prepare(this.sql).all(...this.args) };
    }
    async run() {
      const r = sqlite.prepare(this.sql).run(...this.args);
      return {
        meta: {
          changes: Number(r.changes),
          last_row_id: Number(r.lastInsertRowid),
        },
        success: true,
      };
    }
  }
  return {
    prepare: (sql) => new Statement(sql),
    batch: async (statements) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
    close: () => sqlite.close(),
  };
}
export const content = {
  title: "Къща в Кръвеник",
  titleEn: "House in Kravenik",
  type: "Къща",
  place: "с. Кръвеник",
  region: "Габровска област",
  regionKey: "sevlievo",
  description:
    "Пълно описание на къщата.\n\nВтори абзац с проверени подробности.",
  descriptionEn:
    "Full description of the house.\n\nA second paragraph with verified details.",
  price: 45000,
  area: 100,
  images: ["123T101_1.jpg"],
  locationConfirmed: true,
  contentReviewed: true,
  privateAddress: "SECRET_ADDRESS",
  privateNotes: "SECRET_NOTES",
  facts: {
    access: {
      text: "Асфалтов път",
      textEn: "Paved road",
      source: "Посещение",
      reviewedAt: "2026-01-01",
    },
  },
};
export const source = {
  id: 101,
  ref: "REF101",
  title: "Source house",
  type: "Къща",
  place: "с. Кръвеник",
  region: "Габровска област",
  price: 50000,
  coords: { lat: 42.84449999, lng: 25.00519999, approx: false },
  images: ["123T101_1.jpg"],
  url: "https://www.suprimmo.bg/imot-101.html",
};
