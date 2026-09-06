import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseListingPage, parsePageMeta, parseDetail, pageUrl, fetchAllListings, clean } from '../src/scraper.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const page1 = readFileSync(path.join(here, 'fixtures', 'listing-page-1.html'), 'utf8');

test('page meta: total, current page, page count', () => {
  const meta = parsePageMeta(page1);
  assert.equal(meta.total, 201);
  assert.equal(meta.page, 1);
  assert.equal(meta.pages, 9);
});

test('page urls follow the site pagination scheme', () => {
  assert.equal(pageUrl(1), 'https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/');
  assert.equal(pageUrl(2), 'https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/page/2/');
});

test('parses every card in the fixture', () => {
  const { items } = parseListingPage(page1);
  assert.equal(items.length, 6);
  assert.deepEqual(items.map((i) => i.id), [90511, 89460, 107065, 90626, 91005, 142147]);
});

test('discounted plot: old price, discount, price per m²', () => {
  const [plot] = parseListingPage(page1).items;
  assert.equal(plot.title, 'Урегулиран поземлен имот с ПУП на главен път София – Варна, близо до Севлиево');
  assert.equal(plot.type, 'Парцел в регулация');
  assert.equal(plot.place, 'близо до гр. Севлиево');
  assert.equal(plot.region, 'Габровска област');
  assert.equal(plot.area, 7399);
  assert.equal(plot.plotArea, null);
  assert.equal(plot.price, 110000);
  assert.equal(plot.oldPrice, 179000);
  assert.equal(plot.discount, 39);
  assert.equal(plot.pricePerSqm, 15);
  assert.equal(plot.rent, false);
  assert.equal(plot.reduced, true);
  assert.equal(plot.akt16, false);
  assert.equal(plot.ref, 'VT 90511');
  assert.equal(plot.slug, 'ureguliran-pozemlen-imot-s-pup-na-glaven-pat-sofiya-varna-blizo-do-sevlievo');
  assert.deepEqual(plot.images, ['1783496567T90511_1.jpg', '1783496567T90511_2.jpg', '1783496567T90511_3.jpg']);
});

test('house: building + plot area, bedrooms, floors, akt 16, ref with trailing whitespace', () => {
  const house = parseListingPage(page1).items.find((i) => i.id === 89460);
  assert.equal(house.title, 'Двуетажна къща в село на 35 км от Павликени');
  assert.equal(house.type, 'Къща');
  assert.equal(house.area, 120);
  assert.equal(house.plotArea, 1000);
  assert.equal(house.bedrooms, 2);
  assert.equal(house.floors, 2);
  assert.equal(house.price, 15500);
  assert.equal(house.oldPrice, null);
  assert.equal(house.discount, null);
  assert.equal(house.akt16, true);
  assert.equal(house.reduced, false);
  assert.equal(house.ref, 'VT 89460');
  assert.equal(house.url, 'https://www.suprimmo.bg/imot-89460-dvuetajna-kashta-v-selo-na-35-km-ot-pavlikeni/');
});

test('lazy-loaded images (data-blazy) and non-sequential photo numbers are kept in order', () => {
  const biz = parseListingPage(page1).items.find((i) => i.id === 107065);
  assert.deepEqual(biz.images, ['1723121103T107065_1.jpg', '1723121103T107065_2.jpg', '1723121103T107065_4.jpg']);
  assert.equal(biz.price, 370500);
  assert.equal(biz.bedrooms, 4);
  assert.equal(biz.floors, 3);
  assert.equal(biz.place, 'гр. Тетевен');
});

test('agricultural land: fractional price per m²', () => {
  const land = parseListingPage(page1).items.find((i) => i.id === 90626);
  assert.equal(land.type, 'Земеделска земя');
  assert.equal(land.area, 22051);
  assert.equal(land.price, 30880);
  assert.equal(land.pricePerSqm, 1.4);
});

