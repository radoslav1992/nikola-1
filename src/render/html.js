/** Tiny HTML helpers: escaping + a tagged template that escapes interpolations by default. */

export function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Mark a string as already-safe HTML. */
export function raw(str) {
  return { __html: str == null ? '' : String(str) };
}

/**
 * html`<p>${userText}</p>${raw(trustedMarkup)}${[array, of, parts]}`
 * Strings are escaped, raw() objects pass through, arrays are joined, null/false vanish.
 */
export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += render(values[i]);
  }
  return raw(out);
}

function render(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (typeof v === 'object' && '__html' in v) return v.__html;
  return esc(v);
}

export function toString(v) {
  return render(v);
}

export function attrUrl(u) {
  return esc(u);
}
