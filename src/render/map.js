import { html, raw } from './html.js';
import { T, CATEGORIES, typeLabel, placeLabel, regionLabel, fmtPrice } from './i18n.js';
import { page, href } from './layout.js';
import { imgUrl, listingPath, viewSwitch } from './components.js';
import { applyFilters } from '../catalog.js';
import { toMapPoints } from '../geo.js';

export function renderMap({ lang, data, filters, query, env }) {
  const t = T[lang];
  const filtered = applyFilters(data.items, filters);
  const points = toMapPoints(filtered).map((p) => ({
    ...p,
    url: href(lang, listingPath({ id: p.id, slug: p.slug, title: p.title })),
    img: p.img ? imgUrl(p.img, 'medium') : null,
    priceLabel: fmtPrice({ price: p.price, rent: p.rent }, lang),
    typeLabel: typeLabel(p.type, lang),
    placeLabel: `${placeLabel(p.place, lang)}${p.region ? ` · ${regionLabel(p.region, lang)}` : ''}`,
  }));
  const qsFor = (cat) => {
    const p = new URLSearchParams(query || '');
    if (cat) p.set('cat', cat); else p.delete('cat');
    const s = p.toString();
    return href(lang, '/karta') + (s ? `?${s}` : '');
  };

  const body = html`
<section class="wrap map-toolbar">
  <div>
    <nav class="crumbs"><a href="${href(lang, '/')}">${t.crumbHome}</a><span>/</span><a href="${href(lang, '/imoti')}">${t.navProps}</a><span>/</span><span>${t.navMap}</span></nav>
    <h1 style="margin-top:6px">${t.mapTitle2}</h1>
    <p class="muted small" style="margin-top:6px">${t.mapSub2}</p>
  </div>
  <div class="results-tools">
    <span class="results-count">${t.mapCount(points.length)}</span>
    ${viewSwitch(lang, { active: 'map', query })}
  </div>
</section>
<section class="wrap">
  <div class="chips chips-sm" style="margin-bottom:14px">
    <a class="pill ${!filters.cat ? 'on' : ''}" href="${qsFor('')}">${t.fTypeAny}</a>
    ${CATEGORIES.map((c) => {
      const n = data.items.filter(c.test).length;
      return n ? html`<a class="pill ${filters.cat === c.key ? 'on' : ''}" href="${qsFor(c.key)}">${t[c.label]} <sup>${n}</sup></a>` : '';
    })}
  </div>
  <div class="map-frame">
    <div id="map" data-map data-lang="${lang}" data-open="${t.openListing}" data-approx="${t.approxLocation}" data-exact="${t.exactLocation}"></div>
    <div class="map-legend">${t.approxLocation}</div>
  </div>
  <script type="application/json" data-map-points>${raw(JSON.stringify(points).replace(/</g, '\\u003c'))}</script>
  <noscript><p class="empty">${lang === 'en' ? 'The map needs JavaScript.' : 'Картата изисква JavaScript.'} <a href="${href(lang, '/imoti')}">${t.listView}</a></p></noscript>
</section>`;

  return page({ lang, path: '/karta', title: t.mapTitle2, description: t.mapSub2, body, updatedAt: data.fetchedAt, env, pageClass: 'map', leaflet: true, noindex: Boolean(query) });
}
