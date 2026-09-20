import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { adminPage, adminApi } from "../src/manage/admin.js";
import { database, source } from "./db-helper.js";
import {
  importCatalogue,
  getProperty,
  parse,
} from "../src/manage/catalogue.js";
import { hmac } from "../src/manage/auth.js";
import { HttpError } from "../src/manage/http.js";
const tick = async (fn) => {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw Error("UI did not reach expected state");
};
test("source import fills missing title for review and preserves a broker-written title", async (t) => {
  const env = {
    DB: database(),
    ADMIN_SESSION_SECRET: "secret",
    ADMIN_PASSWORD_HASH: "hash",
  };
  t.after(() => env.DB.close());
  await importCatalogue(env, { items: [{ ...source, title: "" }], total: 1 });
  const expiry = Date.now() + 3600000;
  const cookie = `ni_admin=${expiry}.nonce.${await hmac("secret", `${expiry}.nonce.hash`)}`;
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        "<html><h1>Къща от източника</h1><h2>Описание</h2><p>Пълно описание на имота с подробности за площта, двора и разпределението. Това е информация за преглед от брокера преди публикуване.</p><footer></footer></html>",
        { headers: { "content-type": "text/html; charset=utf-8" } },
      ),
  );
  const dom = new JSDOM(await adminPage().text(), {
    url: "https://niimoti.com/admin",
    runScripts: "outside-only",
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.confirm = () => true;
  w.fetch = async (path, opt = {}) =>
    adminApi(
      new Request(new URL(path, w.location.href), {
        ...opt,
        headers: { ...opt.headers, cookie, origin: "https://niimoti.com" },
      }),
      env,
      {},
    );
  w.eval(readFileSync(new URL("../public/admin.js", import.meta.url), "utf8"));
  const $ = (s) => w.document.querySelector(s);
  await tick(() => $('[data-edit="101"]'));
  $('[data-edit="101"]').click();
  await tick(() => $("#import-detail"));
  $("#import-detail").click();
  await tick(
    () =>
      $("[name=title]").value === "Къща от източника" &&
      !$("#import-detail").disabled,
  );
  assert.ok($("[name=description]").value.includes("Пълно описание"));
  assert.equal(parse((await getProperty(env, 101)).content_json).title, "");
  $("[name=title]").value = "Мое заглавие";
  $("#import-detail").click();
  await tick(() => !$("#import-detail").disabled);
  assert.equal($("[name=title]").value, "Мое заглавие");
});
test("broker UI creates and saves a property, edits knowledge, manages slots and persists settings", async () => {
  const env = {
      DB: database(),
      ADMIN_SESSION_SECRET: "secret",
      ADMIN_PASSWORD_HASH: "hash",
    },
    expiry = Date.now() + 3600000,
    nonce = "nonce";
  const cookie = `ni_admin=${expiry}.${nonce}.${await hmac("secret", `${expiry}.${nonce}.hash`)}`;
  const dom = new JSDOM(await adminPage().text(), {
      url: "https://niimoti.com/admin",
      runScripts: "outside-only",
    }),
    w = dom.window;
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.fetch = async (path, opt = {}) => {
    const request = new Request(new URL(path, w.location.href), {
      ...opt,
      headers: { ...opt.headers, cookie, origin: "https://niimoti.com" },
    });
    try {
      return await adminApi(request, env, {}, async () => ({ items: [] }));
    } catch (e) {
      return Response.json(
        { error: e.message },
        { status: e instanceof HttpError ? e.status : 500 },
      );
    }
  };
  w.eval(readFileSync(new URL("../public/admin.js", import.meta.url), "utf8"));
  const $ = (s) => w.document.querySelector(s),
    input = (form, key, value) => (form.elements.namedItem(key).value = value),
    submit = (f) =>
      f.dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
  await tick(() => $("#new-property"));
  $("#new-property").click();
  await tick(() => $("#property"));
  input($("#property"), "title", "Нова къща");
  input($("#property"), "place", "с. Кръвеник");
  submit($("#property"));
  await tick(() => $("#editor-status").textContent === "Запазено.");
  assert.ok(
    (
      await env.DB.prepare("SELECT content_json FROM properties").first()
    ).content_json.includes("Нова къща"),
  );
  $("[data-tab=knowledge]").click();
  await tick(() => $("#knowledge"));
  input($("#knowledge"), "title", "Проверен документ");
  input(
    $("#knowledge"),
    "body",
    "Уговорките за оглед се потвърждават предварително.",
  );
  submit($("#knowledge"));
  await tick(() => $("#status").textContent === "Документът е запазен.").catch(
    (e) => {
      throw Error(e.message + " " + $("#status").textContent);
    },
  );
  assert.equal(
    (await env.DB.prepare("SELECT title FROM knowledge").first()).title,
    "Проверен документ",
  );
  $("[data-knowledge]").click();
  input($("#knowledge"), "body", "Редактирано съдържание.");
  submit($("#knowledge"));
  await tick(
    () => $("#content .pre")?.textContent === "Редактирано съдържание.",
  );
  assert.equal(
    (await env.DB.prepare("SELECT body FROM knowledge").first()).body,
    "Редактирано съдържание.",
  );
  $("[data-tab=calendar]").click();
  await tick(() => $("#slot"));
  const start = new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    end = new Date(Date.now() + 90000000).toISOString().slice(0, 16);
  input($("#slot"), "starts_at", start);
  input($("#slot"), "ends_at", end);
  submit($("#slot"));
  await tick(() => $("#status").textContent === "Часът е добавен.");
  assert.equal(
    (await env.DB.prepare("SELECT count(*) AS n FROM slots").first()).n,
    1,
  );
  $("[data-tab=settings]").click();
  await tick(() => $("#settings"));
  input($("#settings"), "phone", "+359884128117");
  submit($("#settings"));
  await tick(() => $("#status").textContent.startsWith("Запазено."));
  assert.ok(
    (
      await env.DB.prepare(
        "SELECT value FROM settings WHERE key='site'",
      ).first()
    ).value.includes("+359884128117"),
  );
  dom.window.close();
});
