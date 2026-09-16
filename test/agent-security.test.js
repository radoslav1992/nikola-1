import { test } from "node:test";
import assert from "node:assert/strict";
import { database, content, source } from "./db-helper.js";
import { login, isAdmin, requireAdmin, hmac, hex } from "../src/manage/auth.js";
import {
  setSettings,
  importCatalogue,
  saveProperty,
  getProperty,
} from "../src/manage/catalogue.js";
import {
  agentTool,
  receiveWebhook,
  agentConfiguration,
  assistantApi,
  configureAgent,
  cleanup,
} from "../src/manage/eleven.js";
const origin = "https://niimoti.com";
const req = (path, body, headers = {}) =>
  new Request(origin + path, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
async function env() {
  const e = {
    DB: database(),
    SITE_URL: origin,
    ELEVENLABS_API_KEY: "test-api-secret",
    AGENT_TOOL_SECRET: "test-tool-secret",
    ELEVENLABS_WEBHOOK_SECRET: "webhook-secret",
    ADMIN_SESSION_SECRET: "session-secret",
  };
  await setSettings(e, {
    agentId: "ni_agent",
    configured: true,
    agentEnabled: true,
    retentionDays: 30,
  });
  return e;
}
test("admin requires password, expiring signed cookie and same-origin mutations", async () => {
  const e = await env();
  const salt = "test-salt",
    password = "long-test-password";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  e.ADMIN_PASSWORD_HASH =
    "pbkdf2:" +
    salt +
    ":" +
    hex(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        256,
      ),
    );
  await assert.rejects(
    login(req("/api/admin/login", { password: "wrong" }), e),
    (x) => x.status === 401,
  );
  const res = await login(req("/api/admin/login", { password }), e),
    cookie = res.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
  const r = new Request(origin + "/api/admin/properties", {
    headers: { cookie },
  });
  assert.equal(await isAdmin(r, e), true);
  await assert.rejects(
    requireAdmin(
      req(
        "/api/admin/properties",
        {},
        { cookie, origin: "https://evil.example" },
      ),
      e,
    ),
    (x) => x.status === 403,
  );
  assert.equal(
    await isAdmin(
      new Request(origin, {
        headers: { cookie: cookie.replace(/ni_admin=\d+/, "ni_admin=1") },
      }),
      e,
    ),
    false,
  );
  assert.equal(
    await isAdmin(r, {
      ...e,
      ADMIN_PASSWORD_HASH: e.ADMIN_PASSWORD_HASH + "x",
    }),
    false,
  );
});
test("agent tools cannot access drafts, private data, write catalogue or read other clients", async () => {
  const e = await env();
  await importCatalogue(e, { items: [source], total: 1 });
  const r = (name, b) =>
    agentTool(
      req("/api/agent/" + name, b, {
        authorization: "Bearer test-tool-secret",
      }),
      e,
      name,
    );
  await assert.rejects(
    r("get_property", { property_id: 101 }),
    (x) => x.status === 404,
  );
  await saveProperty(e, 101, {
    content,
    publication: "published",
    version: (await getProperty(e, 101)).version,
    sync_price: true,
  });
  const d = await (await r("get_property", { property_id: 101 })).text();
  assert.ok(!d.includes("SECRET"));
  assert.ok(!d.includes("coords"));
  await assert.rejects(r("save_property", {}), (x) => x.status === 404);
  await assert.rejects(r("read_notes", {}), (x) => x.status === 404);
  await assert.rejects(
    agentTool(
      req("/api/agent/get_property", { property_id: 101 }),
      e,
      "get_property",
    ),
    (x) => x.status === 401,
  );
  await assert.rejects(
    r("request_callback", { name: "A", contact: "B" }),
    (x) => x.status === 400,
  );
  assert.equal(
    (
      await (
        await r("request_callback", {
          name: "A",
          contact: "B",
          confirmed: true,
        })
      ).json()
    ).ok,
    true,
  );
});
test("webhooks verify raw-body HMAC and timestamp, are idempotent and isolate the configured agent", async () => {
  const e = await env();
  const event = {
    type: "post_call_transcription",
    data: {
      agent_id: "ni_agent",
      conversation_id: "conv_1",
      status: "done",
      metadata: { start_time_unix_secs: Date.now() / 1000 },
      transcript: [{ role: "user", message: "Hello" }],
      analysis: { transcript_summary: "Summary" },
    },
  };
  const webhook = async (
    body,
    ts = String(Math.floor(Date.now() / 1000)),
    secret = e.ELEVENLABS_WEBHOOK_SECRET,
  ) => {
    const raw = JSON.stringify(body),
      sig = await hmac(secret, `${ts}.${raw}`);
    return receiveWebhook(
      new Request(origin + "/api/elevenlabs/webhook", {
        method: "POST",
        headers: { "elevenlabs-signature": `t=${ts},v0=${sig}` },
        body: raw,
      }),
      e,
    );
  };
  await webhook(event);
  assert.equal((await (await webhook(event)).json()).duplicate, true);
  assert.equal(
    (await e.DB.prepare("SELECT count(*) AS n FROM conversations").first()).n,
    1,
  );
  await assert.rejects(webhook(event, "1"), (x) => x.status === 401);
  await assert.rejects(
    webhook(event, undefined, "wrong"),
    (x) => x.status === 401,
  );
  await webhook({
    ...event,
    data: { ...event.data, agent_id: "other", conversation_id: "private" },
  });
  assert.equal(
    await e.DB.prepare(
      "SELECT id FROM conversations WHERE id='private'",
    ).first(),
    null,
  );
  await e.DB.prepare(
    "UPDATE conversations SET occurred_at='2000-01-01T00:00:00.000Z'",
  ).run();
  await cleanup(e);
  assert.equal(
    (await e.DB.prepare("SELECT count(*) AS n FROM conversations").first()).n,
    0,
  );
});
test("browser gets only signed URL and published page context, secrets stay server-side", async (t) => {
  const e = await env();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ signed_url: "wss://example.test/signed" }),
  );
  await assert.rejects(
    assistantApi(
      req("/api/assistant/session", { consent: false }),
      e,
      "/api/assistant/session",
    ),
    (x) => x.status === 400,
  );
  const data = await (
    await assistantApi(
      req("/api/assistant/session", {
        consent: true,
        propertyId: 999,
        lang: "en",
        pagePath: "/raion/sevlievo",
      }),
      e,
      "/api/assistant/session",
    )
  ).json();
  assert.equal(data.dynamicVariables.property_id, "");
  assert.equal(data.dynamicVariables.page_path, "/raion/sevlievo");
  assert.ok(!JSON.stringify(data).includes("test-api-secret"));
  assert.ok(data.firstMessage.includes("transcribed"));
});
test("phone setup refuses to reassign another agent’s number before any remote mutation", async (t) => {
  const e = await env();
  await setSettings(e, {
    phoneMode: "missed",
    phoneNumberId: "occupied",
    agentId: "ni_agent",
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    calls++;
    assert.equal(options.method, "GET");
    return Response.json({ assigned_agent: { agent_id: "kova" } });
  });
  await assert.rejects(configureAgent(e), (x) => x.status === 409);
  assert.equal(calls, 1);
});
test("recording notice and phone transfer differ correctly between direct and missed-call modes", () => {
  const e = { SITE_URL: origin };
  const s = { phone: "+359884128117", recordAudio: true, retentionDays: 30 };
  const direct = agentConfiguration(
    e,
    { ...s, phoneMode: "direct" },
    "secret-id",
  );
  assert.ok(
    direct.conversation_config.agent.prompt.built_in_tools.transfer_to_number,
  );
  assert.equal(direct.platform_settings.auth.enable_auth, true);
  assert.equal(direct.platform_settings.privacy.record_voice, true);
  assert.equal(direct.platform_settings.privacy.delete_audio, true);
  assert.ok(
    direct.conversation_config.agent.first_message.includes("записва аудио"),
  );
  const missed = agentConfiguration(
    e,
    { ...s, phoneMode: "missed" },
    "secret-id",
  );
  assert.equal(
    missed.conversation_config.agent.prompt.built_in_tools.transfer_to_number,
    undefined,
  );
  assert.ok(
    missed.conversation_config.agent.prompt.prompt.includes("forwarding loop"),
  );
  assert.ok(!JSON.stringify(direct).includes("test-tool-secret"));
});

test("generated website/direct/missed-call configurations match the installed ElevenLabs API schema", async () => {
  // Import SDK first to initialize the generated serializer's circular dependencies.
  await import("@elevenlabs/elevenlabs-js");
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const {
    BodyCreateAgentV1ConvaiAgentsCreatePost: schema,
  } = require("../node_modules/@elevenlabs/elevenlabs-js/serialization/resources/conversationalAi/resources/agents/client/requests/BodyCreateAgentV1ConvaiAgentsCreatePost.js");
  for (const phoneMode of ["website", "direct", "missed"]) {
    const result = await schema.parse(
      agentConfiguration(
        { SITE_URL: origin },
        { phoneMode, retentionDays: 30 },
        "secret-id",
      ),
      { unrecognizedObjectKeys: "fail" },
    );
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  }
});
