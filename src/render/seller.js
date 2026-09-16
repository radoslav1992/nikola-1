import { html } from './html.js';
import { T, AGENT } from './i18n.js';
import { page, href, telHref, waLink } from './layout.js';
import { contactForm } from './components.js';

export function renderSeller({ lang, env }) {
  const t = T[lang];
  const body = html`<section class="wrap section seller-page">
    <nav class="crumbs"><a href="${href(lang, '/')}">${t.crumbHome}</a><span>/</span><span>${t.sellerLink}</span></nav>
    <div class="two-col"><div><p class="kicker">${t.sellerLink}</p><h1>${t.sellerTitle}</h1><p class="lead-sm">${t.sellerSub}</p>
      <div class="btn-row"><a class="btn btn-outline" href="${telHref(AGENT.mobile)}">${AGENT.mobile}</a><a class="btn btn-ghost" href="${waLink(lang === 'en' ? 'Hello Nikola, I have a property to sell.' : 'Здравейте, Никола, имам имот за продажба.')}" target="_blank" rel="noopener">WhatsApp</a></div></div>
      <div id="contact" class="panel">${contactForm(lang, { seller: true })}</div></div>
  </section>`;
  return page({ lang, path: '/predlozhete-imot', title: t.sellerTitle, description: t.sellerSub, body, env });
}
