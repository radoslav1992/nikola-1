import { html } from './html.js';
import { T, AGENT, SITE, CATEGORIES, typeLabel, placeLabel, transliterate } from './i18n.js';
import { page, href, waLink, viberLink, telHref } from './layout.js';
import { cardGrid, contactForm, imgUrl } from './components.js';
import { distinctTypes, regionChips } from '../catalog.js';

export function renderHome({ lang, data, env }) {
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
      <a class="btn btn-ghost btn-pill" href="#about">${t.heroCta2}</a>
    </div>
  </div>
  <div class="hero-media">
    ${heroImg ? html`<img src="${imgUrl(heroImg, 'big')}" alt="${hero.title}" fetchpriority="high" width="1200" height="800">` : ''}
    ${hero ? html`<a class="hero-caption" href="${href(lang, `/imot/${hero.id}/${hero.slug}`)}">${typeLabel(hero.type, lang)} · ${placeLabel(hero.place, lang)}</a>` : ''}
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

<section class="wrap section">
  <h2>${t.lifeTitle}</h2>
  <div class="grid tiles">
    ${categories.map((c) => html`<a class="tile" href="${href(lang, `/imoti?cat=${c.key}`)}">
      <div class="tile-media">${c.img ? html`<img src="${imgUrl(c.img, 'medium')}" alt="" loading="lazy" width="400" height="400">` : ''}</div>
      <div class="tile-label">${t[c.label]} <span class="muted">(${c.count})</span></div>
    </a>`)}
  </div>
</section>

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

${reduced.length ? html`<section id="reduced" class="wrap section">
  <div class="section-head">
    <div><h2>${t.reducedTitle}</h2><p class="muted">${t.reducedSub}</p></div>
    <a class="link-more" href="${href(lang, '/imoti?cat=reduced')}">${t.featAll}</a>
  </div>
  ${cardGrid(reduced, lang)}
</section>` : ''}

<section id="contact" class="wrap section contact-section">
  <div class="two-col">
    <div>
      <h2>${t.contactTitle}</h2>
      <p class="lead-sm">${t.contactSub}</p>
      <ul class="contact-list">
        <li><a href="${telHref(AGENT.mobile)}"><span class="ico">📱</span>${AGENT.mobile}</a></li>
        <li><a href="${telHref(AGENT.office)}"><span class="ico">☎</span>${AGENT.office} <span class="muted">(${lang === 'en' ? 'office' : 'офис'})</span></a></li>
        <li><a href="${waLink()}" target="_blank" rel="noopener"><span class="ico">WA</span>WhatsApp ${AGENT.whatsapp}</a></li>
        <li><a href="${viberLink()}"><span class="ico">VB</span>Viber</a></li>
        <li><a href="${AGENT.mapsUrl}" target="_blank" rel="noopener"><span class="ico">⌖</span>${AGENT.address[lang]}</a></li>
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
