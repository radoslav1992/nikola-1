import { test } from "node:test";
import assert from "node:assert/strict";
import { stripImageMetadata } from "../src/manage/image-metadata.js";
test("JPEG metadata is removed while image data remains byte-for-byte", () => {
  const metadata = Buffer.from("Exif\0\0GPS_LOCATION_SECRET");
  const length = metadata.length + 2;
  const scan = Buffer.from([255, 218, 0, 8, 1, 2, 3, 4, 5, 6, 255, 217]);
  const input = Buffer.concat([
    Buffer.from([255, 216, 255, 225, length >> 8, length & 255]),
    metadata,
    scan,
  ]);
  const output = stripImageMetadata(input, "image/jpeg");
  assert.deepEqual(
    Buffer.from(output),
    Buffer.concat([Buffer.from([255, 216]), scan]),
  );
});
test("PNG text and EXIF chunks are removed without changing image chunks", () => {
  const chunk = (type, data) => {
    const bytes = Buffer.from(data),
      head = Buffer.alloc(4);
    head.writeUInt32BE(bytes.length);
    return Buffer.concat([head, Buffer.from(type), bytes, Buffer.alloc(4)]);
  };
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    idat = chunk("IDAT", "pixel-data"),
    end = chunk("IEND", "");
  const input = Buffer.concat([
    signature,
    chunk("tEXt", "location"),
    chunk("eXIf", "GPS"),
    idat,
    end,
  ]);
  assert.deepEqual(
    Buffer.from(stripImageMetadata(input, "image/png")),
    Buffer.concat([signature, idat, end]),
  );
});
test("malformed image segments fail instead of exposing unexamined metadata", () => {
  assert.throws(() =>
    stripImageMetadata(
      Uint8Array.from([255, 216, 255, 225, 255, 255]),
      "image/jpeg",
    ),
  );
});
