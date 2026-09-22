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
test("assistant preserves a text session across messages, tool errors and minimize; voice stays separate", async () => {
  const dom = new JSDOM(
      '<html lang="bg"><body><form data-agent-ask><input name="q" value="Какъв е достъпът?"></form></body></html>',
      { url: "https://niimoti.com/imot/101/house", runScripts: "outside-only" },
    ),
    w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let options = null,
    ended = false,
    micStates = [],
    sent = [],
    contexts = [],
    requests = [];
  w.fakeSession = async (o) => {
    options = o;
    return {
      sendUserMessage: (m) => sent.push(m),
      sendContextualUpdate: (m) => contexts.push(m),
      setMicMuted: (m) => micStates.push(m),
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
        dynamicVariables: {
          property_id: String(JSON.parse(opt.body).propertyId),
        },
        propertyContext: `Current property ID: ${JSON.parse(opt.body).propertyId}`,
        firstMessage: "Здравейте",
      });
    return Response.json({ html: "<p>Публикуван имот</p>" });
  };
  w.eval(bundle.outputFiles[0].text);
  const $ = (s) => w.document.querySelector(s);
  $("form").dispatchEvent(new w.Event("submit", { cancelable: true }));
  await until(() => !$("[data-notice]").textContent.includes("undefined"));
  assert.equal(options, null);
  assert.equal(
    $("[data-message]").hidden,
    false,
    "text composer is visible before starting a session",
  );
  assert.equal($("#assistant-input").value, "Какъв е достъпът?");
  $("[data-message]").dispatchEvent(
    new w.Event("submit", { cancelable: true }),
  );
  await until(() => options);
  assert.equal(options.textOnly, true);
  await until(() => contexts.length);
  assert.equal(contexts[0], "Current property ID: 101");
  assert.equal(
    requests.find((r) => r.path.includes("/session")).body.propertyId,
    101,
  );
  await until(() => sent.length);
  assert.deepEqual(sent, ["Какъв е достъпът?"]);
  const textOptions = options;
  options.onMessage({ source: "ai", message: "Достъпът е по асфалтов път." });
  $("#assistant-input").value = "А има ли вода?";
  $("[data-message]").dispatchEvent(
    new w.Event("submit", { cancelable: true }),
  );
  assert.equal(options, textOptions);
  assert.equal(sent.at(-1), "А има ли вода?");
  options.onError("Client tool failed", { clientToolName: "show_properties" });
  assert.equal(
    ended,
    false,
    "a tool error must not end a healthy conversation",
  );
  await options.clientTools.show_properties({ ids: "101" });
  assert.equal($("[data-matches]").textContent, "Публикуван имот");
  $("[data-close]").click();
  assert.equal(
    ended,
    false,
    "minimizing text chat must retain the same session",
  );
  assert.equal($(".assistant-panel").hidden, true);
  const oldOptions = options;
  $(".assistant-launch").click();
  $("#assistant-input").value = "Припомни ми достъпа.";
  $("[data-message]").dispatchEvent(
    new w.Event("submit", { cancelable: true }),
  );
  assert.equal(options, textOptions);
  assert.equal(requests.filter((r) => r.path.includes("/session")).length, 1);
  assert.deepEqual(sent, [
    "Какъв е достъпът?",
    "А има ли вода?",
    "Припомни ми достъпа.",
  ]);
  assert.match($("[data-messages]").textContent, /Достъпът е по асфалтов път/);
  $("[data-end]").click();
  await until(() => ended);
  $("[data-voice]").click();
  await until(() => options !== oldOptions && !$("[data-mute]").hidden);
  assert.equal(options.textOnly, false);
  assert.equal($("[data-voice-state]").hidden, false);
  assert.equal(
    $("[data-message]").hidden,
    true,
    "voice calls do not show a chat composer",
  );
  assert.equal(
    $("[data-messages]").hidden,
    true,
    "voice transcript is collapsed by default",
  );
  assert.equal($("[data-switch-voice]").getAttribute("aria-pressed"), "true");
  options.onModeChange({ mode: "speaking" });
  assert.equal($(".assistant").classList.contains("is-speaking"), true);
  $("[data-mute]").click();
  assert.deepEqual(micStates, [true]);
  assert.equal($("[data-mute]").getAttribute("aria-pressed"), "true");
  options.onModeChange({ mode: "listening" });
  assert.match($("[data-voice-label]").textContent, /изключен/);
  oldOptions.onDisconnect();
  assert.equal(
    $("[data-voice-state]").hidden,
    false,
    "an old session must not close the new chat",
  );
  options.onMessage({
    source: "ai",
    message: '<img src=x onerror="alert(1)">',
  });
  assert.equal(
    $("[data-messages]").hidden,
    true,
    "incoming transcript must not change the displayed mode",
  );
  $("[data-transcript]").click();
  assert.equal($("[data-messages]").hidden, false);
  assert.equal($("[data-voice-state]").hidden, false);
  assert.equal($("[data-message]").hidden, true);
  $("[data-transcript]").click();
  assert.equal($("[data-messages]").hidden, true);
  assert.equal(
    $("[data-messages] img"),
    null,
    "assistant responses remain text, never executable HTML",
  );
  const voiceOptions = options;
  $("[data-switch-text]").click();
  await until(() => options !== voiceOptions && !$("[data-message]").hidden);
  assert.equal(options.textOnly, true);
  assert.equal($("[data-voice-state]").hidden, true);
  assert.equal($("[data-switch-text]").getAttribute("aria-pressed"), "true");
  voiceOptions.onDisconnect();
  assert.equal($("[data-message]").hidden, false);
  $("[data-close]").click();
  await until(() => $("[data-voice-state]").hidden);
  const previousOptions = options;
  w.history.pushState({}, "", "/imot/202/ribaritsa");
  $(".assistant-launch").click();
  await until(() => !$("[data-start]").hidden);
  $("#assistant-input").value = "Какъв е достъпът до този имот?";
  $("[data-message]").dispatchEvent(
    new w.Event("submit", { cancelable: true }),
  );
  await until(() => contexts.at(-1) === "Current property ID: 202");
  assert.notEqual(options, previousOptions);
  assert.equal(options.dynamicVariables.property_id, "202");
  assert.equal(
    requests.filter((r) => r.path.includes("/session")).at(-1).body.propertyId,
    202,
  );
  assert.ok(!$("[data-messages]").textContent.includes("асфалтов път"));
  ended = false;
  w.dispatchEvent(new w.Event("pagehide"));
  await until(() => ended);
  dom.window.close();
});
