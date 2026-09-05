/**
 * Copy for both languages + small formatting helpers.
 * Listing content comes from suprimmo.bg in Bulgarian; in English mode we translate
 * labels, property types and transliterate place names.
 */

export const AGENT = {
  name: { bg: 'Никола Иванов', en: 'Nikola Ivanov' },
  role: { bg: 'Консултант недвижими имоти · Офис Велико Търново (PROPERTY.BG / SUPRIMMO)', en: 'Real estate consultant · Veliko Tarnovo office (PROPERTY.BG / SUPRIMMO)' },
  mobile: '+359 882 638 423',
  office: '+359 62 588 042',
  whatsapp: '+359 883 700 335',
  whatsappDigits: '359883700335',
  address: { bg: 'гр. Велико Търново 5000, ул. Никола Пиколо 23', en: '23 Nikola Pikolo St., 5000 Veliko Tarnovo, Bulgaria' },
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('ул. Никола Пиколо 23, Велико Търново 5000'),
  languages: { bg: 'Български, Английски, Испански', en: 'Bulgarian, English, Spanish' },
  hours: {
    bg: ['Понеделник – петък: 09:00 – 18:00', 'Консултация по телефона: понеделник – петък 09:00 – 20:00', 'Огледи: понеделник – петък 09:00 – 18:00 или по лична договорка', 'Събота, неделя и празници: почивни дни'],
    en: ['Monday – Friday: 09:00 – 18:00', 'Phone consultations: Monday – Friday 09:00 – 20:00', 'Viewings: Monday – Friday 09:00 – 18:00 or by arrangement', 'Weekends and public holidays: closed'],
  },
  sourceUrl: 'https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/',
  profileUrl: 'https://www.suprimmo.bg/broker-467-nikola-ivanov/',
};

export const SITE = {
  name: 'НИ Имоти',
  nameLatin: 'NI Imoti',
  domain: 'niimoti.com',
};

