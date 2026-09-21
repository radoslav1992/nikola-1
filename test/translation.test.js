import { test } from "node:test";
import assert from "node:assert/strict";
import { translateProperty } from "../src/manage/translation.js";

const input = { title: "Къща", description: "Пълно описание на имота." };
const translated = {
  titleEn: "House",
  descriptionEn: "Full property description.",
};
test("translation accepts JSON response variants and rejects incomplete output", async () => {
  for (const response of [
    translated,
    JSON.stringify(translated),
    "```json\n" + JSON.stringify(translated) + "\n```",
  ])
    assert.deepEqual(
      await translateProperty(
        { AI: { run: async () => ({ response }) } },
        input,
      ),
      translated,
    );
  for (const response of [
    null,
    "not json",
    { titleEn: "House" },
    { titleEn: {}, descriptionEn: "text" },
    { titleEn: " ", descriptionEn: "text" },
  ])
    await assert.rejects(
      translateProperty({ AI: { run: async () => ({ response }) } }, input),
      (error) => error.status === 502 && /не е завършен/.test(error.message),
    );
});
test("translation reports missing inputs before calling AI and hides raw provider errors", async () => {
  await assert.rejects(
    translateProperty({}, { ...input, title: "" }),
    (error) => error.status === 400,
  );
  await assert.rejects(
    translateProperty({}, input),
    (error) => error.status === 503 && /binding с име AI/.test(error.message),
  );
  await assert.rejects(
    translateProperty(
      {
        AI: {
          run: async () => {
            throw Error("PRIVATE_UPSTREAM_DETAILS");
          },
        },
      },
      input,
    ),
    (error) =>
      error.status === 502 &&
      !error.message.includes("PRIVATE_UPSTREAM_DETAILS"),
  );
});
