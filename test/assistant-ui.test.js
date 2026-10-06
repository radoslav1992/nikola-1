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
  assert.deepEqual(
    [...$("[data-messages]").children].map((el) => el.textContent),
    ["Здравейте", "Какъв е достъпът?"],
    "the greeting must precede a question submitted before connection",
  );
  options.onMessage({ source: "ai", message: "  Здравейте\n" });
  assert.equal($("[data-messages]").children.length, 2, "late greeting is not duplicated");
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
  assert.equal($("[data-messages]").children.length, 0, "voice waits for actual transcript events");
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

for (const lang of ["bg", "en"]) {
  test(`text chat shows its ${lang} greeting without a user message, before connection completes`, async () => {
    const dom = new JSDOM(`<html lang="${lang}"><body></body></html>`, {
      url: "https://niimoti.com/", runScripts: "outside-only",
    });
    const w = dom.window;
    w.HTMLElement.prototype.scrollIntoView = () => {};
    const greeting = lang === "bg" ? "Здравейте! Как мога да Ви помогна?" : "Hello! How can I help?";
    let options, connect;
    const sent = [];
    w.fakeSession = (o) => {
      options = o;
      return new Promise((resolve) => {
        connect = () => resolve({
          sendUserMessage: (text) => sent.push(text),
          endSession: async () => {},
        });
      });
    };
    w.fetch = async (path) => Response.json(path.includes("/config")
      ? { enabled: true, notice: "Notice", phone: "+359884128117" }
      : { signedUrl: "wss://signed", firstMessage: greeting });
    w.eval(bundle.outputFiles[0].text);
    const $ = (selector) => w.document.querySelector(selector);
    $(".assistant-launch").click();
    $("[data-text]").click();
    await until(() => options);
    assert.equal($("[data-messages]").firstChild.textContent, greeting);
    assert.equal($("#assistant-input").disabled, true);
    assert.deepEqual(sent, []);
    // Some transports echo immediately; others wait until after the user sends.
    options.onMessage({ source: "ai", message: greeting });
    assert.equal($("[data-messages]").children.length, 1);
    connect();
    await until(() => !$("#assistant-input").disabled);
    $("#assistant-input").value = "House under 50000 euros";
    $("[data-message]").dispatchEvent(new w.Event("submit", { cancelable: true }));
    options.onMessage({ source: "ai", message: "Here are the matching houses." });
    assert.deepEqual(sent, ["House under 50000 euros"]);
    assert.deepEqual([...$("[data-messages]").children].map((el) => el.textContent),
      [greeting, "House under 50000 euros", "Here are the matching houses."]);
    $("[data-close]").click();
    $(".assistant-launch").click();
    assert.equal($("[data-messages]").children.length, 3, "reopening retains history without another greeting");
    $("[data-end]").click();
    dom.window.close();
  });
}