export const T = {
  bg: {
    brandTag: 'Недвижими имоти', navProps: 'Имоти', navRegions: 'Региони', navReduced: 'Намалени', navAbout: 'За Никола', navContact: 'Контакт',
    metaHome: 'НИ Имоти — къщи, парцели и имоти в Централна Стара планина и Северна България. Лични консултации от Никола Иванов, Велико Търново.',
    heroKicker: 'Имоти в Стара планина и Северна България',
    heroTitle: 'Открийте своето място в България',
    heroSub: 'Селски къщи, имоти с двор, парцели и възможности за инвестиция — подбрани с лично отношение и познаване на района около Велико Търново, Габрово, Севлиево и Априлци.',
    heroCta: 'Разгледайте имотите', heroCta2: 'Запознайте се с Никола',
    searchFilters: 'Търсене по критерии', fLocation: 'Локация', fLocationPh: 'Град, село или регион', fBudget: 'Бюджет', fBudgetAny: 'Без ограничение', fBudget1: 'до 30 000 €', fBudget2: '30 000 – 60 000 €', fBudget3: '60 000 – 120 000 €', fBudget4: 'над 120 000 €',
    fType: 'Тип', fTypeAny: 'Всички', fDeal: 'Сделка', fDealAny: 'Продажба и наем', fSale: 'Продажба', fRent: 'Наем', fSearch: 'Търси', fSort: 'Подредба',
    sortTop: 'Топ оферти', sortPriceAsc: 'Цена: ниска → висока', sortPriceDesc: 'Цена: висока → ниска', sortAreaAsc: 'Площ: малка → голяма', sortAreaDesc: 'Площ: голяма → малка',
    searchAi: 'Търсене с изкуствен интелект', aiPh: 'Опишете какъв имот търсите…', aiGo: 'Намери',
    aiExample: '„Къща до 50 000 евро, с голям двор, близо до Севлиево и без близки съседи.“',
    aiThinking: 'Търсим подходящи имоти…', aiNone: 'Не намерихме точно съвпадение. Опитайте с други думи или разгледайте всички имоти.', aiError: 'Търсенето не сработи. Опитайте отново или използвайте филтрите.',
    featTitle: 'Избрани имоти', featAll: 'Всички имоти →',
    regTitle: 'По региони', regSub: 'Най-често работя в Централна Стара планина и Предбалкана — Габрово, Севлиево, Априлци, Велико Търново, Ловеч — но помагам на купувачи в цялата страна.',
    lifeTitle: 'По вид имот',
    aboutKicker: 'За мен', aboutTitle: 'Здравейте, аз съм Никола Иванов.',
    aboutP1: 'Консултант недвижими имоти в офиса на PROPERTY.BG / SUPRIMMO във Велико Търново. Помагам на хора да намерят истински имоти в Северна България — от къща за ремонт в планинско село до готов дом с двор, парцел или бизнес имот.',
    aboutP2: 'Работя лично с всеки клиент: оглед, честна оценка на състоянието и подкрепа до нотариуса и след това. Говоря български, английски и испански.',
    aboutOffice: 'Офис', aboutHours: 'Работно време', aboutLanguages: 'Езици',
    reducedTitle: 'Имоти с намалена цена', reducedSub: 'Актуални оферти, на които собствениците са намалили цената.', reducedBadge: 'Намалена цена',
    contactTitle: 'Разкажете ми какво търсите', contactSub: 'Обадете се, пишете или оставете съобщение — отговарям лично, обикновено в рамките на деня.',
    formName: 'Вашето име', formPhone: 'Телефон или имейл', formMsg: 'Какъв имот търсите?', formSend: 'Изпрати запитване', formNote: 'Данните се използват само за връзка с вас.',
    formSending: 'Изпращане…', formOk: 'Благодаря! Получих запитването и ще се свържа с вас.', formOkWa: 'Може също да ми пишете директно в WhatsApp:', formFail: 'Формата не е налична в момента — моля, обадете се или пишете в WhatsApp.', formInvalid: 'Моля, попълнете име и телефон/имейл.',
    barCall: 'Обади се', barEnquire: 'Запитване',
    listTitle: 'Всички имоти', listSub: 'Актуалните оферти с отговорен брокер Никола Иванов.', results: (n) => `${n} ${n === 1 ? 'имот' : 'имота'}`, noResults: 'Няма имоти по тези критерии.', clearFilters: 'Изчисти филтрите', pagePrev: '← Назад', pageNext: 'Напред →', page: 'Страница',
    crumbHome: 'Начало', status: 'Активна обява', statusRent: 'Под наем', ref: 'Реф. №', galleryAll: (n) => `Всички ${n} снимки`,
    price: 'Цена', rentPrice: 'Месечен наем', houseArea: 'Площ сграда', landArea: 'Площ двор', area: 'Площ', perSqm: 'на м²',
    featuresTitle: 'Основни характеристики', fBedrooms: 'Спални', fFloors: 'Етажност', fTypeLabel: 'Тип имот', fRegion: 'Област', fAkt16: 'Разрешение за ползване', fAkt16Val: 'Акт 16', fOldPrice: 'Предишна цена', fDiscount: 'Намаление',
    descTitle: 'Описание', descMissing: 'Пълното описание и всички снимки са в оригиналната обява на SUPRIMMO.', descSource: 'Виж обявата в SUPRIMMO →',
    mapTitle: 'Местоположение', mapSub: 'Точният адрес се предоставя при оглед. Отворете картата за ориентир в района.', mapOpen: 'Отвори картата', mapNote: 'Приблизително',
    aiKicker: 'Изкуствен интелект', aiTitle: 'Попитайте за този имот', aiSub: 'Отговорите се базират на информацията в обявата. За всичко останало — обадете се на Никола.', aiPhProp: 'Например: Има ли ток и вода в имота?', aiAsk: 'Попитай',
    aiChips: ['Колко е данъкът и таксите при покупка?', 'Подходящ ли е за целогодишно живеене?', 'Какво е разстоянието до най-близкия град?'],
    agentNote: 'Отговорен брокер за този имот. Пишете ми — ще отговоря честно и на въпросите, които не са в обявата.',
    formMsgProp: (ref) => `Интересувам се от имот ${ref}…`, formEnquire: 'Изпрати запитване',
    viewingNote: 'Огледи — понеделник до петък или по лична договорка. Може да съчетаем няколко имота в района в един ден.',
    similarTitle: 'Подобни имоти', videoTitle: 'Видео',
    navReviews: 'Отзиви', reviewsTitle: 'Какво казват клиентите', reviewsSub: 'Отзиви от купувачи и продавачи, работили с Никола. Публикувани в системата на PROPERTY.BG / LUXIMMO.', reviewsAll: 'Всички отзиви →', reviewsSource: 'Виж отзивите в LUXIMMO ↗', reviewsCount: (n) => `${n} ${n === 1 ? 'отзив' : 'отзива'}`, reviewsEmpty: 'Все още няма публикувани отзиви.', anonymous: 'Клиент', reviewProperty: 'Имот', translatedFrom: { en: 'превод от английски', bg: '' },
    notFoundTitle: 'Страницата не е намерена', notFoundSub: 'Имотът може да е продаден или свален от продажба.', backHome: 'Към началната страница',
    footerSource: 'Обявите се публикуват от SUPRIMMO / PROPERTY.BG с отговорен брокер Никола Иванов и се обновяват автоматично.', footerUpdated: 'Обновено',
    catHouses: 'Къщи и вили', catPlots: 'Парцели', catLand: 'Земеделска земя', catBusiness: 'Бизнес имоти', catRent: 'Под наем', catReduced: 'Намалени цени', catApartments: 'Апартаменти',
    navMap: 'Карта', mapTitle2: 'Имотите на картата', mapSub2: 'Всички актуални оферти върху картата. Местоположението на имотите е приблизително — по населено място; точният адрес се уточнява при оглед.',
    mapView: 'Карта', listView: 'Списък', approxLocation: 'Приблизително местоположение', exactLocation: 'Точно местоположение', openListing: 'Виж имота', mapCount: (n) => `${n} ${n === 1 ? 'имот на картата' : 'имота на картата'}`,
    heroStat: (n) => `${n} актуални имота`, heroStat2: 'Велико Търново · Габрово · Ловеч', trustTitle: 'Защо с Никола', 
    trust1t: 'Лични огледи', trust1: 'Всеки имот е видян лично. Казвам и това, което не е в обявата.', trust2t: 'До нотариуса и след това', trust2: 'Проверка на документи, договор, нотариус и практична помощ след покупката.', trust3t: 'Три езика', trust3: 'Български, английски и испански — за купувачи от България и чужбина.',
    photoOf: (i, n) => `Снимка ${i} от ${n}`, prev: 'Предишна', next: 'Следваща',
    langSwitch: 'English', otherLang: 'en',
  },
  en: {
    brandTag: 'Real estate', navProps: 'Properties', navRegions: 'Regions', navReduced: 'Reduced', navAbout: 'About Nikola', navContact: 'Contact',
    metaHome: 'NI Imoti — houses, plots and property in the central Balkan Mountains and northern Bulgaria. Personal guidance from Nikola Ivanov, Veliko Tarnovo.',
    heroKicker: 'Properties in the Balkan Mountains and northern Bulgaria',
    heroTitle: 'Find your place in Bulgaria',
    heroSub: 'Village houses, homes with gardens, plots and investment opportunities — selected with personal care and local knowledge of the Veliko Tarnovo, Gabrovo, Sevlievo and Apriltsi area.',
    heroCta: 'Browse properties', heroCta2: 'Meet Nikola',
    searchFilters: 'Search by criteria', fLocation: 'Location', fLocationPh: 'Town, village or region', fBudget: 'Budget', fBudgetAny: 'Any', fBudget1: 'up to €30,000', fBudget2: '€30,000 – 60,000', fBudget3: '€60,000 – 120,000', fBudget4: 'over €120,000',
    fType: 'Type', fTypeAny: 'All', fDeal: 'Deal', fDealAny: 'Sale and rent', fSale: 'For sale', fRent: 'For rent', fSearch: 'Search', fSort: 'Sort',
    sortTop: 'Top offers', sortPriceAsc: 'Price: low → high', sortPriceDesc: 'Price: high → low', sortAreaAsc: 'Area: small → large', sortAreaDesc: 'Area: large → small',
    searchAi: 'AI search', aiPh: 'Describe the property you are looking for…', aiGo: 'Find',
    aiExample: '“A house under €50,000 with a large garden, near Sevlievo and no close neighbours.”',
    aiThinking: 'Looking for matching properties…', aiNone: 'No close match. Try different words or browse all properties.', aiError: 'Search did not work. Please try again or use the filters.',
    featTitle: 'Featured properties', featAll: 'All properties →',
    regTitle: 'By region', regSub: 'I work mostly in the central Balkan Mountains and foothills — Gabrovo, Sevlievo, Apriltsi, Veliko Tarnovo, Lovech — but help buyers across the country.',
    lifeTitle: 'By property type',
    aboutKicker: 'About me', aboutTitle: 'Hello, I am Nikola Ivanov.',
    aboutP1: 'Real estate consultant at the PROPERTY.BG / SUPRIMMO office in Veliko Tarnovo. I help people find genuine properties in northern Bulgaria — from a renovation project in a mountain village to a ready home with a garden, a plot or a business property.',
    aboutP2: 'I work personally with every client: viewings, an honest assessment of condition, and support through the notary and beyond. I speak Bulgarian, English and Spanish.',
    aboutOffice: 'Office', aboutHours: 'Working hours', aboutLanguages: 'Languages',
    reducedTitle: 'Reduced-price properties', reducedSub: 'Current offers where the owners have lowered the price.', reducedBadge: 'Price reduced',
    contactTitle: 'Tell me what you are looking for', contactSub: 'Call, message or leave a note — I reply personally, usually the same day.',
    formName: 'Your name', formPhone: 'Phone or email', formMsg: 'What kind of property are you after?', formSend: 'Send enquiry', formNote: 'Your details are used only to get back to you.',
    formSending: 'Sending…', formOk: 'Thank you! I have received your enquiry and will be in touch.', formOkWa: 'You can also message me directly on WhatsApp:', formFail: 'The form is unavailable right now — please call or message on WhatsApp.', formInvalid: 'Please fill in your name and phone/email.',
    barCall: 'Call', barEnquire: 'Enquire',
    listTitle: 'All properties', listSub: 'Current offers with Nikola Ivanov as responsible agent.', results: (n) => `${n} ${n === 1 ? 'property' : 'properties'}`, noResults: 'No properties match these filters.', clearFilters: 'Clear filters', pagePrev: '← Previous', pageNext: 'Next →', page: 'Page',
    crumbHome: 'Home', status: 'Available', statusRent: 'For rent', ref: 'Ref.', galleryAll: (n) => `All ${n} photos`,
    price: 'Price', rentPrice: 'Monthly rent', houseArea: 'Building area', landArea: 'Plot area', area: 'Area', perSqm: 'per m²',
    featuresTitle: 'Key features', fBedrooms: 'Bedrooms', fFloors: 'Floors', fTypeLabel: 'Property type', fRegion: 'Province', fAkt16: 'Occupancy permit', fAkt16Val: 'Act 16 (issued)', fOldPrice: 'Previous price', fDiscount: 'Reduction',
    descTitle: 'Description', descMissing: 'The full description and all photos are in the original SUPRIMMO listing (in Bulgarian).', descSource: 'Open the SUPRIMMO listing →',
    mapTitle: 'Location', mapSub: 'The exact address is shared at viewing. Open the map to get a feel for the area.', mapOpen: 'Open map', mapNote: 'Approximate',
    aiKicker: 'AI assistant', aiTitle: 'Ask about this property', aiSub: 'Answers draw on the listing information. For anything else — call Nikola.', aiPhProp: 'For example: Does the property have electricity and water?', aiAsk: 'Ask',
    aiChips: ['What are the purchase taxes and fees?', 'Is it suitable for year-round living?', 'How far is the nearest town?'],
    agentNote: 'Responsible agent for this property. Get in touch — I will answer honestly, including the questions the listing does not cover.',
    formMsgProp: (ref) => `I am interested in property ${ref}…`, formEnquire: 'Send enquiry',
    viewingNote: 'Viewings Monday to Friday or by arrangement. Several properties in the area can be combined in one day.',
    similarTitle: 'Similar properties', videoTitle: 'Video',
    navReviews: 'Reviews', reviewsTitle: 'What clients say', reviewsSub: 'Feedback from buyers and sellers who worked with Nikola, as published in the PROPERTY.BG / LUXIMMO system.', reviewsAll: 'All reviews →', reviewsSource: 'See the reviews on LUXIMMO ↗', reviewsCount: (n) => `${n} ${n === 1 ? 'review' : 'reviews'}`, reviewsEmpty: 'No reviews published yet.', anonymous: 'Client', reviewProperty: 'Property', translatedFrom: { bg: 'translated from Bulgarian', en: '' },
    notFoundTitle: 'Page not found', notFoundSub: 'The property may have been sold or withdrawn.', backHome: 'Back to the home page',
    footerSource: 'Listings are published by SUPRIMMO / PROPERTY.BG with Nikola Ivanov as responsible agent and are refreshed automatically.', footerUpdated: 'Updated',
    catHouses: 'Houses & villas', catPlots: 'Plots', catLand: 'Agricultural land', catBusiness: 'Business properties', catRent: 'For rent', catReduced: 'Reduced prices', catApartments: 'Apartments',
    navMap: 'Map', mapTitle2: 'Properties on the map', mapSub2: 'All current offers on one map. Locations are approximate — by town or village; the exact address is shared at viewing.',
    mapView: 'Map', listView: 'List', approxLocation: 'Approximate location', exactLocation: 'Exact location', openListing: 'View property', mapCount: (n) => `${n} ${n === 1 ? 'property on the map' : 'properties on the map'}`,
    heroStat: (n) => `${n} current listings`, heroStat2: 'Veliko Tarnovo · Gabrovo · Lovech', trustTitle: 'Why work with Nikola',
    trust1t: 'Personal viewings', trust1: 'Every property has been seen in person. I tell you what the listing leaves out.', trust2t: 'Through the notary and beyond', trust2: 'Document checks, contract, notary and practical help after the purchase.', trust3t: 'Three languages', trust3: 'Bulgarian, English and Spanish — for buyers from Bulgaria and abroad.',
    photoOf: (i, n) => `Photo ${i} of ${n}`, prev: 'Previous', next: 'Next',
    langSwitch: 'Български', otherLang: 'bg',
  },
};

