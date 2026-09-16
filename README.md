# НИ Имоти — niimoti.com

Сайт на брокер **Никола Иванов** (PROPERTY.BG / SUPRIMMO, офис Велико Търново). Обявите се теглят автоматично от
<https://www.suprimmo.bg/oferti-na-brokera-nikola-ivanov/> (всички страници), кешират се в Cloudflare и се показват в
собствен дизайн — на български и английски, с търсене по критерии, AI търсене, страници за всеки имот, контактна форма,
WhatsApp/Viber бутони и sitemap за Google.

Технология: **Cloudflare Worker + static assets** (без build стъпка, чист JavaScript). Деплой се прави директно от
Cloudflare конзолата чрез GitHub интеграцията.

---

## 1. Деплой от Cloudflare конзолата (GitHub интеграция)

1. Влезте в <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → таб **Workers** → **Import a repository**.
2. Свържете GitHub акаунта и изберете това repo (`radoslav1992/nikola-1`) и branch-а, който искате да деплойвате.
3. Настройки на билда (Cloudflare ги чете от `wrangler.jsonc`):
   - **Project name:** `ni-imoti`
   - **Build command:** `npm run build` (пуска тестовете; може и празно)
   - **Deploy command:** `npx wrangler deploy`
   - Root directory: `/`
4. **Deploy.** След ~1 минута сайтът е на `https://ni-imoti.<вашият-акаунт>.workers.dev`.
   Всеки следващ push към branch-а деплойва автоматично; pull request-ите получават preview URL.

### Домейн niimoti.com

Домейнът трябва да е добавен в същия Cloudflare акаунт (Websites → Add a domain → сменете nameserver-ите при регистратора).
След това: **Workers & Pages → ni-imoti → Settings → Domains & Routes → Add → Custom domain** → `niimoti.com`, и още веднъж за
`www.niimoti.com`. Worker-ът сам пренасочва `www` към `niimoti.com`. DNS и SSL се създават автоматично.

Алтернатива: отблокирайте секцията `routes` в `wrangler.jsonc` и push-нете.

### Препоръчително: KV за кеш на обявите и за запитванията

Без KV сайтът работи (ползва edge-кеша на Cloudflare и вградения seed от 24 обяви), но обявите се презареждат по-често,
а запитванията от формата не се пазят никъде (само се изпращат по имейл, ако е настроен).

1. **Storage & Databases → KV → Create namespace** → име `ni-imoti`.
2. Копирайте **Namespace ID**, отблокирайте блока `kv_namespaces` в `wrangler.jsonc`, поставете ID-то, commit + push.

> Важно: с GitHub интеграцията `wrangler.jsonc` е източникът на истина. Bindings, добавени само през таба *Bindings*
> в конзолата, се губят при следващия deploy — затова ги записвайте във файла. Променливи (Variables) и secrets, добавени
> в конзолата, се запазват (`keep_vars: true`).

### Имейл за запитванията (по желание)