test("text replies stream in place, reconcile final text and ignore stale or voice chunks", async () => {
  const dom = new JSDOM('<html lang="bg"><body></body></html>', {
    url: "https://niimoti.com/", runScripts: "outside-only",
  });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let options;
  w.fakeSession = async (o) => {
    options = o;
    return { sendUserMessage() {}, endSession: async () => {} };
  };
  w.fetch = async (path) => Response.json(path.includes("/config")
    ? { enabled: true, notice: "Notice", phone: "+359884128117" }
    : { signedUrl: "wss://signed", firstMessage: "Здравейте!" });
  w.eval(bundle.outputFiles[0].text);
  const $ = (s) => w.document.querySelector(s);
  const texts = () => [...$("[data-messages]").children].map((p) => p.textContent);
  $(".assistant-launch").click();
  $("[data-text]").click();
  await until(() => options && !$("#assistant-input").disabled);
  const part = (type, text, event_id = 2, response_id = "answer") =>
    options.onAgentChatResponsePart({ type, text, event_id, response_id });
  part("start", "", 1, "greeting");
  part("delta", "Здрав", 1, "greeting");
  part("delta", "ейте!", 1, "greeting");
  part("stop", "", 1, "greeting");
  assert.deepEqual(texts(), ["Здравейте!"], "streamed greeting does not duplicate the immediate greeting");
  options.onMessage({ source: "ai", message: "Здравейте!", event_id: 1 });
  part("start", "");
  part("delta", "Има къща ");
  const bubble = $("[data-messages]").lastChild;
  assert.equal(bubble.textContent, "Има къща ", "text is visible before completion");
  assert.equal(bubble.getAttribute("aria-busy"), "true");
  part("delta", "на 35 км.");
  assert.equal($("[data-messages]").lastChild, bubble);
  assert.equal(bubble.textContent, "Има къща на 35 км.");
  part("stop", "");
  assert.equal(bubble.hasAttribute("aria-busy"), false);
  options.onMessage({ source: "ai", message: "Има къща на около 35 км.", event_id: 2 });
  assert.equal(bubble.textContent, "Има къща на около 35 км.", "final text is authoritative");
  assert.equal(texts().length, 2);
  part("delta", "late duplicate");
  assert.equal(texts().length, 2);
  assert.equal(bubble.textContent, "Има къща на около 35 км.");
  // Multiple response IDs can share a turn's event_id after a tool call.
  part("start", "", 2, "follow-up");
  part("delta", "Цена: 30500 евро.", 2, "follow-up");
  part("stop", "", 2, "follow-up");
  options.onMessage({ source: "ai", message: "Цена: 30 500 евро.", event_id: 2 });
  assert.deepEqual(texts().slice(1), ["Има къща на около 35 км.", "Цена: 30 500 евро."]);
  // SDK versions without response_id still expose event_id.
  options.onAgentChatResponsePart({ type: "delta", text: '<img src=x onerror="alert(1)">', event_id: 3 });
  assert.equal($("[data-messages] img"), null);
  options.onMessage({ source: "ai", message: "Безопасен текст", event_id: 3 });
  assert.equal(texts().at(-1), "Безопасен текст");
  // Full-message fallback remains available when the provider buffers a reply.
  options.onMessage({ source: "ai", message: "Проверявам.", event_id: 4 });
  part("start", "", 4, "already-final");
  part("delta", "Проверявам.", 4, "already-final");
  assert.equal(texts().filter((t) => t === "Проверявам.").length, 1);
  options.onMessage({ source: "ai", message: "Проверявам.", event_id: 5 });
  assert.equal(texts().filter((t) => t === "Проверявам.").length, 2, "identical replies in different turns are retained");
  part("delta", "Незавършен отговор", 6, "unfinished");
  assert.ok($(".is-streaming"));
  const old = options;
  $("[data-end]").click();
  assert.equal($(".is-streaming"), null);
  const before = texts();
  old.onAgentChatResponsePart({ type: "delta", text: "stale", event_id: 6 });
  assert.deepEqual(texts(), before);
  $("[data-voice]").click();
  await until(() => options !== old && !$("[data-voice-state]").hidden);
  options.onAgentChatResponsePart({ type: "delta", text: "voice partial", event_id: 7 });
  assert.deepEqual(texts(), []);
  options.onMessage({ source: "ai", message: "Voice transcript", event_id: 7 });
  assert.deepEqual(texts(), ["Voice transcript"]);
  assert.equal($("[data-messages]").hidden, true);
  assert.equal($("[data-message]").hidden, true);
  $("[data-end]").click();
  dom.window.close();
});
test("assistant shows visitors localized errors, never server or browser internals", async () => {
  const dom = new JSDOM('<html lang="en"><body></body></html>', {
      url: "https://niimoti.com/en/imoti",
      runScripts: "outside-only",
    }),
    w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let reply;
  w.fakeSession = async () => {
    throw new w.DOMException("Permission denied", "NotAllowedError");
  };
  w.fetch = async (path) =>
    path.includes("/config")
      ? Response.json({ enabled: true, notice: "Notice", phone: "+359884128117" })
      : reply();
  w.eval(bundle.outputFiles[0].text);
  const $ = (s) => w.document.querySelector(s);
  const status = $("[data-status]");
  const attempt = async (button) => {
    status.textContent = "";
    $(button).click();
    await until(() => status.textContent && !/…$/.test(status.textContent));
    await until(() => !$("[data-start]").hidden);
    return status.textContent;
  };
  $(".assistant-launch").click();
  reply = () => new Response("Internal error", { status: 500 });
  assert.equal(
    await attempt("[data-text]"),
    "The assistant is temporarily unavailable. Please try again or contact Nikola.",
  );
  reply = () =>
    Response.json({ error: "Твърде много опити. Опитайте по-късно." }, { status: 429 });
  assert.match(await attempt("[data-text]"), /^Too many attempts/);
  reply = () =>
    Response.json(
      { error: "ElevenLabs (HTTP 401): ELEVENLABS_API_KEY е невалиден" },
      { status: 502 },
    );
  assert.doesNotMatch(await attempt("[data-text]"), /ELEVENLABS|HTTP|[а-я]/i);
  reply = () => Response.json({ signedUrl: "wss://signed", firstMessage: "Hi" });
  assert.match(await attempt("[data-voice]"), /^Microphone access is blocked.*Let’s chat/);
  dom.window.close();
});
test("a final reply joins its streamed bubble even when the server's IDs differ", async () => {
  const dom = new JSDOM('<html lang="bg"><body></body></html>', {
    url: "https://niimoti.com/", runScripts: "outside-only",
  });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let options;
  w.fakeSession = async (o) => {
    options = o;
    return { sendUserMessage() {}, endSession: async () => {} };
  };
  w.fetch = async (path) => Response.json(path.includes("/config")
    ? { enabled: true, notice: "Notice", phone: "+359884128117" }
    : { signedUrl: "wss://signed", firstMessage: "Здравейте!" });
  w.eval(bundle.outputFiles[0].text);
  const $ = (s) => w.document.querySelector(s);
  const texts = () => [...$("[data-messages]").children].map((p) => p.textContent);
  $(".assistant-launch").click();
  $("[data-text]").click();
  await until(() => options && !$("#assistant-input").disabled);
  const stream = (event_id, response_id, ...chunks) => {
    options.onAgentChatResponsePart({ type: "start", text: "", event_id, response_id });
    for (const text of chunks) options.onAgentChatResponsePart({ type: "delta", text, event_id, response_id });
    options.onAgentChatResponsePart({ type: "stop", text: "", event_id, response_id });
  };
  // Seen live: every answer appeared twice because the final agent_response
  // carried another event_id than its streamed parts, without a response_id.
  stream(2, "r1", "В момента в каталога има ", "5 къщи за продажба.");
  options.onMessage({ source: "ai", message: "В момента в каталога има 5 къщи за продажба.", event_id: 3 });
  stream(4, "r2", "Да. Има къща в кв. Ябълка.");
  options.onMessage({ source: "ai", message: "Да. Има къща в кв. Ябълка.", event_id: 5 });
  assert.deepEqual(texts(), [
    "Здравейте!",
    "В момента в каталога има 5 къщи за продажба.",
    "Да. Има къща в кв. Ябълка.",
  ]);
  // SDK 1.27 forwards the final's response_id, which pairs regardless of event_id.
  stream(6, "r3", "Цена: 49 500 евро.");
  options.onMessage({ source: "ai", message: "Цена: 49 500 евро.", event_id: 9, response_id: "r3" });
  // A final that arrives before its stream keeps the stream from adding a copy.
  options.onMessage({ source: "ai", message: "Искате ли оглед?", event_id: 10, response_id: "r4" });
  stream(11, "r4", "Искате ли оглед?");
  assert.deepEqual(texts().slice(3), ["Цена: 49 500 евро.", "Искате ли оглед?"]);
  // Identical answers in separate turns are still both shown.
  options.onMessage({ source: "ai", message: "Искате ли оглед?", event_id: 12 });
  assert.equal(texts().filter((t) => t === "Искате ли оглед?").length, 2);
  $("[data-end]").click();
  dom.window.close();
});
