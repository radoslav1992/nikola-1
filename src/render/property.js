import { html, raw } from './html.js';
import { T, SITE, typeLabel, placeLabel, regionLabel, fmtPrice, fmtArea, fmtNumber } from './i18n.js';
import { page, href } from './layout.js';
import { cardGrid, agentCard, imgUrl, listingPath } from './components.js';
import { similarTo, townOf } from '../catalog.js';

export function renderProperty({ lang, data, listing: l, detail, env }) {
  const t = T[lang];
  const images = mergeImages(l.images, detail?.images);
  const main = images[0];
  const thumbs = images.slice(1, 5);
  const similar = similarTo(data.items, l, 3);
  const paragraphs = detail?.paragraphs?.length ? detail.paragraphs : [];
  const town = townOf(l.place);
  const mapQuery = detail?.coords ? `${detail.coords.lat},${detail.coords.lng}` : `${town}, ${l.region}, България`;
  const mapUrl = detail?.coords
    ? `https://www.openstreetmap.org/?mlat=${detail.coords.lat}&mlon=${detail.coords.lng}#map=13/${detail.coords.lat}/${detail.coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const features = [];
  features.push({ label: t.fTypeLabel, value: typeLabel(l.type, lang) });
  if (l.bedrooms != null) features.push({ label: t.fBedrooms, value: l.bedrooms });
  if (l.floors != null) features.push({ label: t.fFloors, value: l.floors });
  if (l.akt16) features.push({ label: t.fAkt16, value: t.fAkt16Val });
  if (l.pricePerSqm != null) features.push({ label: `${t.price} ${t.perSqm}`, value: `${l.pricePerSqm} €` });
  if (l.oldPrice) features.push({ label: t.fOldPrice, value: `${fmtNumber(l.oldPrice)} €` });
  if (l.discount) features.push({ label: t.fDiscount, value: `-${l.discount}%` });
  if (l.region) features.push({ label: t.fRegion, value: regionLabel(l.region, lang) });
  for (const f of detail?.features || []) {
    if (features.length >= 12) break;
    if (!features.some((x) => x.label.toLowerCase() === f.label.toLowerCase())) features.push(f);
  }

  const stats = [
    { label: l.rent ? t.rentPrice : t.price, value: fmtPrice(l, lang) },
    l.plotArea != null ? { label: t.houseArea, value: fmtArea(l.area) } : { label: t.area, value: fmtArea(l.area) },
    l.plotArea != null ? { label: t.landArea, value: fmtArea(l.plotArea) } : null,
  ].filter(Boolean);

  const body = html`
<div class="wrap crumbs-row">
  <nav class="crumbs"><a href="${href(lang, '/')}">${t.crumbHome}</a><span>/</span><a href="${href(lang, '/imoti')}">${t.navProps}</a><span>/</span><a href="${href(lang, `/imoti?loc=${encodeURIComponent(town)}`)}">${placeLabel(l.place, lang)}</a></nav>
</div>

<section class="wrap gallery" data-gallery>
  <div class="gallery-main">
    ${main ? html`<img src="${imgUrl(main, 'big')}" alt="${l.title}" data-gallery-main fetchpriority="high" width="1200" height="800">` : html`<div class="card-noimg"></div>`}
    ${images.length > 1 ? html`<button type="button" class="gallery-all" data-gallery-open>${t.galleryAll(images.length)}</button>` : ''}
  </div>
  <div class="gallery-side ${thumbs.length <= 2 ? 'few' : ''}">
    ${thumbs.map((f, i) => html`<button type="button" class="gallery-thumb" data-gallery-index="${i + 1}"><img src="${imgUrl(f, 'medium')}" alt="${l.title} ${i + 2}" loading="lazy" width="400" height="300"></button>`)}
  </div>
  <script type="application/json" data-gallery-images>${raw(JSON.stringify(images.map((f) => imgUrl(f, 'big'))).replace(/</g, '\\u003c'))}</script>
</section>

<section class="wrap prop-main">
  <div class="prop-content">
    <div>
      <div class="status-row">
        <span class="chip chip-green">${l.rent ? t.statusRent : t.status}</span>
        <span class="muted">${t.ref} <b>${l.ref}</b></span>
      </div>
      <h1>${l.title}</h1>
      <p class="prop-loc">${raw(PIN)} ${placeLabel(l.place, lang)}${l.region ? html`, ${regionLabel(l.region, lang)}` : ''}</p>
      <div class="stats">
        ${stats.map((s) => html`<div class="stat"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`)}
      </div>
    </div>

    <div>
      <h2>${t.featuresTitle}</h2>
      <div class="features">
        ${features.map((f) => html`<div class="feature"><div class="feature-label">${f.label}</div><div class="feature-value">${f.value}</div></div>`)}
      </div>
    </div>

    <div>
      <h2>${t.descTitle}</h2>
      <div class="prose">
        ${paragraphs.length ? paragraphs.map((p) => html`<p>${p}</p>`) : html`<p class="muted">${t.descMissing}</p>`}
        <p><a class="link-more" href="${l.url}" target="_blank" rel="noopener nofollow">${t.descSource}</a></p>
      </div>
    </div>

    ${detail?.youtube ? html`<div><h2>${t.videoTitle}</h2><div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${detail.youtube}" title="${t.videoTitle}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div>` : ''}

    <div>
      <h2>${t.mapTitle}</h2>
      <p class="lead-sm">${t.mapSub}</p>
      <a class="map-card" href="${mapUrl}" target="_blank" rel="noopener">
        <span class="chip">${t.mapNote}</span>
        <span class="map-label">${placeLabel(l.place, lang)}${l.region ? `, ${regionLabel(l.region, lang)}` : ''} — ${t.mapOpen} ↗</span>
      </a>
    </div>

    <div class="ai-box">
      <div class="label-kicker"><span class="dot"></span>${t.aiKicker}</div>
      <h2>${t.aiTitle}</h2>
      <p class="muted">${t.aiSub}</p>
      <form class="ai-form" data-ai-ask data-lang="${lang}" data-listing="${l.id}">
        <input name="q" placeholder="${t.aiPhProp}" maxlength="400" required>
        <button type="submit" class="btn btn-primary">${t.aiAsk}</button>
      </form>
      <div class="chips chips-sm">${t.aiChips.map((c) => html`<button type="button" class="pill" data-ai-chip>${c}</button>`)}</div>
      <div class="ai-result" hidden></div>
    </div>
  </div>

  <aside class="prop-aside" id="contact">
    ${agentCard(lang, { listing: l })}
    <p class="muted small viewing-note">${t.viewingNote}</p>
  </aside>
</section>

${similar.length ? html`<section class="wrap section">
  <h2>${t.similarTitle}</h2>
  ${cardGrid(similar, lang)}
</section>` : ''}

<div class="lightbox" data-lightbox hidden>
  <button type="button" class="lb-close" data-lb-close aria-label="Close">×</button>
  <button type="button" class="lb-prev" data-lb-prev aria-label="Previous">‹</button>
  <img alt="">
  <button type="button" class="lb-next" data-lb-next aria-label="Next">›</button>
  <div class="lb-count"></div>
</div>`;

  const site = (env?.SITE_URL || `https://${SITE.domain}`).replace(/\/$/, '');
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: l.title,
      url: site + href(lang, listingPath(l)),
      image: images.slice(0, 5).map((f) => site + imgUrl(f, 'big')),
      description: paragraphs[0] || `${l.type}, ${l.place}, ${l.region}`,
      offers: { '@type': 'Offer', price: l.price, priceCurrency: 'EUR', availability: 'https://schema.org/InStock', businessFunction: l.rent ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell' },
      address: { '@type': 'PostalAddress', addressLocality: town, addressRegion: l.region, addressCountry: 'BG' },
    },
  ];

  const desc = paragraphs[0]?.slice(0, 160) || `${typeLabel(l.type, lang)} · ${placeLabel(l.place, lang)} · ${fmtPrice(l, lang)}`;
  return page({ lang, path: listingPath(l), title: l.title, description: desc, body, jsonLd, image: main ? imgUrl(main, 'big') : null, updatedAt: data.fetchedAt, env, pageClass: 'property' });
}

function mergeImages(cardImages = [], detailImages = []) {
  const out = [...(detailImages || [])];
  for (const f of cardImages || []) if (!out.includes(f)) out.push(f);
  return out;
}

const PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6F8A6A" stroke-width="1.8" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

export function renderNotFound({ lang, env, path = '/' }) {
  const t = T[lang];
  const body = html`<section class="wrap section notfound"><h1>${t.notFoundTitle}</h1><p class="lead-sm">${t.notFoundSub}</p><a class="btn btn-primary btn-pill" href="${href(lang, '/imoti')}">${t.navProps}</a> <a class="btn btn-ghost btn-pill" href="${href(lang, '/')}">${t.backHome}</a></section>`;
  return page({ lang, path, title: t.notFoundTitle, body, env, noindex: true });
}
