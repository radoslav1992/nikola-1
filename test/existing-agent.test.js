import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db-helper.js";
import { settings, setSettings } from "../src/manage/catalogue.js";
import {
  connectExistingAgent,
  configureAgent,
  assistantApi,
} from "../src/manage/eleven.js";
import { adminApi } from "../src/manage/admin.js";
import { hmac } from "../src/manage/auth.js";

const agentId = "agent_2001m3080a0ff86r8wgj0tk9n6mr";
const origin = "https://niimoti.com";
test("admin connects existing agent, preserves remote content, and can disable/re-enable chat", async (t) => {
  const env = {
    DB: database(),
    ELEVENLABS_API_KEY: "key",
    AGENT_TOOL_SECRET: "tools",
    ADMIN_SESSION_SECRET: "session",
    ADMIN_PASSWORD_HASH: "hash",
  };
  t.after(() => env.DB.close());
  const expires = Date.now() + 60000;
  const cookie = `ni_admin=${expires}.nonce.${await hmac("session", `${expires}.nonce.hash`)}`;
  const request = (path, body, method = "POST", authenticated = true) =>
    new Request(origin + path, {
      method,
      headers: {
        origin,
        cookie: authenticated ? cookie : "",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (options.method === "PATCH") {
      const payload = JSON.parse(options.body);
      assert.deepEqual(Object.keys(payload), ["platform_settings"]);
      assert.deepEqual(Object.keys(payload.platform_settings), ["overrides"]);
      assert.equal(
        payload.platform_settings.overrides.conversation_config_override.agent
          .language,
        true,
      );
      assert.equal(
        payload.platform_settings.overrides.conversation_config_override.agent
          .first_message,
        true,
      );
      assert.equal(
        payload.platform_settings.overrides.conversation_config_override
          .conversation.text_only,
        true,
      );
      assert.equal(
        payload.platform_settings.overrides.conversation_config_override.tts
          .voice_id,
        false,
      );
      return Response.json({ agent_id: agentId });
    }
    if (url.includes("get-signed-url"))
      return Response.json({ signed_url: "wss://example.test/session" });
    return Response.json({
      agent_id: agentId,
      platform_settings: {
        privacy: { record_voice: true, retention_days: 30 },
        overrides: {
          conversation_config_override: { tts: { voice_id: false } },
        },
      },
    });
  });
  await assert.rejects(
    adminApi(
      request("/api/admin/agent/connect", { agentId }, "POST", false),
      env,
      {},
    ),
    (x) => x.status === 401,
  );
  assert.equal(calls.length, 0);
  const response = await adminApi(
    request("/api/admin/agent/connect", { agentId }),
    env,
    {},
  );
  assert.equal((await response.json()).agentId, agentId);
  assert.equal(calls.length, 3);
  const s = await settings(env);
  assert.equal(s.agentManagement, "external");
  assert.equal(s.recordAudio, true);
  const enabled = async () =>
    (
      await (
        await assistantApi(
          new Request(origin + "/api/assistant/config"),
          env,
          "/api/assistant/config",
        )
      ).json()
    ).enabled;
  assert.equal(await enabled(), true);
  // Local saves must not silently disconnect an external agent or overwrite the recording notice.
  await adminApi(
    request(
      "/api/admin/settings",
      { ...s, agentEnabled: false, recordAudio: false },
      "PUT",
    ),
    env,
    {},
  );
  assert.equal(await enabled(), false);
  assert.equal((await settings(env)).configured, true);
  assert.equal((await settings(env)).recordAudio, true);
  await configureAgent(env);
  assert.equal(await enabled(), true);
  assert.ok(
    calls.every(
      ({ url }) =>
        !url.includes("/create") &&
        !url.includes("/secrets") &&
        !url.includes("/phone-numbers"),
    ),
  );
});

test("failed verification keeps existing settings and never enables an unverified agent", async (t) => {
  const env = {
    DB: database(),
    ELEVENLABS_API_KEY: "key",
    AGENT_TOOL_SECRET: "tools",
  };
  t.after(() => env.DB.close());
  const original = {
    agentId: "previous_agent",
    agentEnabled: false,
    configured: false,
  };
  await setSettings(env, original);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 403 }),
  );
  await assert.rejects(
    connectExistingAgent(env, agentId),
    (x) => x.status === 502,
  );
  assert.deepEqual(await settings(env), original);
  await assert.rejects(
    connectExistingAgent(env, "../../other"),
    (x) => x.status === 400,
  );
  t.mock.method(globalThis, "fetch", async (url) =>
    Response.json(url.includes("get-signed-url") ? {} : { agent_id: agentId }),
  );
  await assert.rejects(
    connectExistingAgent(env, agentId),
    (x) => x.status === 502,
  );
  assert.deepEqual(await settings(env), original);
});