/* ───────────── property type translation ───────────── */

const TYPE_EN = {
  'къща': 'House', 'къщи': 'Houses', 'вила': 'Villa', 'бунгало': 'Bungalow', 'планинска къща': 'Mountain house', 'едноетажна къща': 'Single-storey house',
  'къща-близнак': 'Semi-detached house', 'редова къща': 'Terraced house', 'етаж от къща': 'Floor of a house', 'имение': 'Estate',
  'парцел в регулация': 'Regulated plot', 'парцел': 'Plot', 'парцел за инвестиция': 'Investment plot', 'промишлен парцел': 'Industrial plot', 'парцел с проект': 'Plot with project',
  'земеделска земя': 'Agricultural land', 'земя': 'Land', 'гора': 'Forest', 'лозе': 'Vineyard',
  'склад': 'Warehouse', 'магазин': 'Shop', 'офис': 'Office', 'хотел': 'Hotel', 'ресторант': 'Restaurant', 'бизнес': 'Business', 'къща за гости': 'Guest house',
  'производствена сграда': 'Industrial building', 'промишлена сграда': 'Industrial building', 'цех': 'Workshop', 'ферма': 'Farm', 'сграда': 'Building', 'селскостопанска постройка': 'Farm building',
  'апартамент': 'Apartment', 'едностаен апартамент': 'Studio apartment', 'двустаен апартамент': 'One-bedroom apartment', 'тристаен апартамент': 'Two-bedroom apartment', 'четиристаен апартамент': 'Three-bedroom apartment', 'многостаен апартамент': 'Large apartment', 'мезонет': 'Maisonette', 'пентхаус': 'Penthouse',
  'гараж': 'Garage', 'паркомясто': 'Parking space', 'друг имот': 'Other property', 'мазе': 'Basement',
};

