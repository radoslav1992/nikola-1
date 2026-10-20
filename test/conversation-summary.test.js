import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db-helper.js";
import { setSettings } from "../src/manage/catalogue.js";
import { hmac } from "../src/manage/auth.js";
import { adminApi } from "../src/manage/admin.js";
import {
  agentConfiguration,
  agentTool,
  notice,
  receiveWebhook,
  NEXT_ACTION,
} from "../src/manage/eleven.js";

const origin = "https://niimoti.com";

test("conversations show the next action and the contact left with the assistant", async (t) => {
  const e = {
    DB: database(),
    SITE_URL: origin,
    AGENT_TOOL_SECRET: "tool-secret",
    ELEVENLABS_WEBHOOK_SECRET: "webhook-secret",
    ADMIN_SESSION_SECRET: "secret",
    ADMIN_PASSWORD_HASH: "hash",
  };
  t.after(() => e.DB.close());
  await setSettings(e, { agentId: "ni_agent", retentionDays: 30 });
  const raw = JSON.stringify({
      type: "post_call_transcription",
      data: {
        agent_id: "ni_agent",
        conversation_id: "conv_next",
        status: "done",
        metadata: { start_time_unix_secs: Date.now() / 1000 },
        transcript: [{ role: "user", message: "Искам оглед на имот 5." }],
        analysis: {
          transcript_summary: "Посетителят пита за имот № 00005.",
          data_collection_results: {
            next_action: { value: "иска оглед на № 00005" },
          },
        },
      },
    }),
    ts = String(Math.floor(Date.now() / 1000));
  await receiveWebhook(
    new Request(origin + "/api/elevenlabs/webhook", {
      method: "POST",
      headers: {
        "elevenlabs-signature": `t=${ts},v0=${await hmac("webhook-secret", `${ts}.${raw}`)}`,
      },
      body: raw,
    }),
    e,
  );
  await agentTool(
    new Request(origin + "/api/agent/request_callback", {
      method: "POST",
      headers: { authorization: "Bearer tool-secret" },
      body: JSON.stringify({
        name: "Мария",
        contact: "+359888000000",
        message: "Оглед на № 00005",
        confirmed: true,
        conversation_id: "conv_next",
      }),
    }),
    e,
    "request_callback",
  );
  const expiry = Date.now() + 3600000,
    cookie = `ni_admin=${expiry}.nonce.${await hmac("secret", `${expiry}.nonce.hash`)}`;
  const { items } = await (
    await adminApi(
      new Request(origin + "/api/admin/conversations", { headers: { cookie } }),
      e,
      {},
    )
  ).json();
  assert.equal(items[0].metadata.nextAction, "иска оглед на № 00005");
  assert.deepEqual(items[0].contact, {
    name: "Мария",
    contact: "+359888000000",
  });
});

test("the agent offers contact once, answers the four page questions from listing data and never records audio by default", () => {
  const s = { retentionDays: 30 },
    config = agentConfiguration({ SITE_URL: origin }, s, "secret_id"),
    prompt = config.conversation_config.agent.prompt.prompt;
  assert.match(prompt, /Do not ask for a name or phone number at the start/);
  assert.match(prompt, /offer once, politely/);
  assert.match(prompt, /do not ask again/);
  assert.match(prompt, /only from get_property data/);
  assert.match(prompt, /similar properties nearby/);
  assert.deepEqual(config.platform_settings.data_collection, {
    next_action: NEXT_ACTION,
  });
  assert.match(NEXT_ACTION.description, /иска оглед/);
  assert.equal(config.platform_settings.privacy.record_voice, false);
  for (const mode of ["any", "voice", "text"])
    assert.doesNotMatch(notice(s, "bg", mode), /аудио/);
});
