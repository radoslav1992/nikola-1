import { html, raw } from './html.js';
import { T, AGENT, SITE, CATEGORIES, typeLabel, placeLabel, transliterate, fmtPrice } from './i18n.js';
import { page, href, waLink, viberLink, telHref } from './layout.js';
import { cardGrid, contactForm, imgUrl, listingHref } from './components.js';
import { distinctTypes, regionChips } from '../catalog.js';
import { reviewsSection } from './testimonials.js';

export function renderHome({ lang, data, env, testimonials = null }) {
  const t = T[lang];
  const items = data.items;
  const featured = items.slice(0, 6);
  const reduced = items.filter((l) => l.reduced && !l.rent).slice(0, 4);
  const hero = items.find((l) => /къщ/i.test(l.type) && l.images?.length) || items.find((l) => l.images?.length);
  const heroImg = hero?.images?.[0];
  const regions = regionChips(items).slice(0, 12);
  const types = distinctTypes(items);

  const categories = CATEGORIES.map((c) => {
    const matches = items.filter(c.test);
    const withImg = matches.find((l) => l.images?.length);
    return { ...c, count: matches.length, img: withImg?.images?.[0] };
  }).filter((c) => c.count > 0);

  const body = html`
<section class="hero wrap">
  <div class="hero-copy">
    <p class="kicker">${t.heroKicker}</p>
    <h1>${t.heroTitle}</h1>
    <p class="lead">${t.heroSub}</p>
    <div class="btn-row">
      <a class="btn btn-primary btn-pill" href="${href(lang, '/imoti')}">${t.heroCta}</a>
      <a class="btn btn-ghost btn-pill" href="${href(lang, '/karta')}">${t.navMap}</a>
    </div>
    <div class="hero-stats">
      <span>${t.heroStat(items.length)}</span>
      <span>${t.heroStat2}</span>
      <span>BG · EN · ES</span>
    </div>
  </div>
  <div class="hero-media">
    ${heroImg ? html`<img src="${imgUrl(heroImg, 'big')}" alt="${hero.title}" fetchpriority="high" width="1200" height="960">` : ''}
    ${hero ? html`<a class="hero-caption" href="${listingHref(hero, lang)}"><span>${typeLabel(hero.type, lang)} · ${placeLabel(hero.place, lang)}<small>${hero.title}</small></span><b>${fmtPrice(hero, lang)}</b></a>` : ''}
  </div>
</section>

<section class="wrap search-section">
  <div class="panel search-panel">
    <form class="filters" method="get" action="${href(lang, '/imoti')}">
      <div class="label-kicker">${t.searchFilters}</div>
      <div class="filters-grid">
        <label>${t.fLocation}<input name="loc" placeholder="${t.fLocationPh}" list="loc-list"></label>
        <datalist id="loc-list">${regions.map((r) => html`<option value="${r.key}">${lang === 'en' ? transliterate(r.label) : r.label}</option>`)}</datalist>
        <label>${t.fBudget}<select name="budget"><option value="">${t.fBudgetAny}</option><option value="0-30000">${t.fBudget1}</option><option value="30000-60000">${t.fBudget2}</option><option value="60000-120000">${t.fBudget3}</option><option value="120000-">${t.fBudget4}</option></select></label>
        <label>${t.fType}<select name="type"><option value="">${t.fTypeAny}</option>${types.map((ty) => html`<option value="${ty}">${typeLabel(ty, lang)}</option>`)}</select></label>
        <label>${t.fDeal}<select name="deal"><option value="">${t.fDealAny}</option><option value="sale">${t.fSale}</option><option value="rent">${t.fRent}</option></select></label>
        <div class="filters-submit"><button type="submit" class="btn btn-dark">${t.fSearch}</button></div>
      </div>
    </form>
    <div class="ai-search">
      <div class="label-kicker"><span class="dot"></span>${t.searchAi}</div>
      <form class="ai-form" data-ai-search data-lang="${lang}">
        <input name="q" placeholder="${t.aiPh}" maxlength="400" required>
        <button type="submit" class="btn btn-primary">${t.aiGo}</button>
      </form>
      <p class="ai-example">${t.aiExample}</p>
      <div class="ai-result" hidden></div>
    </div>
  </div>
</section>

<section id="properties" class="wrap section">
  <div class="section-head">
    <h2>${t.featTitle}</h2>
    <a class="link-more" href="${href(lang, '/imoti')}">${t.featAll}</a>
  </div>
  ${cardGrid(featured, lang, { eagerFirst: true })}
</section>

<section class="wrap section">
  <div class="section-head">
    <h2>${t.lifeTitle}</h2>
    <a class="link-more" href="${href(lang, '/karta')}">${t.mapTitle2} →</a>
  </div>
  <div class="grid tiles">
    ${categories.map((c) => html`<a class="tile" href="${href(lang, `/imoti?cat=${c.key}`)}">
      <div class="tile-media">${c.img ? html`<img src="${imgUrl(c.img, 'medium')}" alt="" loading="lazy" width="400" height="400">` : ''}</div>
      <div class="tile-label">${t[c.label]} <span class="muted">(${c.count})</span></div>
    </a>`)}
  </div>
</section>

<section id="regions" class="wrap section">
  <div class="two-col">
    <div>
      <h2>${t.regTitle}</h2>
      <p class="lead-sm">${t.regSub}</p>
    </div>
    <div class="chips">
      ${regions.map((r) => html`<a class="pill" href="${href(lang, `/imoti?loc=${encodeURIComponent(r.key)}`)}">${lang === 'en' ? transliterate(r.label) : r.label} <sup>${r.count}</sup></a>`)}
    </div>
  </div>
</section>

${reduced.length ? html`<section id="reduced" class="wrap section">
  <div class="section-head">
    <div><h2>${t.reducedTitle}</h2><p class="muted">${t.reducedSub}</p></div>
    <a class="link-more" href="${href(lang, '/imoti?cat=reduced')}">${t.featAll}</a>
  </div>
  ${cardGrid(reduced, lang)}
</section>` : ''}

${reviewsSection(lang, testimonials, { limit: 3 })}

<section id="about" class="wrap section">
  <div class="about-panel">
    <div class="about-photo"><img src="/img/agent.jpg" alt="${AGENT.name[lang]}" loading="lazy" width="480" height="600"></div>
    <div>
      <p class="kicker">${t.aboutKicker}</p>
      <h2>${t.aboutTitle}</h2>
      <p class="lead-sm">${t.aboutP1}</p>
      <p class="lead-sm">${t.aboutP2}</p>
      <dl class="about-facts">
        <div><dt>${t.aboutOffice}</dt><dd><a href="${AGENT.mapsUrl}" target="_blank" rel="noopener">${AGENT.address[lang]}</a></dd></div>
        <div><dt>${t.aboutLanguages}</dt><dd>${AGENT.languages[lang]}</dd></div>
        <div><dt>${t.aboutHours}</dt><dd>${AGENT.hours[lang].map((h) => html`<span>${h}</span>`)}</dd></div>
      </dl>
      <div class="btn-row">
        <a class="btn btn-dark btn-pill" href="${telHref(AGENT.mobile)}">${AGENT.mobile}</a>
        <a class="btn btn-outline btn-pill" href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn btn-outline btn-pill" href="${viberLink()}">Viber</a>
      </div>
    </div>
  </div>
</section>

<section class="wrap section">
  <h2 style="margin-bottom:22px">${t.trustTitle}</h2>
  <div class="trust">
    <div class="trust-item"><span class="ico">${raw(ICON_EYE)}</span><h3>${t.trust1t}</h3><p>${t.trust1}</p></div>
    <div class="trust-item"><span class="ico">${raw(ICON_DOC)}</span><h3>${t.trust2t}</h3><p>${t.trust2}</p></div>
    <div class="trust-item"><span class="ico">${raw(ICON_GLOBE)}</span><h3>${t.trust3t}</h3><p>${t.trust3}</p></div>
  </div>
</section>

<section id="contact" class="wrap section contact-section">
  <div class="two-col">
    <div>
      <h2>${t.contactTitle}</h2>
      <p class="lead-sm">${t.contactSub}</p>
      <ul class="contact-list">
        <li><a href="${telHref(AGENT.mobile)}"><span class="ico">${raw(ICON_PHONE)}</span>${AGENT.mobile}</a></li>
        <li><a href="${telHref(AGENT.office)}"><span class="ico">${raw(ICON_PHONE)}</span>${AGENT.office} <span class="muted">(${lang === 'en' ? 'office' : 'офис'})</span></a></li>
        <li><a href="${waLink()}" target="_blank" rel="noopener"><span class="ico">WA</span>WhatsApp ${AGENT.whatsapp}</a></li>
        <li><a href="${viberLink()}"><span class="ico">VB</span>Viber</a></li>
        <li><a href="${AGENT.mapsUrl}" target="_blank" rel="noopener"><span class="ico">${raw(ICON_PIN)}</span>${AGENT.address[lang]}</a></li>
      </ul>
    </div>
    <div class="panel">${contactForm(lang)}</div>
  </div>
</section>`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: `${SITE.name} — ${AGENT.name.bg}`,
      alternateName: SITE.nameLatin,
      url: (env?.SITE_URL || `https://${SITE.domain}`) + href(lang, '/'),
      image: (env?.SITE_URL || `https://${SITE.domain}`) + '/img/agent.jpg',
      telephone: AGENT.mobile,
      address: { '@type': 'PostalAddress', streetAddress: 'ул. Никола Пиколо 23', addressLocality: 'Велико Търново', postalCode: '5000', addressCountry: 'BG' },
      areaServed: ['Велико Търново', 'Габрово', 'Севлиево', 'Априлци', 'Ловеч', 'Тетевен', 'Павликени'],
      knowsLanguage: ['bg', 'en', 'es'],
    },
  ];

  return page({ lang, path: '/', description: t.metaHome, body, jsonLd, image: heroImg ? imgUrl(heroImg, 'big') : null, updatedAt: data.fetchedAt, env, pageClass: 'home' });
}

const ICON_EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_DOC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13h6M9 17h6"/></svg>';
const ICON_GLOBE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
const ICON_PHONE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';
const ICON_PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';
