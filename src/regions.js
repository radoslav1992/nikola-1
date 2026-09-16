/**
 * Groups listings into the "Discover Bulgaria" regions shown on the home page.
 * Listings only carry a place ("близо до гр. Севлиево") and a province ("Габровска област"),
 * so each region is a list of towns plus a province fallback. Copy for each region lives in i18n.js.
 */
import { townOf } from './catalog.js';

export const REGIONS = [
  {
    key: 'tarnovo',
    towns: ['Велико Търново', 'Арбанаси', 'Лясковец', 'Горна Оряховица', 'Дебелец', 'Килифарево', 'Елена', 'Златарица', 'Стражица', 'Полски Тръмбеш', 'Свищов', 'Павликени', 'Сухиндол', 'Бяла черква', 'Русаля', 'Самоводене', 'Вонеща вода'],
    province: 'Великотърновска област',
  },
  {
    key: 'gabrovo',
    towns: ['Габрово', 'Трявна', 'Дряново', 'Плачковци', 'Боженци', 'Царева ливада', 'Етъра', 'Донино', 'Поповци', 'Гъбене'],
  },
  {
    key: 'sevlievo',
    towns: ['Севлиево', 'Априлци', 'Кръвеник', 'Столът', 'Стоките', 'Батошево', 'Шумата', 'Крамолин', 'Добромирка', 'Крушево', 'Сенник', 'Градница', 'Ряховците', 'Душево', 'Агатово', 'Бяла река', 'Горна Росица', 'Дебелцово', 'Млечево', 'Богатово', 'Идилево', 'Дамяново', 'Ловнидол', 'Валевци', 'Кормянско', 'Петко Славейков', 'Буря', 'Селище', 'Хирево', 'Търхово', 'Малки Вършец', 'Горна Росица', 'Ряховците', 'Скалско', 'Велчево', 'Зелено дърво'],
    province: 'Габровска област',
  },
  {
    key: 'lovech',
    towns: ['Ловеч', 'Троян', 'Орешак', 'Чифлик', 'Шипково', 'Бели Осъм', 'Черни Осъм', 'Летница', 'Угърчин', 'Луковит', 'Дойренци', 'Славяни', 'Александрово', 'Лисец', 'Смочан', 'Сливек', 'Горно Павликене', 'Балканец', 'Врабево', 'Дебнево', 'Калейца', 'Ломец', 'Голяма Желязна', 'Врабево', 'Драшкова поляна', 'Малиново'],
    province: 'Ловешка област',
  },
  {
    key: 'teteven',
    towns: ['Тетевен', 'Рибарица', 'Гложене', 'Ябланица', 'Черни Вит', 'Голям извор', 'Малък извор', 'Лесидрен', 'Орешене', 'Български извор', 'Дивчовото', 'Галата', 'Васильово', 'Бабинци', 'Брестница', 'Златна Панега'],
  },
  { key: 'other' },
];

const TOWN_INDEX = new Map();
for (const r of REGIONS) for (const t of r.towns || []) TOWN_INDEX.set(t.toLowerCase(), r.key);

/** Region key for a listing. */
export function regionOf(l) {
  const town = townOf(l?.place).toLowerCase();
  if (town && TOWN_INDEX.has(town)) return TOWN_INDEX.get(town);
  // A province alone cannot distinguish Gabrovo from Sevlievo, or Lovech from Teteven.
  return l?.region === 'Великотърновска област' ? 'tarnovo' : 'other';
}

/** [{ key, count, items }] in REGIONS order, empty regions removed. */
export function groupByRegion(items) {
  const groups = new Map(REGIONS.map((r) => [r.key, []]));
  for (const l of items) groups.get(regionOf(l)).push(l);
  return REGIONS.map((r) => ({ key: r.key, items: groups.get(r.key), count: groups.get(r.key).length })).filter((g) => g.count > 0);
}

export function isRegionKey(key) {
  return REGIONS.some((r) => r.key === key);
}

export const REGION_NAMES = {
  tarnovo: { bg: 'Велико Търново и околностите', en: 'Veliko Tarnovo and surroundings' },
  gabrovo: { bg: 'Габрово и Трявна', en: 'Gabrovo and Tryavna' },
  sevlievo: { bg: 'Севлиево и Априлци', en: 'Sevlievo and Apriltsi' },
  lovech: { bg: 'Ловеч и Троян', en: 'Lovech and Troyan' },
  teteven: { bg: 'Тетевен и Рибарица', en: 'Teteven and Ribaritsa' },
  other: { bg: 'Други местоположения', en: 'Other locations' },
};