Формата записва всяко запитване в KV (`lead:*`) и може да го праща и по имейл през [Resend](https://resend.com) (безплатен план).
**Settings → Variables and Secrets** на Worker-а:

| Име | Тип | Стойност |
|---|---|---|
| `RESEND_API_KEY` | Secret | API ключ от Resend |
| `CONTACT_TO` | Variable | имейл(и) на Никола, разделени със запетая |
| `CONTACT_FROM` | Variable | напр. `НИ Имоти <imoti@niimoti.com>` (домейнът трябва да е верифициран в Resend; без него се ползва `onboarding@resend.dev`) |
| `REFRESH_TOKEN` | Secret | произволен дълъг низ — позволява ръчно обновяване: `https://niimoti.com/api/refresh?token=...` |

Ако нито KV, нито Resend са настроени, формата казва на клиента да пише в WhatsApp с предварително попълнено съобщение,
така че нито едно запитване не се губи.

### AI търсене

Работи през **Workers AI** (binding `AI` в `wrangler.jsonc`) — не иска ключове, всеки Cloudflare акаунт има безплатен лимит
(10 000 neurons/ден). Ако не искате AI: изтрийте блока `"ai"` — сайтът автоматично минава на търсене по ключови думи.

---

## 2. Как работи

```
src/index.js        рутиране, API, image proxy, sitemap, cron
src/scraper.js      парсер на списъка с обяви (пагинация /page/N/) и на страницата на имот
src/store.js        кеш: KV → Cache API → data/seed.json; stale-while-revalidate
src/catalog.js      филтри, сортиране, подобни имоти, keyword fallback за AI търсенето
src/ai.js           Workers AI: търсене по описание и въпроси за имот
src/geo.js          координати: справочник на населени места, Nominatim, разпръскване на маркери
src/render/*        HTML шаблони (layout, home, listings, map, property, testimonials), i18n BG/EN
src/testimonials.js отзиви на клиенти от luximmo.com (страницата за обратна връзка на брокера)
public/             styles.css, app.js, favicon.svg, robots.txt, vendor/leaflet (сервират се от edge-а)
data/seed.json      24-те обяви от стр. 1 (05.09.2026) — стартови данни и авариен fallback
data/testimonials.json  отзивите от luximmo.com (стартови данни; обновяват се автоматично; секцията се скрива, ако няма отзиви)
test/               node --test; фикстурата е реален HTML от suprimmo.bg
```

- **Обновяване на обявите:** cron всеки 6 часа (`triggers.crons`) + фоново обновяване при заявка, когда кешът е по-стар от
  `REFRESH_HOURS`. Ако suprimmo.bg не отговори или смени HTML-а така, че да не се намерят карти, старият кеш се пази.
- **Снимки:** проксирани през `/img/{medium|big}/{файл}` и `/img/agent.jpg` (снимката на Никола от luximmo.bg), кеширани 30 дни.
  Картите в списъка имат галерия при hover/swipe (до 5 снимки).
- **Карта (`/karta`, `/en/map`):** Leaflet (вграден в `public/vendor/leaflet`) + плочки на OpenStreetMap. Обявите имат само населено
  място, затова координатите идват от: (1) точния пин от страницата на имота в SUPRIMMO, когда е отворена; (2) вграден
  справочник с градове и села (`src/geo.js`); (3) Nominatim за непознати села — само от cron-а, ≤1 заявка/сек, кеширано;
  (4) областният град. Приблизителните маркери се разпръскват в радиус ~1 км и са маркирани като приблизителни.
- **Страница на имот:** данните от картата (цена, площ, двор, спални, етажи, Акт 16, намаление) са винаги налични;
  описанието, всички снимки, характеристики и координати се четат от оригиналната страница на имота, когато е достъпна.
  Ако не — има линк към обявата в SUPRIMMO.
- **Отзиви (`/otzivi`, `/en/reviews` + секция на началната страница):** теглят се от
  <https://www.luximmo.com/customers/feedback/index.html?seller=467> веднъж дневно (и от cron-а), с пагинация, ако има.
  Парсерът чете блоковете `comment-by` („Име (дд.мм.гггг)“) + `comment-container` на LUXIMMO, с общ fallback за други
  структури и JSON-LD `Review`; при нула резултата старият кеш се пази.
- **URL-и:** `/`, `/imoti?cat=houses&loc=Севлиево&budget=0-30000&sort=price_asc`, `/imot/89460/slug`, `/karta`, `/otzivi`; английски: `/en/...`.
- **API:** `GET /api/listings`, `POST /api/ask {q, lang, listingId?}`, `POST /api/contact`, `GET /api/refresh?token=`.

## 3. Локална разработка

```bash
npm install
npm test              # парсер + филтри
npm run dev           # wrangler dev (Workers AI изисква `npx wrangler login`)
npm run dev:offline   # без AI binding — работи без Cloudflare акаунт, ползва keyword fallback
npm run deploy        # ръчен deploy с wrangler (не е нужен при GitHub интеграцията)
```

## 4. Бележки

- Дизайн: „clean & bright“ — бял фон, един акцент (`#167A5A`), шрифт Plus Jakarta Sans, големи снимки, закръглени карти.
  Структурата на страниците следва handoff-а от Claude Design (Bulgarian Real Estate Gateway).
  „Намалени“ не се показва като основна категория; има обща секция „Избрани имоти“. Целият стил е в `public/styles.css`.
- Имейлът на Никола не е публикуван в suprimmo.bg (скрит зад captcha), затова сайтът ползва телефон, WhatsApp, Viber и формата.
- Данните на обявите са собственост на SUPRIMMO / PROPERTY.BG; всяка страница на имот води към оригиналната обява.

---

## English summary

Worker-rendered real-estate site for agent Nikola Ivanov. Listings are scraped from his SUPRIMMO broker page (all pages),
cached in KV / edge cache with a bundled seed fallback, and rendered in Bulgarian and English. Deploy from the Cloudflare
dashboard: *Workers & Pages → Create → Workers → Import a repository*, no build command, deploy command `npx wrangler deploy`.
Add the custom domain under *Settings → Domains & Routes*. Optional: KV namespace (uncomment in `wrangler.jsonc`),
Resend email secrets, `REFRESH_TOKEN`. Workers AI powers the natural-language search with a keyword fallback.

## Buyer discovery and seller enquiries (September 2026)

Variant 1 remains the visual base. Regional groups from variant 2 now link to actual
`/imoti?region=…` filters and survive sorting, pagination and the list/map switch.
Unknown villages are not inferred to belong to a narrower area from their province alone.
The homepage includes optional area, budget, property type and deal selectors for AI search.
`POST /api/ask` accepts `{q, lang, filters: {region, budget, type, deal}}`; `q` can be empty
when a structured criterion is selected. Structured criteria and recognised free-text
constraints narrow the catalogue before AI ranking. Neither AI nor keyword fallback silently
relaxes those constraints. Without AI, only the recognised criteria are applied; subjective
requirements such as privacy or year-round suitability still need confirmation.

The reduced-price navigation, homepage section and category chips are removed. Existing
`cat=reduced` URLs and factual price reductions on individual listings continue to work.

`/predlozhete-imot` and `/en/predlozhete-imot` provide a discreet seller entry via the homepage
contact area and footer. Seller enquiries include `intent: "sell"`, `propertyLocation` and
`propertyType` in the existing KV/email delivery flow and WhatsApp fallback. No new secrets
or bindings are needed. As before, receiving enquiries requires the existing LISTINGS KV
binding or Resend configuration. If neither is configured, the site explicitly offers
WhatsApp instead of claiming that the enquiry was received.

### Property knowledge

`data/property-notes.js` is the first broker-owned content layer, keyed by the existing listing
ID. It is intentionally empty until Nikola supplies verified information. Supported keys:
`access`, `yearRound`, `amenities`, `nearestTown`. Each fact requires:

- `text`: Bulgarian text, or `{bg: "…", en: "…"}`; missing English falls back to Bulgarian.
- `source`: a public description of the source, such as a broker visit.
- `reviewedAt`: the date of verification, `YYYY-MM-DD`, not a future date.

The property page and both AI flows consume the same validated facts. Unknown or incomplete
facts remain explicitly unknown; AI is instructed to use supplied evidence and never infer
access, amenities or distances from the map. The four suggested buyer questions cover access,
year-round living, local amenities and distance to the nearest town. Visitors can still type
any question. No preset tax/fee question or hardcoded estimate is provided.

This file is public content: never include owner contacts, private addresses or internal notes.
Scraping continues to supply the current catalogue and cannot overwrite this separate content.
Editing this file currently requires a code change and deployment. A content administration
interface, independent listing lifecycle, richer regional guides, and reviewed original
property descriptions are a next phase; they are not implemented by this first version.

Validation: `npm test` covers regional grouping, strict AI constraints/fallback, reviewed
content validation, and both language renderers. `npx wrangler deploy --dry-run` checks the
Worker bundle without deploying.
