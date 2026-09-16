// Remove location/camera/text metadata without decoding or recompressing pixels.
// JPEG orientation is retained in a minimal EXIF block so phone photos stay upright.
const join = (chunks) => {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
};
function orientation(segment) {
  try {
    if (new TextDecoder().decode(segment.slice(4, 10)) !== "Exif\0\0") return 1;
    const v = new DataView(
        segment.buffer,
        segment.byteOffset + 10,
        segment.length - 10,
      ),
      le = v.getUint16(0) === 0x4949,
      offset = v.getUint32(4, le),
      n = v.getUint16(offset, le);
    for (let i = 0; i < n; i++) {
      const p = offset + 2 + i * 12;
      if (v.getUint16(p, le) === 0x112) return v.getUint16(p + 8, le);
    }
  } catch {}
  return 1;
}
function minimalExif(value) {
  return Uint8Array.from([
    255,
    225,
    0,
    34,
    69,
    120,
    105,
    102,
    0,
    0,
    73,
    73,
    42,
    0,
    8,
    0,
    0,
    0,
    1,
    0,
    18,
    1,
    3,
    0,
    1,
    0,
    0,
    0,
    value,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
}
export function stripImageMetadata(bytes, mime) {
  if (mime === "image/jpeg") {
    const chunks = [bytes.slice(0, 2)];
    let pos = 2;
    while (pos < bytes.length) {
      if (bytes[pos] !== 255) throw Error("Invalid JPEG");
      const marker = bytes[pos + 1];
      if (marker === 218 || marker === 217) {
        chunks.push(bytes.slice(pos));
        break;
      }
      if (marker === 0 || marker === 255) throw Error("Invalid JPEG marker");
      const size = (bytes[pos + 2] << 8) + bytes[pos + 3] + 2;
      if (size < 4 || pos + size > bytes.length)
        throw Error("Invalid JPEG length");
      const segment = bytes.slice(pos, pos + size);
      if (marker === 225) {
        const value = orientation(segment);
        if (value > 1 && value <= 8) chunks.push(minimalExif(value));
      } else if (marker !== 237 && marker !== 254) chunks.push(segment);
      pos += size;
    }
    return join(chunks);
  }
  if (mime === "image/png") {
    const chunks = [bytes.slice(0, 8)];
    let pos = 8;
    while (pos + 12 <= bytes.length) {
      const size =
        new DataView(bytes.buffer, bytes.byteOffset + pos, 4).getUint32(0) + 12;
      if (pos + size > bytes.length) throw Error("Invalid PNG");
      const type = new TextDecoder().decode(bytes.slice(pos + 4, pos + 8));
      if (!["eXIf", "tEXt", "iTXt", "zTXt"].includes(type))
        chunks.push(bytes.slice(pos, pos + size));
      pos += size;
      if (type === "IEND") break;
    }
    return join(chunks);
  }
  if (mime === "image/webp") {
    const chunks = [bytes.slice(0, 12)];
    let pos = 12;
    while (pos + 8 <= bytes.length) {
      const size = new DataView(
          bytes.buffer,
          bytes.byteOffset + pos + 4,
          4,
        ).getUint32(0, true),
        end = pos + 8 + size + (size % 2);
      if (end > bytes.length) throw Error("Invalid WebP");
      const type = new TextDecoder().decode(bytes.slice(pos, pos + 4)),
        chunk = bytes.slice(pos, end);
      if (type === "VP8X") chunk[8] &= ~12;
      if (!["EXIF", "XMP "].includes(type)) chunks.push(chunk);
      pos = end;
    }
    const out = join(chunks);
    new DataView(out.buffer).setUint32(4, out.length - 8, true);
    return out;
  }
  return bytes;
}