export function typeLabel(type, lang) {
  if (!type) return '';
  if (lang !== 'en') return type;
  const k = type.trim().toLowerCase();
  if (TYPE_EN[k]) return TYPE_EN[k];
  for (const key of Object.keys(TYPE_EN)) if (k.includes(key)) return TYPE_EN[key];
  return transliterate(type);
}

/* ───────────── category buckets used for filters & home tiles ───────────── */

export const CATEGORIES = [
  { key: 'houses', label: 'catHouses', test: (l) => /къщ|вил|бунгал|имени|резиден/i.test(l.type) && !l.rent },
  { key: 'plots', label: 'catPlots', test: (l) => /парцел|упи/i.test(l.type) },
  { key: 'land', label: 'catLand', test: (l) => /зем|гор|лоз/i.test(l.type) && !/парцел/i.test(l.type) },
  { key: 'business', label: 'catBusiness', test: (l) => /склад|магазин|офис|хотел|ресторант|бизнес|цех|сград|ферм|производ|промиш|гости/i.test(l.type) },
  { key: 'apartments', label: 'catApartments', test: (l) => /апартамент|мезонет|пентхаус|студио/i.test(l.type) },
  { key: 'rent', label: 'catRent', test: (l) => l.rent },
  { key: 'reduced', label: 'catReduced', test: (l) => l.reduced },
];

