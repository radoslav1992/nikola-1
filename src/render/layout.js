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
  ['navRegions', '/#regions'],
  ['navReduced', '/imoti?cat=reduced'],
  ['navAbout', '/#about'],
  ['navContact', '/#contact'],
];

export function page({ lang = 'bg', title, description, path = '/', body, jsonLd = [], image, updatedAt, env, noindex = false, pageClass = '' }) {
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
<meta name="theme-color" content="#F6F3EC">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
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
      <a class="header-phone" href="${telHref(AGENT.mobile)}">${AGENT.mobile}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobilenav" data-menu>
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
      <div class="brand-name">${SITE.name}</div>
      <p class="muted small">${AGENT.name[lang]} · ${AGENT.role[lang]}</p>
      <p class="muted small">${AGENT.address[lang]}</p>
    </div>
    <div class="footer-col footer-links">
      ${NAV.map(([k, p]) => html`<a href="${href(lang, p)}">${t[k]}</a>`)}
    </div>
    <div class="footer-col">
      <p class="muted small">${t.footerSource} <a href="${AGENT.sourceUrl}" rel="noopener" target="_blank">SUPRIMMO ↗</a>${updatedAt ? html` · ${t.footerUpdated}: ${fmtDate(updatedAt, lang)}` : ''}</p>
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

export { esc };
