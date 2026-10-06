/**
 * Copy for both languages + small formatting helpers.
 * Listing content comes from suprimmo.bg in Bulgarian; in English mode we translate
 * labels, property types and transliterate place names.
 */

export const AGENT = {
  name: { bg: 'Никола Иванов', en: 'Nikola Ivanov' },
  role: { bg: 'Консултант недвижими имоти · Офис Велико Търново (PROPERTY.BG / SUPRIMMO)', en: 'Real estate consultant · Veliko Tarnovo office (PROPERTY.BG / SUPRIMMO)' },
  mobile: '+359 884 128 117',
  whatsapp: '+359 884 128 117',
  whatsappDigits: '359884128117',
  address: { bg: 'гр. Велико Търново 5000, ул. Никола Пиколо 23', en: '23 Nikola Pikolo St., 5000 Veliko Tarnovo, Bulgaria' },
  mapsUrl: 'https://maps.app.goo.gl/1ryQnKmpVsTrfq8JA',
  languages: { bg: 'Български, Испански', en: 'Bulgarian, Spanish' },
  hours: {
    bg: ['Понеделник – петък: 09:00–18:00', 'Консултации по телефон: понеделник – петък до 19:00', 'Събота: огледи с предварителна уговорка', 'Неделя до обяд: огледи с предварителна уговорка'],
    en: ['Monday–Friday: 09:00–18:00', 'Phone consultations: Monday–Friday until 19:00', 'Saturday: viewings by prior arrangement', 'Sunday before noon: viewings by prior arrangement'],
  },
  profileUrl: 'https://www.suprimmo.bg/broker-467-nikola-ivanov/',
};

export const SITE = {
  name: 'My Balkan Place',
  nameLatin: 'My Balkan Place',
  domain: 'mybalkanplace.com',
};

