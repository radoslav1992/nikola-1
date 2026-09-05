import { html, raw } from './html.js';
import { T, AGENT, typeLabel, placeLabel, regionLabel, fmtPrice, fmtArea, fmtNumber, slugify } from './i18n.js';
import { href, waLink, viberLink, telHref } from './layout.js';

export function imgUrl(file, size = 'medium') {
  return `/img/${size}/${encodeURIComponent(file)}`;
}

export function listingPath(l) {
  return `/imot/${l.id}/${l.slug || slugify(l.title)}`;
}

export function listingHref(l, lang) {
  return href(lang, listingPath(l));
}

export function metaBits(l, lang) {
  const meta = [];
  if (l.area != null) meta.push(fmtArea(l.area));
  if (l.plotArea != null) meta.push(`${lang === 'en' ? 'plot' : 'двор'} ${fmtArea(l.plotArea)}`);
  if (l.bedrooms != null) meta.push(`${l.bedrooms} ${lang === 'en' ? (l.bedrooms === 1 ? 'bedroom' : 'bedrooms') : (l.bedrooms === 1 ? 'спалня' : 'спални')}`);
  if (!meta.length && l.pricePerSqm != null) meta.push(`${l.pricePerSqm} €/m²`);
  return meta;
}

/** Property card with a hover/tap photo carousel. */
export function card(l, lang, { eager = false } = {}) {
  const t = T[lang];
  const imgs = (l.images || []).slice(0, 5);
  const badges = [];
  if (l.rent) badges.push(html`<span class="chip chip-dark">${t.statusRent}</span>`);
  if (l.discount) badges.push(html`<span class="chip chip-alert">-${l.discount}%</span>`);
  else if (l.reduced) badges.push(html`<span class="chip chip-alert">${t.reducedBadge}</span>`);
  const meta = metaBits(l, lang);

  const media = imgs.length
    ? html`<div class="card-slides">${imgs.map((f, i) => html`<img src="${imgUrl(f, 'medium')}" alt="${t.photoOf(i + 1, imgs.length)}: ${l.title}" loading="${eager && i === 0 ? 'eager' : 'lazy'}" decoding="async" width="600" height="450" class="${i === 0 ? 'on' : ''}">`)}</div>
      ${imgs.length > 1 ? html`<div class="card-zones" aria-hidden="true">${imgs.map(() => raw('<span></span>'))}</div>
      <button type="button" class="card-arrow prev" data-dir="-1" aria-label="${t.prev}">‹</button>
      <button type="button" class="card-arrow next" data-dir="1" aria-label="${t.next}">›</button>
      <div class="card-dots" aria-hidden="true">${imgs.map((_, i) => raw(`<i class="${i === 0 ? 'on' : ''}"></i>`))}</div>` : ''}`
    : html`<div class="card-noimg"></div>`;

  return html`<a class="card" href="${listingHref(l, lang)}">
  <div class="card-media" ${imgs.length > 1 ? raw('data-carousel') : ''}>
    ${media}
    <span class="chip">${typeLabel(l.type, lang)}</span>
    ${badges.length ? html`<span class="chip-row">${badges}</span>` : ''}
  </div>
  <div class="card-body">
    <div class="card-head">
      <span class="card-price">${l.oldPrice ? html`<s>${fmtNumber(l.oldPrice)} €</s>` : ''}${fmtPrice(l, lang)}</span>
      <h3>${l.title}</h3>
    </div>
    <div class="card-loc">${placeLabel(l.place, lang)}${l.region ? html` · ${regionLabel(l.region, lang)}` : ''}</div>
    ${meta.length ? html`<div class="card-meta">${meta.map((m, i) => html`${i ? raw('<span class="sep">·</span>') : ''}<span>${m}</span>`)}</div>` : ''}
  </div>
</a>`;
}

export function cardGrid(items, lang, opts = {}) {
  return html`<div class="grid cards">${items.map((l, i) => card(l, lang, { eager: opts.eagerFirst && i < 3 }))}</div>`;
}

