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
src/render/*        HTML шаблони (layout, home, listings, property), i18n BG/EN
public/             styles.css, app.js, favicon.svg, robots.txt (сервират се от edge-а)
data/seed.json      24-те обяви от стр. 1 (05.09.2026) — стартови данни и авариен fallback
test/               node --test; фикстурата е реален HTML от suprimmo.bg
```

- **Обновяване на обявите:** cron всеки 6 часа (`triggers.crons`) + фоново обновяване при заявка, когда кешът е по-стар от
  `REFRESH_HOURS`. Ако suprimmo.bg не отговори или смени HTML-а така, че да не се намерят карти, старият кеш се пази.
- **Снимки:** проксирани през `/img/{medium|big}/{файл}` и `/img/agent.jpg` (снимката на Никола от luximmo.bg), кеширани 30 дни.
- **Страница на имот:** данните от картата (цена, площ, двор, спални, етажи, Акт 16, намаление) са винаги налични;
  описанието, всички снимки, характеристики и координати се четат от оригиналната страница на имота, когато е достъпна.
  Ако не — има линк към обявата в SUPRIMMO.
- **URL-и:** `/`, `/imoti?cat=houses&loc=Севлиево&budget=0-30000&sort=price_asc`, `/imot/89460/slug`; английски: `/en/...`.
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

- Дизайнът следва handoff-а от Claude Design (Bulgarian Real Estate Gateway): палитра `#F6F3EC / #2B2B2B / #6F8A6A`,
  шрифтове Newsreader + Outfit. Секцията „Продадени“ от макета е заменена с „Имоти с намалена цена“, защото източникът
  не публикува продадени имоти.
- Имейлът на Никола не е публикуван в suprimmo.bg (скрит зад captcha), затова сайтът ползва телефон, WhatsApp, Viber и формата.
- Данните на обявите са собственост на SUPRIMMO / PROPERTY.BG; всяка страница на имот води към оригиналната обява.

---

## English summary

Worker-rendered real-estate site for agent Nikola Ivanov. Listings are scraped from his SUPRIMMO broker page (all pages),
cached in KV / edge cache with a bundled seed fallback, and rendered in Bulgarian and English. Deploy from the Cloudflare
dashboard: *Workers & Pages → Create → Workers → Import a repository*, no build command, deploy command `npx wrangler deploy`.
Add the custom domain under *Settings → Domains & Routes*. Optional: KV namespace (uncomment in `wrangler.jsonc`),
Resend email secrets, `REFRESH_TOKEN`. Workers AI powers the natural-language search with a keyword fallback.
