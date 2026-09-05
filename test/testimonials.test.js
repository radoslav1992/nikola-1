import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTestimonials, parseDate, paginationLinks, fetchTestimonials, FEEDBACK_URL } from '../src/testimonials.js';

const SAMPLE = `<!doctype html><html><head><meta charset="utf-8">
<script type="application/ld+json">{"@type":"RealEstateAgent","name":"x","review":[{"@type":"Review","author":{"@type":"Person","name":"Мария Петрова"},"datePublished":"2025-11-03","reviewRating":{"@type":"Rating","ratingValue":5},"reviewBody":"Никола беше изключително отзивчив и професионален по време на цялата сделка. Препоръчвам го горещо."}]}</script>
</head><body>
<div class="feedback-list">
  <div class="feedback-item">
    <div class="feedback-head"><b>Иван Георгиев</b> <span class="date">12.06.2026</span> <span class="rating"><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i></span></div>
    <p>Купихме къща близо до Севлиево с помощта на Никола. Всичко беше организирано перфектно – огледи, документи, нотариус. Благодарим за търпението и честността! Реф. VT 98712</p>
  </div>
  <div class="feedback-item">
    <div class="feedback-head"><b>John Smith</b> <span class="date">March 2026</span></div>
    <p>Nikola helped us find a village house within our budget and guided us through every step of the purchase. Highly recommended for foreign buyers.</p>
  </div>
  <div class="feedback-item">
    <div class="feedback-head"><b>Cookie notice</b></div>
    <p>Този сайт използва бисквитки, за да подобри вашето преживяване. Всички права запазени © 2026.</p>
  </div>
</div>
<ul class="pagination"><li><a href="/customers/feedback/index.html?seller=467&amp;page=2">2</a></li><li><a href="index.html?seller=467&page=3">3</a></li><li><a href="index.html?seller=999&page=2">other</a></li></ul>
</body></html>`;

test('parses testimonials from JSON-LD and from repeated blocks, skips boilerplate', () => {
  const items = parseTestimonials(SAMPLE);
  assert.equal(items.length, 3);
  assert.equal(items[0].name, 'Мария Петрова');
  assert.equal(items[0].date, '2025-11-03');
  assert.equal(items[0].rating, 5);
  const ivan = items.find((t) => t.name === 'Иван Георгиев');
  assert.ok(ivan);
  assert.equal(ivan.date, '2026-06-12');
  assert.equal(ivan.rating, 5);
  assert.equal(ivan.property, 'VT 98712');
  assert.equal(ivan.lang, 'bg');
  assert.match(ivan.text, /^Купихме къща/);
  const john = items.find((t) => t.name === 'John Smith');
  assert.equal(john.date, '2026-03-01');
  assert.equal(john.lang, 'en');
  assert.equal(john.rating, null);
});

test('parseDate handles numeric and month-name forms', () => {
  assert.equal(parseDate('публикувано на 5.3.2024'), '2024-03-05');
  assert.equal(parseDate('2024-12-31'), '2024-12-31');
  assert.equal(parseDate('15 септември 2025'), '2025-09-15');
  assert.equal(parseDate('no date here'), null);
});

test('pagination links keep only seller=467 pages, absolutised and de-duplicated', () => {
  const links = paginationLinks(SAMPLE, FEEDBACK_URL);
  assert.deepEqual(links, [
    'https://www.luximmo.com/customers/feedback/index.html?seller=467&page=2',
    'https://www.luximmo.com/customers/feedback/index.html?seller=467&page=3',
  ]);
});

test('fetchTestimonials walks pages and refuses an empty result', async () => {
  const seen = [];
  const fake = async (url) => {
    seen.push(url);
    const html = url.includes('page=') ? SAMPLE.replace('Иван Георгиев', 'Петър Стоянов').replace('Купихме къща', 'Продадохме парцел') : SAMPLE;
    return { ok: true, text: async () => html };
  };
  const res = await fetchTestimonials(fake);
  assert.equal(seen.length, 3);
  assert.ok(res.items.length >= 4 && res.items.length <= 5);
  await assert.rejects(fetchTestimonials(async () => ({ ok: true, text: async () => '<html><body>nothing</body></html>' })), /No testimonials/);
});

test('parses the real LUXIMMO feedback markup (comment-by / comment-container)', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('./fixtures/feedback-luximmo.html', import.meta.url), 'utf8');
  const items = parseTestimonials(html);
  assert.equal(items.length, 6);
  assert.deepEqual(items.map((t) => t.name), ['Apostol Tolev', 'Marina Gribacova', 'Fedor Mikhailov', 'Andre Zimmermann', 'Roger', 'Apartments Cats']);
  assert.deepEqual(items.map((t) => t.date), ['2026-07-29', '2026-05-12', '2026-05-12', '2026-04-22', '2024-10-25', '2024-09-25']);
  assert.match(items[0].text, /^Nikola is an excellent realtor/);
  assert.match(items[4].text, /friendly and competent\. Solutions are not only sought, but also found\. We always felt welcome/);
  assert.ok(items.every((t) => t.lang === 'en' && t.rating === null && t.property === null));
});