export const T = {
  bg: {
    sellerLink: 'Предложете имот', sellerTitle: 'Имате имот за продажба?', sellerSub: 'Разкажете накратко за имота и оставете контакт. Никола ще се свърже с вас, за да обсъдите следващите стъпки.', sellerLocation: 'Къде се намира имотът?', sellerType: 'Вид на имота', sellerMessage: 'Площ, състояние, желана цена и друга полезна информация', sellerSend: 'Изпрати предложение', regionFilter: 'Район', anyRegion: 'Всички райони', regionBrowse: 'Разгледайте района', aiCriteria: 'Насочете търсенето', aiHint: 'Изберете район, бюджет и вид имот или опишете свободно какво търсите.', aiExamples: ['Къща до 50 000 евро близо до Севлиево', 'Парцел близо до Габрово', 'Къща в Априлци'], buyerFactsTitle: 'Полезно за купувача', factUnknown: 'Няма потвърдена информация. Попитайте Никола.', factSource: 'Източник', factReviewed: 'Проверено',
    brandTag: 'Недвижими имоти', navProps: 'Имоти', navRegions: 'Региони', navReduced: 'Намалени', navAbout: 'За Никола', navContact: 'Контакт',
    metaHome: 'My Balkan Place — къщи, парцели и имоти в Централна Стара планина и Северна България. Лични консултации от Никола Иванов, Велико Търново.',
    heroKicker: 'Имоти в Стара планина и Северна България',
    heroTitle: 'Открийте своето място в България',
    heroSub: 'Къщи, парцели и възможности за инвестиция — подбрани с лично отношение и добро познаване на Централна България, Стара планина и Предбалкана.',
    heroCta: 'Разгледайте имотите', heroCta2: 'Запознайте се с Никола',
    searchFilters: 'Търсене по критерии', fLocation: 'Локация', fLocationPh: 'Град, село или регион', fBudget: 'Бюджет', fBudgetAny: 'Без ограничение',
    budgets: [['0-20000', 'до 20 000 €'], ['20000-50000', '20 000 – 50 000 €'], ['50000-100000', '50 000 – 100 000 €'], ['100000-150000', '100 000 – 150 000 €'], ['150000-250000', '150 000 – 250 000 €'], ['250000-400000', '250 000 – 400 000 €'], ['400000-', 'над 400 000 €']],
    fType: 'Тип', fTypeAny: 'Всички', fDeal: 'Сделка', fDealAny: 'Продажба и наем', fSale: 'Продажба', fRent: 'Наем', fSearch: 'Търси', fSort: 'Подредба',
    sortTop: 'Топ оферти', sortPriceAsc: 'Цена: ниска → висока', sortPriceDesc: 'Цена: висока → ниска', sortAreaAsc: 'Площ: малка → голяма', sortAreaDesc: 'Площ: голяма → малка',
    searchAi: 'Търсене с изкуствен интелект', aiPh: 'Опишете какъв имот търсите…', aiGo: 'Намери',
    aiExample: '„Къща до 50 000 евро, с голям двор, близо до Севлиево и без близки съседи.“',
    aiThinking: 'Търсим подходящи имоти…', aiNone: 'Не намерихме точно съвпадение. Опитайте с други думи или разгледайте всички имоти.', aiError: 'Търсенето не сработи. Опитайте отново или използвайте филтрите.',
    featTitle: 'Избрани имоти', featAll: 'Всички имоти →',
    regTitle: 'По региони', regSub: 'Работя основно в Централна България, Стара планина и Предбалкана, като най-активно покривам районите от Тетевен, Троян и Априлци до Севлиево, Габрово, Трявна и Велико Търново.',
    lifeTitle: 'По вид имот',
    aboutKicker: 'За мен', aboutTitle: 'Здравейте, аз съм Никола Иванов.',
    aboutP1: 'Помагам на хората да продават и намират селски и извънградски имоти в Централна България и Предбалкана. Работя лично с всеки клиент – с ясна информация, честна оценка и без излишен натиск, от първия разговор до сделката и след нея.',
    aboutP2: 'Вярвам, че добрата сделка започва и завършва със спокойствие.',
    aboutOffice: 'Офис', aboutHours: 'Работно време', aboutLanguages: 'Езици',
    reducedTitle: 'Имоти с намалена цена', reducedSub: 'Актуални оферти, на които собствениците са намалили цената.', reducedBadge: 'Намалена цена',
    contactTitle: 'Разкажете ми какво търсите', contactSub: 'Обадете се, пишете или оставете съобщение — отговарям лично, обикновено в рамките на деня.',
    formName: 'Вашето име', formPhone: 'Телефон или имейл', formMsg: 'Какъв имот търсите?', formSend: 'Изпрати запитване', formNote: 'Данните се използват само за връзка с вас.',
    formSending: 'Изпращане…', formOk: 'Благодаря! Получих запитването и ще се свържа с вас.', formOkWa: 'Може също да ми пишете директно в WhatsApp:', formFail: 'Формата не е налична в момента — моля, обадете се или пишете в WhatsApp.', formInvalid: 'Моля, попълнете име и телефон/имейл.',
    barCall: 'Обади се', barEnquire: 'Запитване',
    listTitle: 'Всички имоти', listSub: 'Актуалните оферти с отговорен брокер Никола Иванов.', results: (n) => `${n} ${n === 1 ? 'имот' : 'имота'}`, noResults: 'Няма имоти по тези критерии.', clearFilters: 'Изчисти филтрите', pagePrev: '← Назад', pageNext: 'Напред →', page: 'Страница',
    crumbHome: 'Начало', status: 'Активна обява', statusRent: 'Под наем', statusReserved: 'Резервиран', ref: 'Реф. №', galleryAll: (n) => `Всички ${n} снимки`,
    price: 'Цена', rentPrice: 'Месечен наем', houseArea: 'Площ сграда', landArea: 'Площ двор', area: 'Площ', perSqm: 'на м²',
    featuresTitle: 'Основни характеристики', fBedrooms: 'Спални', fFloors: 'Етажност', fTypeLabel: 'Тип имот', fRegion: 'Област', fAkt16: 'Разрешение за ползване', fAkt16Val: 'Акт 16', fOldPrice: 'Предишна цена', fDiscount: 'Намаление',
    descTitle: 'Описание', descMissing: 'Пълното описание и всички снимки са в оригиналната обява на SUPRIMMO.', descSource: 'Виж обявата в SUPRIMMO →',
    mapTitle: 'Местоположение', mapSub: 'Точният адрес се предоставя при оглед. Отворете картата за ориентир в района.', mapOpen: 'Отвори картата', mapNote: 'Приблизително',
    aiKicker: 'Изкуствен интелект', aiTitle: 'Попитайте за този имот', aiSub: 'Отговорите се базират на информацията в обявата. За всичко останало — обадете се на Никола.', aiPhProp: 'Например: Има ли ток и вода в имота?', aiAsk: 'Попитай',
    aiChips: ['Какъв е достъпът до имота?', 'Подходящ ли е за целогодишно живеене?', 'Какво има в селото и наблизо?', 'Колко е далеч най-близкият град?'],
    agentNote: 'Отговорен брокер за този имот. Пишете ми — ще отговоря честно и на въпросите, които не са в обявата.',
    formMsgProp: (ref) => `Интересувам се от имот ${ref}…`, formEnquire: 'Изпрати запитване',
    viewingNote: 'Огледи — понеделник – петък: 09:00–18:00; събота: с предварителна уговорка; неделя до обяд: с предварителна уговорка. Може да съчетаем няколко имота в района в един ден.',
    similarTitle: 'Подобни имоти', videoTitle: 'Видео',
    navReviews: 'Отзиви', reviewsTitle: 'Какво казват клиентите', reviewsSub: 'Отзиви от купувачи и продавачи, работили с Никола. Публикувани в системата на PROPERTY.BG / LUXIMMO.', reviewsAll: 'Всички отзиви →', reviewsSource: 'Виж отзивите в LUXIMMO ↗', reviewsCount: (n) => `${n} ${n === 1 ? 'отзив' : 'отзива'}`, reviewsEmpty: 'Все още няма публикувани отзиви.', anonymous: 'Клиент', reviewProperty: 'Имот', translatedFrom: { en: 'превод от английски', bg: '' },
    notFoundTitle: 'Страницата не е намерена', notFoundSub: 'Имотът може да е продаден или свален от продажба.', backHome: 'Към началната страница',
    footerSource: 'Имотите в този каталог са подбрани и се поддържат лично от Никола Иванов.',
    catHouses: 'Къщи и вили', catPlots: 'Парцели', catLand: 'Земеделска земя', catBusiness: 'Бизнес имоти', catRent: 'Под наем', catReduced: 'Намалени цени', catApartments: 'Апартаменти',
    navMap: 'Карта', mapTitle2: 'Имотите на картата', mapSub2: 'Всички актуални оферти върху картата. Местоположението на имотите е приблизително — по населено място; точният адрес се уточнява при оглед.',
    mapView: 'Карта', listView: 'Списък', approxLocation: 'Приблизително местоположение', exactLocation: 'Точно местоположение', openListing: 'Виж имота', mapCount: (n) => `${n} ${n === 1 ? 'имот на картата' : 'имота на картата'}`,
    heroStat: (n) => `${n} актуални имота`, heroStat2: 'Велико Търново · Габрово · Ловеч', trustTitle: 'Защо с Никола', 
    trust1t: 'Лични огледи', trust1: 'Познавам лично имотите, които предлагам, и мога да дам реална информация за тях и района.', trust2t: 'Подкрепа през целия процес', trust2: 'С информация, координация и практична помощ – от първия разговор до сделката и винаги, когато има нужда и след нея.', trust3t: 'Без излишен натиск', trust3: 'Давам информацията и професионалното си мнение, а решението остава на клиента.',
    photoOf: (i, n) => `Снимка ${i} от ${n}`, prev: 'Предишна', next: 'Следваща',
    langSwitch: 'English', otherLang: 'en',
  },
  en: {
    sellerLink: 'Offer a property', sellerTitle: 'Have a property to sell?', sellerSub: 'Tell us a little about your property and leave your contact details. Nikola will get in touch to discuss the next steps.', sellerLocation: 'Where is the property?', sellerType: 'Property type', sellerMessage: 'Size, condition, asking price and other useful information', sellerSend: 'Send property details', regionFilter: 'Area', anyRegion: 'All areas', regionBrowse: 'Explore this area', aiCriteria: 'Guide your search', aiHint: 'Choose an area, budget and property type, or describe what you are looking for.', aiExamples: ['House under 50 000 euros near Sevlievo', 'Plot near Gabrovo', 'House in Apriltsi'], buyerFactsTitle: 'Useful information for buyers', factUnknown: 'No confirmed information yet. Please ask Nikola.', factSource: 'Source', factReviewed: 'Reviewed',
    brandTag: 'Real estate', navProps: 'Properties', navRegions: 'Regions', navReduced: 'Reduced', navAbout: 'About Nikola', navContact: 'Contact',
    metaHome: 'My Balkan Place — houses, plots and property in the central Balkan Mountains and northern Bulgaria. Personal guidance from Nikola Ivanov, Veliko Tarnovo.',
    heroKicker: 'Properties in the Balkan Mountains and northern Bulgaria',
    heroTitle: 'Find your place in Bulgaria',
    heroSub: 'Houses, plots and investment opportunities — selected with personal care and a solid knowledge of Central Bulgaria, the Balkan Mountains and their foothills.',
    heroCta: 'Browse properties', heroCta2: 'Meet Nikola',
    searchFilters: 'Search by criteria', fLocation: 'Location', fLocationPh: 'Town, village or region', fBudget: 'Budget', fBudgetAny: 'Any',
    budgets: [['0-20000', 'up to €20,000'], ['20000-50000', '€20,000 – 50,000'], ['50000-100000', '€50,000 – 100,000'], ['100000-150000', '€100,000 – 150,000'], ['150000-250000', '€150,000 – 250,000'], ['250000-400000', '€250,000 – 400,000'], ['400000-', 'over €400,000']],
    fType: 'Type', fTypeAny: 'All', fDeal: 'Deal', fDealAny: 'Sale and rent', fSale: 'For sale', fRent: 'For rent', fSearch: 'Search', fSort: 'Sort',
    sortTop: 'Top offers', sortPriceAsc: 'Price: low → high', sortPriceDesc: 'Price: high → low', sortAreaAsc: 'Area: small → large', sortAreaDesc: 'Area: large → small',
    searchAi: 'AI search', aiPh: 'Describe the property you are looking for…', aiGo: 'Find',
    aiExample: '“A house under €50,000 with a large garden, near Sevlievo and no close neighbours.”',
    aiThinking: 'Looking for matching properties…', aiNone: 'No close match. Try different words or browse all properties.', aiError: 'Search did not work. Please try again or use the filters.',
    featTitle: 'Featured properties', featAll: 'All properties →',
    regTitle: 'By region', regSub: 'I work mainly in Central Bulgaria, the Balkan Mountains and their foothills, with my most active coverage extending from Teteven, Troyan and Apriltsi to Sevlievo, Gabrovo, Tryavna and Veliko Tarnovo.',
    lifeTitle: 'By property type',
    aboutKicker: 'About me', aboutTitle: 'Hello, I am Nikola Ivanov.',
    aboutP1: 'I help people sell and find rural and countryside properties in Central Bulgaria and the Balkan foothills. I work personally with every client, offering clear information, an honest assessment and no unnecessary pressure — from the first conversation through the transaction and beyond.',
    aboutP2: 'I believe a good property transaction begins and ends with peace of mind.',
    aboutOffice: 'Office', aboutHours: 'Working hours', aboutLanguages: 'Languages',
    reducedTitle: 'Reduced-price properties', reducedSub: 'Current offers where the owners have lowered the price.', reducedBadge: 'Price reduced',
    contactTitle: 'Tell me what you are looking for', contactSub: 'Call, message or leave a note — I reply personally, usually the same day.',
    formName: 'Your name', formPhone: 'Phone or email', formMsg: 'What kind of property are you after?', formSend: 'Send enquiry', formNote: 'Your details are used only to get back to you.',
    formSending: 'Sending…', formOk: 'Thank you! I have received your enquiry and will be in touch.', formOkWa: 'You can also message me directly on WhatsApp:', formFail: 'The form is unavailable right now — please call or message on WhatsApp.', formInvalid: 'Please fill in your name and phone/email.',
    barCall: 'Call', barEnquire: 'Enquire',
    listTitle: 'All properties', listSub: 'Current offers with Nikola Ivanov as responsible agent.', results: (n) => `${n} ${n === 1 ? 'property' : 'properties'}`, noResults: 'No properties match these filters.', clearFilters: 'Clear filters', pagePrev: '← Previous', pageNext: 'Next →', page: 'Page',
    crumbHome: 'Home', status: 'Available', statusRent: 'For rent', statusReserved: 'Reserved', ref: 'Ref.', galleryAll: (n) => `All ${n} photos`,
    price: 'Price', rentPrice: 'Monthly rent', houseArea: 'Building area', landArea: 'Plot area', area: 'Area', perSqm: 'per m²',
    featuresTitle: 'Key features', fBedrooms: 'Bedrooms', fFloors: 'Floors', fTypeLabel: 'Property type', fRegion: 'Province', fAkt16: 'Occupancy permit', fAkt16Val: 'Act 16 (issued)', fOldPrice: 'Previous price', fDiscount: 'Reduction',
    descTitle: 'Description', descMissing: 'The full description and all photos are in the original SUPRIMMO listing (in Bulgarian).', descSource: 'Open the SUPRIMMO listing →',
    mapTitle: 'Location', mapSub: 'The exact address is shared at viewing. Open the map to get a feel for the area.', mapOpen: 'Open map', mapNote: 'Approximate',
    aiKicker: 'AI assistant', aiTitle: 'Ask about this property', aiSub: 'Answers draw on the listing information. For anything else — call Nikola.', aiPhProp: 'For example: Does the property have electricity and water?', aiAsk: 'Ask',
    aiChips: ['What is access to the property like?', 'Is it suitable for year-round living?', 'What is available in the village and nearby?', 'How far is the nearest town?'],
    agentNote: 'Responsible agent for this property. Get in touch — I will answer honestly, including the questions the listing does not cover.',
    formMsgProp: (ref) => `I am interested in property ${ref}…`, formEnquire: 'Send enquiry',
    viewingNote: 'Viewings — Monday–Friday: 09:00–18:00; Saturday: by prior arrangement; Sunday before noon: by prior arrangement. We can combine several properties in the area in one day.',
    similarTitle: 'Similar properties', videoTitle: 'Video',
    navReviews: 'Reviews', reviewsTitle: 'What clients say', reviewsSub: 'Feedback from buyers and sellers who worked with Nikola, as published in the PROPERTY.BG / LUXIMMO system.', reviewsAll: 'All reviews →', reviewsSource: 'See the reviews on LUXIMMO ↗', reviewsCount: (n) => `${n} ${n === 1 ? 'review' : 'reviews'}`, reviewsEmpty: 'No reviews published yet.', anonymous: 'Client', reviewProperty: 'Property', translatedFrom: { bg: 'translated from Bulgarian', en: '' },
    notFoundTitle: 'Page not found', notFoundSub: 'The property may have been sold or withdrawn.', backHome: 'Back to the home page',
    footerSource: 'Properties in this catalogue are selected and maintained personally by Nikola Ivanov.',
    catHouses: 'Houses & villas', catPlots: 'Plots', catLand: 'Agricultural land', catBusiness: 'Business properties', catRent: 'For rent', catReduced: 'Reduced prices', catApartments: 'Apartments',
    navMap: 'Map', mapTitle2: 'Properties on the map', mapSub2: 'All current offers on one map. Locations are approximate — by town or village; the exact address is shared at viewing.',
    mapView: 'Map', listView: 'List', approxLocation: 'Approximate location', exactLocation: 'Exact location', openListing: 'View property', mapCount: (n) => `${n} ${n === 1 ? 'property on the map' : 'properties on the map'}`,
    heroStat: (n) => `${n} current listings`, heroStat2: 'Veliko Tarnovo · Gabrovo · Lovech', trustTitle: 'Why work with Nikola',
    trust1t: 'Personal viewings', trust1: 'I know the properties I offer personally and can provide reliable information about them and the surrounding area.', trust2t: 'Support throughout the process', trust2: 'Information, coordination and practical help — from the first conversation through the transaction, and whenever needed afterwards.', trust3t: 'No unnecessary pressure', trust3: 'I provide the information and my professional opinion; the decision remains with the client.',
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
  { key: 'reduced', hidden: true, label: 'catReduced', test: (l) => l.reduced },
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
