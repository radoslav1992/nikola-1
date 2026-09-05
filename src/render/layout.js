import { html, raw, toString, esc } from './html.js';
import { T, AGENT, SITE, fmtDate } from './i18n.js';

/** Build a site path for the given language. */
export function href(lang, path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === 'en' ? (p === '/' ? '/en' : `/en${p}`) : p;
}

/** Same page in the other language. */
export function altHref(lang, path) {
  return href(lang === 'en' ? 'bg' : 'en', path);
}

export function waLink(text) {
  return `https://wa.me/${AGENT.whatsappDigits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function viberLink() {
  return `viber://chat?number=%2B${AGENT.whatsappDigits}`;
}

export function telHref(num) {
  return `tel:${num.replace(/[^\d+]/g, '')}`;
}

const NAV = [
  ['navProps', '/imoti'],
  ['navMap', '/karta'],
  ['navReduced', '/imoti?cat=reduced'],
  ['navAbout', '/#about'],
  ['navContact', '/#contact'],
];

const LEAFLET_HEAD = '<link rel="stylesheet" href="/vendor/leaflet/leaflet.css"><script src="/vendor/leaflet/leaflet.js" defer></script>';

export function page({ lang = 'bg', title, description, path = '/', body, jsonLd = [], image, updatedAt, env, noindex = false, pageClass = '', leaflet = false }) {
  const t = T[lang];
  const site = (env?.SITE_URL || `https://${SITE.domain}`).replace(/\/$/, '');
  const fullTitle = title ? `${title} · ${SITE.name}` : `${SITE.name} — ${t.brandTag}`;
  const canonical = `${site}${href(lang, path)}`;
  const alt = `${site}${altHref(lang, path)}`;
  const ogImage = image ? (image.startsWith('http') ? image : `${site}${image}`) : `${site}/img/agent.jpg`;

  const doc = html`<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${description || t.metaHome}">
${noindex ? raw('<meta name="robots" content="noindex">') : ''}
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'en' ? 'bg' : 'en'}" href="${alt}">
<link rel="alternate" hreflang="x-default" href="${site}${href('bg', path)}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:type" content="website">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${description || t.metaHome}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'bg_BG'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${leaflet ? raw(LEAFLET_HEAD) : ''}
${jsonLd.map((o) => raw(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`))}
</head>
<body class="${pageClass}" data-lang="${lang}">
${header(lang, path)}
<main id="page">
${body}
</main>
${footer(lang, updatedAt)}
${mobileBar(lang)}
<script src="/app.js" defer></script>
</body>
</html>`;
  return toString(doc);
}

function header(lang, path) {
  const t = T[lang];
  return html`<header class="site-header">
  <div class="wrap header-inner">
    <a href="${href(lang, '/')}" class="brand" aria-label="${SITE.name}">
      <span class="brand-mark" aria-hidden="true">НИ</span>
      <span class="brand-name">${SITE.name}</span>
      <span class="brand-tag">${t.brandTag}</span>
    </a>
    <nav class="desknav" aria-label="Main">
      ${NAV.map(([k, p]) => html`<a href="${href(lang, p)}">${t[k]}</a>`)}
    </nav>
    <div class="header-actions">
      <div class="lang-toggle" role="group" aria-label="Language">
        <a href="${href('bg', path)}" class="${lang === 'bg' ? 'on' : ''}" hreflang="bg">BG</a>
        <a href="${href('en', path)}" class="${lang === 'en' ? 'on' : ''}" hreflang="en">EN</a>
      </div>
      <a class="header-phone" href="${telHref(AGENT.mobile)}">${raw(PHONE_ICON)} ${AGENT.mobile}</a>
      <button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobilenav" data-menu>
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
  <nav class="mobilenav" id="mobilenav" hidden aria-label="Mobile">
    ${NAV.map(([k, p]) => html`<a href="${href(lang, p)}">${t[k]}</a>`)}
    <a href="${telHref(AGENT.mobile)}">${AGENT.mobile}</a>
  </nav>
</header>`;
}

function footer(lang, updatedAt) {
  const t = T[lang];
  return html`<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-col">
      <div class="brand"><span class="brand-mark" aria-hidden="true">НИ</span><span class="brand-name">${SITE.name}</span></div>
      <p class="muted small">${AGENT.name[lang]} · ${AGENT.role[lang]}</p>
      <p class="muted small">${AGENT.address[lang]}</p>
    </div>
    <div class="footer-col footer-links">
      ${NAV.map(([k, p]) => html`<a href="${href(lang, p)}">${t[k]}</a>`)}
    </div>
    <div class="footer-col">
      <p class="muted small">${t.footerSource} <a href="${AGENT.sourceUrl}" rel="noopener" target="_blank">SUPRIMMO ↗</a>${updatedAt ? html` · ${t.footerUpdated}: ${fmtDate(updatedAt, lang)}` : ''}</p>
      <p class="muted small">${lang === 'en' ? 'Map data' : 'Карта'}: © <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a> contributors</p>
      <p class="muted small">© ${new Date().getUTCFullYear()} ${SITE.name} · ${SITE.domain}</p>
    </div>
  </div>
</footer>`;
}

function mobileBar(lang) {
  const t = T[lang];
  return html`<div class="mobilebar">
  <a href="${telHref(AGENT.mobile)}">${t.barCall}</a>
  <a href="${waLink()}" rel="noopener" target="_blank">WhatsApp</a>
  <a href="${viberLink()}">Viber</a>
  <a href="#contact" class="primary" data-scroll-contact>${t.barEnquire}</a>
</div>`;
}

const PHONE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';

export { esc };