/* ───────────── transliteration (Bulgarian official-ish) ───────────── */

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

export function transliterate(str) {
  if (!str) return '';
  return String(str).replace(/[А-Яа-яЁё]/g, (ch) => {
    const lower = ch.toLowerCase();
    const out = CYR[lower] ?? ch;
    return ch === lower ? out : out.charAt(0).toUpperCase() + out.slice(1);
  });
}

/** "близо до гр. Севлиево" → "near Sevlievo" ; "гр. Габрово / кв. Център" → "Gabrovo, Tsentar district" */
export function placeLabel(place, lang) {
  if (!place) return '';
  if (lang !== 'en') return place;
  let p = place;
  let prefix = '';
  if (/^близо до/i.test(p)) { prefix = 'near '; p = p.replace(/^близо до\s*/i, ''); }
  p = p.replace(/^гр\.\s*/i, '').replace(/^с\.\s*/i, 'village of ').replace(/^к\.к\.\s*/i, 'resort ');
  p = p.replace(/\s*\/\s*кв\.\s*/i, ', ').replace(/\s*\/\s*/g, ', ');
  const t = transliterate(p);
  return prefix + (p.includes(', ') ? t.replace(/, (.*)$/, ', $1 district') : t);
}

export function regionLabel(region, lang) {
  if (!region) return '';
  if (lang !== 'en') return region;
  return transliterate(region.replace(/\s*област$/i, '')) + ' province';
}

/* ───────────── formatting ───────────── */

export function fmtNumber(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const s = Math.round(Number(n)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function fmtPrice(l, lang) {
  if (l.price == null) return lang === 'en' ? 'Price on request' : 'Цена при запитване';
  const base = `${fmtNumber(l.price)} €`;
  if (l.rent) return lang === 'en' ? `${base}/month` : `${base}/мес.`;
  return base;
}

export function fmtArea(n) {
  return n == null ? '—' : `${fmtNumber(n)} m²`;
}

export function fmtDate(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = d.getUTCFullYear();
  return lang === 'en' ? `${yy}-${mm}-${dd}` : `${dd}.${mm}.${yy}`;
}

export function slugify(str) {
  return transliterate(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