/** Agent contact card used in the aside and the about section. */
export function agentCard(lang, { listing = null, compact = false } = {}) {
  const t = T[lang];
  const waText = listing
    ? (lang === 'en' ? `Hello, I am interested in property ${listing.ref} (${listing.title}) — niimoti.com` : `Здравейте, интересувам се от имот ${listing.ref} (${listing.title}) — niimoti.com`)
    : (lang === 'en' ? 'Hello, I found you on niimoti.com' : 'Здравейте, намерих ви в niimoti.com');
  return html`<div class="panel agent-card">
  <div class="agent-head">
    <img class="avatar" src="/img/agent.jpg" alt="${AGENT.name[lang]}" width="64" height="64" loading="lazy">
    <div>
      <div class="agent-name">${AGENT.name[lang]}</div>
      <div class="muted small">${lang === 'en' ? 'Consultant · Veliko Tarnovo office' : 'Консултант · Офис Велико Търново'}</div>
    </div>
  </div>
  ${compact ? '' : html`<p class="agent-note">${t.agentNote}</p>`}
  <div class="agent-actions">
    <a class="btn btn-dark" href="${telHref(AGENT.mobile)}">${AGENT.mobile}</a>
    <div class="btn-pair">
      <a class="btn btn-outline" href="${waLink(waText)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="btn btn-outline" href="${viberLink()}">Viber</a>
    </div>
    <a class="muted small center" href="${telHref(AGENT.office)}">${lang === 'en' ? 'Office' : 'Офис'}: ${AGENT.office}</a>
  </div>
  <hr>
  ${contactForm(lang, { listing, compact: true })}
</div>`;
}

export function contactForm(lang, { listing = null, compact = false } = {}) {
  const t = T[lang];
  const msgPh = listing ? t.formMsgProp(listing.ref) : t.formMsg;
  return html`<form class="contact-form ${compact ? 'compact' : ''}" method="post" action="/api/contact" data-contact>
  <input type="hidden" name="lang" value="${lang}">
  ${listing ? html`<input type="hidden" name="listingId" value="${listing.id}"><input type="hidden" name="listingRef" value="${listing.ref}"><input type="hidden" name="listingTitle" value="${listing.title}">` : ''}
  <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
  <label><span class="sr-only">${t.formName}</span><input name="name" placeholder="${t.formName}" required maxlength="120" autocomplete="name"></label>
  <label><span class="sr-only">${t.formPhone}</span><input name="contact" placeholder="${t.formPhone}" required maxlength="160" autocomplete="tel"></label>
  <label><span class="sr-only">${msgPh}</span><textarea name="message" rows="${compact ? 3 : 4}" placeholder="${msgPh}" maxlength="3000"></textarea></label>
  <button type="submit" class="btn btn-primary">${listing ? t.formEnquire : t.formSend}</button>
  <p class="form-status" role="status" aria-live="polite"></p>
  ${compact ? '' : html`<p class="muted small">${t.formNote}</p>`}
</form>`;
}

export function pagination(lang, { page, pages, buildHref }) {
  const t = T[lang];
  if (pages <= 1) return '';
  const nums = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return html`<nav class="pagination" aria-label="${t.page}">
  ${page > 1 ? html`<a href="${buildHref(page - 1)}" rel="prev">${t.pagePrev}</a>` : html`<span class="disabled">${t.pagePrev}</span>`}
  ${nums.map((n) => (n === '…' ? html`<span class="ellipsis">…</span>` : n === page ? html`<span class="current" aria-current="page">${n}</span>` : html`<a href="${buildHref(n)}">${n}</a>`))}
  ${page < pages ? html`<a href="${buildHref(page + 1)}" rel="next">${t.pageNext}</a>` : html`<span class="disabled">${t.pageNext}</span>`}
</nav>`;
}

/** List / Map segmented switch, preserving the current query string. */
export function viewSwitch(lang, { active, query }) {
  const t = T[lang];
  const qs = query ? `?${query}` : '';
  return html`<div class="seg" role="group" aria-label="View">
  <a href="${href(lang, '/imoti')}${qs}" class="${active === 'list' ? 'on' : ''}">${raw(LIST_ICON)} ${t.listView}</a>
  <a href="${href(lang, '/karta')}${qs}" class="${active === 'map' ? 'on' : ''}">${raw(MAP_ICON)} ${t.mapView}</a>
</div>`;
}

const LIST_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const MAP_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';
