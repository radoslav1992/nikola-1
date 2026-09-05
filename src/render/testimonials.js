import { html, raw } from './html.js';
import { T, fmtDate, transliterate } from './i18n.js';
import { page, href } from './layout.js';
import { FEEDBACK_URL } from '../testimonials.js';

function initials(name, lang) {
  const n = (name || '').trim();
  if (!n) return lang === 'en' ? 'C' : 'К';
  return n.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function displayName(t, lang) {
  if (!t.name) return T[lang].anonymous;
  return lang === 'en' && /[а-я]/i.test(t.name) ? transliterate(t.name) : t.name;
}

export function reviewCard(t, lang, { clamp = true, listings = null } = {}) {
  const tt = T[lang];
  const stars = t.rating ? '★'.repeat(Math.round(t.rating)) + '☆'.repeat(5 - Math.round(t.rating)) : '';
  const propId = t.property ? parseInt(String(t.property).replace(/\D/g, ''), 10) : null;
  const listing = propId && listings ? listings.find((l) => l.id === propId || l.ref.replace(/\D/g, '') === String(propId)) : null;
  const original = t.lang || 'bg';
  const translated = original !== lang && t[`text_${lang}`];
  const text = translated || t.text;
  const note = translated ? tt.translatedFrom[original] : '';
  return html`<article class="review" lang="${translated ? lang : original}">
  ${stars ? html`<div class="review-stars" aria-label="${t.rating}/5">${stars}</div>` : ''}
  <p class="review-text ${clamp ? 'clamp' : ''}">${text}</p>
  <div class="review-foot">
    <span class="review-avatar" aria-hidden="true">${initials(t.name, lang)}</span>
    <div>
      <div class="review-name">${displayName(t, lang)}</div>
      <div class="review-meta">${[t.date ? fmtDate(t.date, lang) : null, note || null, t.property ? (listing ? html`<a href="${href(lang, `/imot/${listing.id}/${listing.slug}`)}">${tt.reviewProperty} ${t.property}</a>` : `${tt.reviewProperty} ${t.property}`) : null].filter(Boolean).map((x, i) => html`${i ? ' · ' : ''}${x}`)}</div>
    </div>
  </div>
</article>`;
}

/** Home-page section; renders nothing when there are no testimonials. */
export function reviewsSection(lang, testimonials, { limit = 3 } = {}) {
  const t = T[lang];
  const items = testimonials?.items || [];
  if (!items.length) return '';
  const pick = items.slice(0, limit);
  return html`<section id="reviews" class="wrap section">
  <div class="section-head">
    <div><h2>${t.reviewsTitle}</h2><p class="muted">${t.reviewsSub}</p></div>
    <a class="link-more" href="${href(lang, '/otzivi')}">${t.reviewsAll}</a>
  </div>
  <div class="grid reviews">${pick.map((r) => reviewCard(r, lang))}</div>
</section>`;
}

export function renderReviews({ lang, data, testimonials, env }) {
  const t = T[lang];
  const items = testimonials?.items || [];
  const body = html`
<section class="wrap page-head">
  <nav class="crumbs"><a href="${href(lang, '/')}">${t.crumbHome}</a><span>/</span><span>${t.navReviews}</span></nav>
  <h1>${t.reviewsTitle}</h1>
  <p class="muted">${t.reviewsSub}</p>
</section>
<section class="wrap section-sm reviews-page">
  <div class="results-head">
    <span class="results-count">${t.reviewsCount(items.length)}</span>
    <a class="link-more" href="${FEEDBACK_URL}" target="_blank" rel="noopener nofollow">${t.reviewsSource}</a>
  </div>
  ${items.length ? html`<div class="grid reviews">${items.map((r) => reviewCard(r, lang, { clamp: false, listings: data?.items }))}</div>` : html`<p class="empty">${t.reviewsEmpty}</p>`}
</section>`;

  const jsonLd = items.length
    ? [{
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: 'Никола Иванов',
        review: items.slice(0, 20).map((r) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r.name || t.anonymous },
          ...(r.date ? { datePublished: r.date } : {}),
          ...(r.rating ? { reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 } } : {}),
          reviewBody: r.text,
        })),
      }]
    : [];

  return page({ lang, path: '/otzivi', title: t.reviewsTitle, description: t.reviewsSub, body, jsonLd, updatedAt: testimonials?.fetchedAt, env, pageClass: 'reviews' });
}

export { raw };
