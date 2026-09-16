import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
const bundle = await build({
  entryPoints: ["src/client/assistant.js"],
  bundle: true,
  write: false,
  format: "iife",
  plugins: [
    {
      name: "mock-conversation",
      setup(b) {
        b.onResolve({ filter: /^@elevenlabs\/client$/ }, () => ({
          path: "sdk",
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            "export const Conversation = { startSession: options => window.fakeSession(options) };",
        }));
      },
    },
  ],
});
const until = async (fn) => {
  for (let i = 0; i < 60; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw Error("Assistant did not reach expected state");
};
test("assistant requires explicit mode selection, passes property context, shows matches and ends on close", async () => {
  const dom = new JSDOM(
      '<html lang="bg"><body><form data-agent-ask><input name="q" value="Какъв е достъпът?"></form></body></html>',
      { url: "https://niimoti.com/imot/101/house", runScripts: "outside-only" },
    ),
    w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let options = null,
    ended = false,
    sent = [],
    requests = [];
  w.fakeSession = async (o) => {
    options = o;
    return {
      sendUserMessage: (m) => sent.push(m),
      endSession: async () => {
        ended = true;
        o.onDisconnect();
      },
    };
  };
  w.fetch = async (path, opt = {}) => {
    requests.push({ path, body: opt.body ? JSON.parse(opt.body) : null });
    if (path.includes("/config"))
      return Response.json({
        enabled: true,
        notice: "Предварително съобщение",
        phone: "+359884128117",
      });
    if (path.includes("/session"))
      return Response.json({
        signedUrl: "wss://signed",
        dynamicVariables: { property_id: "101" },
        firstMessage: "Здравейте",
      });
    return Response.json({ html: "<p>Публикуван имот</p>" });
  };
  w.eval(bundle.outputFiles[0].text);
  const $ = (s) => w.document.querySelector(s);
  $("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await until(() => !$("[data-notice]").textContent.includes("undefined"));
  assert.equal(options, null);
  $("[data-text]").click();
  await until(() => options);
  assert.equal(options.textOnly, true);
  assert.equal(
    requests.find((r) => r.path.includes("/session")).body.propertyId,
    101,
  );
  await until(() => sent.length);
  assert.deepEqual(sent, ["Какъв е достъпът?"]);
  await options.clientTools.show_properties({ ids: "101" });
  assert.equal($("[data-matches]").textContent, "Публикуван имот");
  $("[data-close]").click();
  await until(() => ended);
  assert.equal($(".assistant-panel").hidden, true);
  dom.window.close();
});