test('rental: monthly rent flag and price', () => {
  const rent = parseListingPage(page1).items.find((i) => i.id === 91005);
  assert.equal(rent.rent, true);
  assert.equal(rent.price, 2308);
  assert.equal(rent.type, 'Склад');
  assert.equal(rent.floors, 3);
  assert.equal(rent.area, 1350);
});

test('place with district separator is normalised', () => {
  const shop = parseListingPage(page1).items.find((i) => i.id === 142147);
  assert.equal(shop.place, 'гр. Габрово / кв. Център');
  assert.equal(shop.type, 'Магазин');
  assert.equal(shop.price, 420000);
  assert.equal(shop.pricePerSqm, 373);
});

test('fetchAllListings walks the pagination and de-duplicates', async () => {
  const requested = [];
  const fakeFetch = async (url) => {
    requested.push(url);
    const m = url.match(/page\/(\d+)\//);
    const page = m ? parseInt(m[1], 10) : 1;
    // Pretend there are only 3 pages, and pages 2/3 return two cards each re-using fixture markup with new ids.
    let html = page1.replace('Страницa 1 от 9', `Страницa ${page} от 3`);
    if (page > 1) {
      html = html.replace(/data-prop-id="(\d+)"/g, (_, id) => `data-prop-id="${Number(id) + page * 1000000}"`);
    }
    return { ok: true, status: 200, text: async () => html };
  };
  const result = await fetchAllListings({ fetchImpl: fakeFetch, log: () => {} });
  assert.equal(result.pages, 3);
  assert.equal(requested.length, 3);
  assert.equal(result.items.length, 18);
  assert.equal(result.total, 201);
  assert.equal(result.failedPages.length, 0);
  assert.equal(result.items[0].order, 0);
});

test('fetchAllListings refuses an empty first page (blocked / layout change)', async () => {
  const fakeFetch = async () => ({ ok: true, status: 200, text: async () => '<html><body>Access denied</body></html>' });
  await assert.rejects(fetchAllListings({ fetchImpl: fakeFetch }), /No property cards/);
});

test('detail parser: images, description heading, features, coordinates, json-ld fallback', () => {
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="Двуетажна къща в село на 35 км от Павликени - SUPRIMMO">
    <meta name="description" content="Двуетажна къща ➤ SUPRIMMO ➤ За повече посетете сайта или на ☎0883 700 335">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"x","description":"Кратко описание от JSON-LD."}</script>
    </head><body>
    <div style="background-image:url(https://static4.superimoti.bg/property-images/big/1788593759T89460_3.jpg)"></div>
    <img src="https://static4.superimoti.bg/property-images/medium/1788593759T89460_1.jpg">
    <img src="https://static4.superimoti.bg/property-images/medium/1788593759T89460_2.jpg">
    <img src="https://static4.superimoti.bg/property-images/small/1788593759T89460_12.jpg">
    <ul><li><b>Спални:</b> 2</li><li><b>Отопление:</b> <span>Печка на дърва</span></li><li><b>Година на строеж:</b> 1965</li><li><b>Тел:</b> 0883</li></ul>
    <h2>Описание</h2>
    <p>Предлагаме двуетажна масивна къща в тихо село на 35 км от Павликени. Къщата има две спални, кухня и баня, а дворът е 1000 кв.м.</p>
    <p>Селото разполага с магазин и редовен транспорт.<br>Огледи по договорка.</p>
    <h2>Местоположение</h2>
    <script>var map = {lat: 43.2134, lng: 25.3211};</script>
    <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
    </body></html>`;
  const d = parseDetail(html, 89460);
  assert.equal(d.title, 'Двуетажна къща в село на 35 км от Павликени');
  assert.deepEqual(d.images, ['1788593759T89460_1.jpg', '1788593759T89460_2.jpg', '1788593759T89460_3.jpg', '1788593759T89460_12.jpg']);
  assert.equal(d.paragraphs.length, 3);
  assert.match(d.paragraphs[0], /^Предлагаме двуетажна/);
  assert.deepEqual(d.features.map((f) => f.label), ['Спални', 'Отопление', 'Година на строеж']);
  assert.equal(d.features[1].value, 'Печка на дърва');
  assert.deepEqual(d.coords, { lat: 43.2134, lng: 25.3211 });
  assert.equal(d.youtube, 'dQw4w9WgXcQ');
});

test('detail parser falls back to JSON-LD description when no description block exists', () => {
  const html = `<html><head><script type="application/ld+json">{"@type":"Product","description":"Само описание от структурираните данни, което е достатъчно дълго за да мине проверката за минимална дължина на текста."}</script></head><body></body></html>`;
  const d = parseDetail(html, 1);
  assert.equal(d.paragraphs.length, 1);
  assert.match(d.paragraphs[0], /^Само описание/);
  assert.deepEqual(d.images, []);
});

test('clean() decodes entities and collapses whitespace', () => {
  assert.equal(clean('  Габровска област,&nbsp;България  <br> x '), 'Габровска област, България x');
  assert.equal(clean('a &amp; b &quot;c&quot; &#8211; d'), 'a & b "c" – d');
});

test('windows-1251 pages are decoded correctly (suprimmo.bg serves cp1251)', async () => {
  const { decodeHtmlBytes, decodeCp1251 } = await import('../src/scraper.js');
  // Verify the inlined table against Node's ICU decoder for every high byte.
  const all = new Uint8Array(128).map((_, i) => 0x80 + i);
  assert.equal(decodeCp1251(all), new TextDecoder('windows-1251').decode(all));

  // Encode the UTF-8 fixture as cp1251 and make sure parsing still yields Bulgarian text.
  const enc = new TextDecoder('windows-1251');
  const table = new Map();
  for (let b = 0x80; b < 0x100; b++) table.set(enc.decode(new Uint8Array([b])), b);
  const bytes = Uint8Array.from([...page1].map((ch) => (ch.charCodeAt(0) < 0x80 ? ch.charCodeAt(0) : table.get(ch) ?? 0x3f)));

  const viaHeader = decodeHtmlBytes(bytes, 'text/html; charset=windows-1251');
  assert.equal(parseListingPage(viaHeader).items[1].type, 'Къща');
  assert.equal(parseListingPage(viaHeader).items[1].price, 15500);
  assert.equal(parseListingPage(viaHeader).items[1].area, 120);

  // No header charset: sniff from <meta charset> or from the flood of U+FFFD.
  const noMeta = Uint8Array.from(bytes);
  const viaSniff = decodeHtmlBytes(noMeta, 'text/html');
  assert.equal(parseListingPage(viaSniff).items[4].type, 'Склад');
  assert.equal(parseListingPage(viaSniff).items[4].rent, true);

  // Plain UTF-8 still works.
  const utf8 = decodeHtmlBytes(new TextEncoder().encode(page1), 'text/html; charset=utf-8');
  assert.equal(parseListingPage(utf8).items.length, 6);
});

test('price parsing tolerates &euro; entities', () => {
  const html = page1.replace(/€/g, '&euro;').replace(/м²/g, 'м&sup2;');
  const items = parseListingPage(html).items;
  assert.equal(items[0].price, 110000);
  assert.equal(items[0].oldPrice, 179000);
  assert.equal(items[0].pricePerSqm, 15);
  assert.equal(items[4].price, 2308);
});

test('price parsing is independent of how the server spells the markup', () => {
  const fields = (html) => parseListingPage(html).items.map((l) => [l.id, l.price, l.oldPrice, l.discount, l.pricePerSqm, l.rent]);
  const expected = fields(page1);
  assert.ok(expected.every(([, price]) => price != null), 'baseline fixture has a price for every card');
  assert.deepEqual(expected[0].slice(1), [110000, 179000, 39, 15, false]);
  assert.deepEqual(expected[4].slice(1), [2308, null, null, null, true]);

  const variants = {
    'nbsp entity between digits': page1.replace(/(\d) (\d)/g, '$1&nbsp;$2'),
    'raw U+00A0 between digits': page1.replace(/(\d) (\d)/g, '$1 $2'),
    'no leading nbsp': page1.replace(/&nbsp;(\d)/g, '$1'),
    'numeric euro entity': page1.replace(/€/g, '&#8364;'),
    'single-quoted attributes in the price block': page1.replace(/class="(prc|color-alert |curr_conv|font-\w+)"/g, "class='$1'"),
    'extra attributes on the currency span': page1.replace(/<span class="curr_conv">/g, '<span class="curr_conv" data-cur="EUR">'),
    'price wrapped in <b>': page1.replace(/&nbsp;(\d[\d ]*) <span class="curr_conv">/g, '&nbsp;<b>$1</b> <span class="curr_conv">'),
    'collapsed whitespace': page1.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' '),
  };
  for (const [name, html] of Object.entries(variants)) {
    assert.deepEqual(fields(html), expected, name);
  }
});

test('price on request stays null instead of picking up another number', () => {
  const html = page1.replace(/&nbsp;110 000 <span class="curr_conv">€<\/span>/, 'Цена при запитване').replace(/<s class="color-alert ">179 000 <span class="curr_conv">€<\/span><\/s>/, '');
  const first = parseListingPage(html).items[0];
  assert.equal(first.price, null);
  assert.equal(first.oldPrice, null);
  assert.equal(first.pricePerSqm, 15);
});

test('prices quoted in BGN are converted to EUR at the fixed rate', () => {
  const html = page1.replace(/&nbsp;110 000 <span class="curr_conv">€<\/span>/, '&nbsp;215 141 лв.');
  const first = parseListingPage(html).items[0];
  assert.equal(first.price, 110000);
  assert.equal(first.oldPrice, 179000);
  assert.equal(first.rent, false);
});

test('parses the server HTML spelling: single-quoted attributes, hex euro entities, no .lnk anchor', () => {
  // What suprimmo actually sends (confirmed via /api/debug/source) differs from the DevTools copy
  // the fixture was taken from: attributes are single-quoted, € is &#x20AC;, and the <a class="lnk">
  // that carries a clean title only exists after the page's own scripts have run. The title then has
  // to come from the image title/alt attributes, which append the photo index and " - SUPRIMMO".
  const serverHtml = page1
    .replace(/<a class="lnk"[^>]*>/g, '<a>')
    .replace(/€/g, '&#x20AC;')
    .replace(/class="([^"]*)"/g, "class='$1'")
    .replace(/\b(alt|title|data-url|data-prop-id|href)="([^"]*)"/g, "$1='$2'");

  const { items } = parseListingPage(serverHtml);
  assert.equal(items.length, 6);

  const plot = items[0];
  assert.equal(plot.id, 90511);
  assert.equal(plot.title, 'Урегулиран поземлен имот с ПУП на главен път София – Варна, близо до Севлиево');
  assert.equal(plot.price, 110000);
  assert.equal(plot.oldPrice, 179000);
  assert.equal(plot.pricePerSqm, 15);
  assert.equal(plot.type, 'Парцел в регулация');
  assert.equal(plot.place, 'близо до гр. Севлиево');
  assert.equal(plot.region, 'Габровска област');
  assert.equal(plot.area, 7399);
  assert.ok(plot.images.length >= 2);
  assert.match(plot.url, /^https:\/\/www\.suprimmo\.bg\/imot-90511-/);

  assert.equal(items[1].title, 'Двуетажна къща в село на 35 км от Павликени');
  assert.equal(items[4].rent, true);
  assert.ok(items.every((l) => l.title && l.price != null), 'every card keeps a title and a price');
});
