/**
 * Builds data/seed.json — the 24 offers from page 1 of
 * https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/ as captured on 2026-09-05.
 *
 * The Worker ships this file so the site renders real listings on the very first request,
 * before the live scrape has run (and as a last-resort fallback if suprimmo.bg is unreachable).
 *
 * Compact row format:
 * [id, ref, slug, title, type, place, region, area, plotArea, bedrooms, floors, price, oldPrice, discount, pricePerSqm, rent, akt16, imgStamp, imgNums]
 */
import { writeFileSync } from 'node:fs';

const REGION = { G: 'Габровска област', L: 'Ловешка област', VT: 'Великотърновска област' };
const T = { K: 'Къща', P: 'Парцел в регулация', Z: 'Земеделска земя', B: 'Бунгало', S: 'Склад', M: 'Магазин' };

const rows = [
  [90511, 'VT 90511', 'ureguliran-pozemlen-imot-s-pup-na-glaven-pat-sofiya-varna-blizo-do-sevlievo', 'Урегулиран поземлен имот с ПУП на главен път София – Варна, близо до Севлиево', 'P', 'близо до гр. Севлиево', 'G', 7399, null, null, null, 110000, 179000, 39, 15, false, false, 1783496567, [1, 2, 3]],
  [89460, 'VT 89460', 'dvuetajna-kashta-v-selo-na-35-km-ot-pavlikeni', 'Двуетажна къща в село на 35 км от Павликени', 'K', 'близо до гр. Ловеч', 'L', 120, 1000, 2, 2, 15500, null, null, null, false, true, 1788593759, [1, 2, 3]],
  [102251, 'VT 102251', 'masivna-dvuetajna-kashta-s-dvor-ureguliran-partsel-samo-na-19-km-ot-grad-apriltsi', 'Масивна двуетажна къща с двор + урегулиран парцел само на 19 км от град Априлци', 'K', 'близо до гр. Севлиево', 'G', 118, 2248, 2, 2, 75000, null, null, null, false, true, 1760989139, [1, 2, 3]],
  [99093, 'VT 99093', 'tri-uregulirani-partsela-s-obshta-plosht-ot-4448-kvm-i-panoramna-gledka-kam-stara-planina-samo-na-15-km-ot-gabrovo', 'Три урегулирани парцела с обща площ от 4448 кв.м и панорамна гледка към Стара планина – само на 15 км от Габрово', 'P', 'близо до гр. Габрово', 'G', 4448, null, null, null, 21500, 25500, 16, 5, false, false, 1747680472, [1, 2, 3]],
  [23408, 'VT 1025', 'dvuetajna-masivna-kashta-v-selo-na-35-km-ot-veliko-tarnovo', 'Двуетажна, масивна къща в село на 35 км от Велико Търново', 'K', 'близо до гр. Велико Търново', 'VT', 120, 1200, 2, 2, 30500, null, null, null, false, true, 1743077686, [1, 2, 3]],
  [104137, 'VT 104137', 'ednoetajna-kashta-s-golyam-dvor-v-kvartal-na-grad-apriltsi', 'Едноетажна къща с голям двор в квартал на град Априлци', 'K', 'гр. Априлци', 'L', 103, 1753, 2, 1, 67000, null, null, null, false, true, 1736932650, [1, 2, 3]],
  [95663, 'VT 95663', 'unikalen-imot-s-mnogo-zemya-samo-na-11-km-ot-gr-apriltsi', 'Уникален имот с много земя само на 11 км от гр. Априлци', 'K', 'близо до гр. Априлци', 'L', 883, 15000, null, 3, 172200, null, null, null, false, false, 1723120704, [1, 2, 3]],
  [107065, 'VT 107065', 'otlichno-rabotesht-biznes-sas-sobstvena-fets-samo-na-120-km-ot-sofiya', 'Отлично работещ бизнес със собствена ФЕЦ само на 120 км от София', 'K', 'гр. Тетевен', 'L', 300, 404, 4, 3, 370500, null, null, null, false, true, 1723121103, [1, 2, 4]],
  [104406, 'VT 104406', 'upi-na-3-km-ot-tsentara-na-grad-apriltsi', 'УПИ на 3 км от центъра на град Априлци', 'P', 'гр. Априлци', 'L', 7118, null, null, null, 42000, null, null, 6, false, false, 1783496567, [1, 2, 3]],
  [98712, 'VT 98712', 'dvuetajna-kashta-s-golyam-dvor-samo-na-7-km-ot-grad-sevlievo', 'Двуетажна къща с голям двор само на 7 км от град Севлиево', 'K', 'близо до гр. Севлиево', 'G', 96, 1700, 2, 2, 19500, null, null, null, false, true, 1674719554, [1, 2, 3]],
  [104352, 'VT 104352', 'planinski-imot-s-dvor-samo-na-10-km-ot-grad-apriltsi', 'Планински имот с двор само на 10 км от град Априлци', 'K', 'близо до гр. Априлци', 'L', 82, 1000, 2, 2, 33000, null, null, null, false, true, 1774266963, [1, 2, 3]],
  [90626, 'VT 90626', 'zemedelska-zemya-v-promishlena-zona-na-grad-sevlievo', 'Земеделска земя в Промишлена зона на град Севлиево', 'Z', 'гр. Севлиево', 'G', 22051, null, null, null, 30880, null, null, 1.4, false, false, 1729498417, [1, 2, 3]],
  [88081, 'VT 88081', 'zemedelska-zemya-v-promishlena-zona-na-grad-sevlievo', 'Земеделска земя в Промишлена зона на град Севлиево', 'Z', 'гр. Севлиево', 'G', 27680, null, null, null, 38800, null, null, 1.4, false, false, 1729498716, [1, 2, 3]],
  [90987, 'VT 90987', 'masivna-dvuetajna-kashta-s-dvor-blizo-do-yazovir', 'Масивна двуетажна къща с двор, близо до язовир', 'K', 'близо до гр. Велико Търново', 'VT', 130, 1000, 3, 2, 21100, null, null, null, false, true, 1788593201, [1, 2, 3]],
  [102271, 'VT 102271', 'bungalo-s-dvor-i-neveroyatna-panorama-kam-balkana', 'Бунгало с двор и невероятна панорама към Балкана', 'B', 'близо до гр. Севлиево', 'G', 23, null, 1, 1, 12000, null, null, null, false, true, 1679480876, [1, 2, 3]],
  [102276, 'VT 102276', 'upi-s-osnovi-na-stara-saborena-kashta-samo-na-19-km-ot-apriltsi', 'УПИ с основи на стара съборена къща само на 19 км от Априлци', 'P', 'близо до гр. Севлиево', 'G', 1143, null, null, null, 12000, null, null, 10, false, true, 1729686587, [1, 2, 3]],
  [88083, 'VT 88083', 'nezastroen-imot-za-proizvodstvo-skladova-i-logistichna-baza', 'Незастроен имот за производство, складова и логистична база', 'P', 'гр. Севлиево', 'G', 4120, null, null, null, 39000, null, null, 9, false, false, 1647501365, [1, 2, 3]],
  [88131, 'VT 88131', 'nezastroen-imot-za-proizvodstvo-skladova-i-logistichna-baza', 'Незастроен имот за производство, складова и логистична база', 'P', 'гр. Севлиево', 'G', 9902, null, null, null, 93600, null, 53, 9, false, false, 1647501269, [1, 2, 3]],
  [91005, 'VT 91005', 'skladova-baza-sas-smeseno-prednaznachenie-v-grad-sevlievo', 'Складова база със смесено предназначение в град Севлиево', 'S', 'гр. Севлиево', 'G', 1350, null, null, 3, 2308, null, null, null, true, false, 1611840709, [1, 2, 3]],
  [142147, 'VT 142147', 'mnogofunktsionalen-biznes-imot-s-plosht-1127-kvm-v-tsentara-na-gabrovo', 'Многофункционален бизнес имот с площ 1127 кв.м в центъра на Габрово', 'M', 'гр. Габрово / кв. Център', 'G', 1127, null, null, null, 420000, null, null, 373, false, true, 1788255769, [1, 2, 3]],
  [141989, 'VT 141989', 'kashta-s-dvor-2068-kvm-na-97-km-ot-sofiya-po-am-hemus', 'Къща с двор 2068 кв.м, на 97 км от София по АМ „Хемус“', 'K', 'с. Орешене', 'L', 122, 2068, 3, 2, 62900, null, null, null, false, true, 1787901016, [1, 2, 3]],
  [142012, 'VT 142012', 'kashta-s-dvor-i-garaj-s-udoben-dostap-po-am-hemus', 'Къща с двор и гараж с удобен достъп по АМ „Хемус“', 'K', 'с. Орешене', 'L', 84, 758, 2, null, 62500, null, null, null, false, true, 1787668735, [1, 2, 3]],
  [141861, 'VT 141861', 'dvuetajna-kashta-s-dvor-i-stopanski-postroyki-blizo-do-pavlikeni', 'Двуетажна къща с двор и стопански постройки, близо до Павликени', 'K', 'близо до гр. Павликени', 'VT', 132, 684, 2, 2, 29500, null, null, null, false, true, 1787058254, [1, 2, 3]],
  [141892, 'VT 141892', 'avtentichen-selski-imot-s-dve-kashti-i-3700-kvm-zemya-blizo-do-sevlievo-i-gabrovo', 'Автентичен селски имот с две къщи и 3700 кв.м земя, близо до Севлиево и Габрово', 'K', 'близо до гр. Севлиево', 'G', 174, 3700, 3, 2, 140000, null, null, null, false, true, 1787059863, [1, 2, 3]],
];

const items = rows.map((r, order) => {
  const [id, ref, slug, title, type, place, region, area, plotArea, bedrooms, floors, price, oldPrice, discount, pricePerSqm, rent, akt16, stamp, nums] = r;
  return {
    id, ref,
    url: `https://www.suprimmo.bg/imot-${id}-${slug}/`,
    slug, title, type: T[type], place, region: REGION[region],
    area, plotArea, bedrooms, floors, price, oldPrice, discount, pricePerSqm,
    rent, akt16, reduced: discount != null || oldPrice != null,
    images: nums.map((n) => `${stamp}T${id}_${n}.jpg`),
    order,
  };
});

const seed = {
  items,
  total: 201,
  pages: 9,
  failedPages: [],
  fetchedAt: '2026-09-05T00:00:00.000Z',
  source: 'https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/',
  seed: true,
};

writeFileSync(new URL('../data/seed.json', import.meta.url), JSON.stringify(seed, null, 2) + '\n');
console.log(`Wrote data/seed.json with ${items.length} listings`);
