import { html } from './html.js';
import { T, CATEGORIES, typeLabel, transliterate } from './i18n.js';
import { page, href } from './layout.js';
import { cardGrid, pagination, viewSwitch } from './components.js';
import { distinctTypes, regionChips, applyFilters, paginate } from '../catalog.js';

export function renderListings({ lang, data, filters, env, path = '/imoti', query = '' }) {
  const t = T[lang];
  const all = data.items;
  const filtered = applyFilters(all, filters);
  const pg = paginate(filtered, filters.page);
  const types = distinctTypes(all);
  const regions = regionChips(all);

  const activeCat = CATEGORIES.find((c) => c.key === filters.cat);
  const title = activeCat ? t[activeCat.label] : filters.type ? typeLabel(filters.type, lang) : filters.loc ? `${t.listTitle}: ${lang === 'en' ? transliterate(filters.loc) : filters.loc}` : t.listTitle;

  const qs = (overrides = {}) => {
    const p = new URLSearchParams();
    const f = { ...filters, ...overrides };
    if (f.q) p.set('q', f.q);
    if (f.loc) p.set('loc', f.loc);
    if (f.type) p.set('type', f.type);
    if (f.cat) p.set('cat', f.cat);
    if (f.deal) p.set('deal', f.deal);
    if (f.budget) p.set('budget', f.budget);
    else { if (f.min != null) p.set('min', f.min); if (f.max != null) p.set('max', f.max); }
    if (f.sort && f.sort !== 'top') p.set('sort', f.sort);
    if (f.page && f.page > 1) p.set('page', f.page);
    const s = p.toString();
    return href(lang, path) + (s ? `?${s}` : '');
  };

  const sortOpts = [['top', t.sortTop], ['price_asc', t.sortPriceAsc], ['price_desc', t.sortPriceDesc], ['area_asc', t.sortAreaAsc], ['area_desc', t.sortAreaDesc]];
  const budgets = [['', t.fBudgetAny], ['0-30000', t.fBudget1], ['30000-60000', t.fBudget2], ['60000-120000', t.fBudget3], ['120000-', t.fBudget4]];
  const hasFilters = filters.q || filters.loc || filters.type || filters.cat || filters.deal || filters.min != null || filters.max != null;

  const body = html`
<section class="wrap page-head">
  <nav class="crumbs"><a href="${href(lang, '/')}">${t.crumbHome}</a><span>/</span><span>${t.navProps}</span></nav>
  <h1>${title}</h1>
  <p class="muted">${t.listSub}</p>
</section>

<section class="wrap">
  <form class="panel filters filters-bar" method="get" action="${href(lang, path)}">
    <div class="filters-grid filters-grid-wide">
      <label>${t.fLocation}<input name="loc" value="${filters.loc}" placeholder="${t.fLocationPh}" list="loc-list"></label>
      <datalist id="loc-list">${regions.map((r) => html`<option value="${r.key}">${lang === 'en' ? transliterate(r.label) : r.label}</option>`)}</datalist>
      <label>${t.fType}<select name="type"><option value="">${t.fTypeAny}</option>${types.map((ty) => html`<option value="${ty}" ${ty === filters.type ? 'selected' : ''}>${typeLabel(ty, lang)}</option>`)}</select></label>
      <label>${t.fBudget}<select name="budget">${budgets.map(([v, l]) => html`<option value="${v}" ${v === filters.budget ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label>${t.fDeal}<select name="deal"><option value="">${t.fDealAny}</option><option value="sale" ${filters.deal === 'sale' ? 'selected' : ''}>${t.fSale}</option><option value="rent" ${filters.deal === 'rent' ? 'selected' : ''}>${t.fRent}</option></select></label>
      <label>${t.fSort}<select name="sort">${sortOpts.map(([v, l]) => html`<option value="${v}" ${v === filters.sort ? 'selected' : ''}>${l}</option>`)}</select></label>
      ${filters.cat ? html`<input type="hidden" name="cat" value="${filters.cat}">` : ''}
      ${filters.q ? html`<input type="hidden" name="q" value="${filters.q}">` : ''}
      <div class="filters-submit"><button type="submit" class="btn btn-dark">${t.fSearch}</button></div>
    </div>
  </form>
  <div class="chips chips-cats">
    <a class="pill ${!filters.cat ? 'on' : ''}" href="${qs({ cat: '', page: 1 })}">${t.fTypeAny}</a>
    ${CATEGORIES.map((c) => {
      const n = all.filter(c.test).length;
      return n ? html`<a class="pill ${filters.cat === c.key ? 'on' : ''}" href="${qs({ cat: c.key, type: '', page: 1 })}">${t[c.label]} <sup>${n}</sup></a>` : '';
    })}
  </div>
</section>

<section class="wrap section-sm">
  <div class="results-head">
    <span class="results-count">${t.results(pg.total)}${filters.q ? html` · „${filters.q}“` : ''}</span>
    <div class="results-tools">
      ${hasFilters ? html`<a class="link-more" href="${href(lang, path)}">${t.clearFilters}</a>` : ''}
      ${viewSwitch(lang, { active: 'list', query })}
    </div>
  </div>
  ${pg.items.length ? cardGrid(pg.items, lang, { eagerFirst: true }) : html`<p class="empty">${t.noResults}</p>`}
  ${pagination(lang, { page: pg.page, pages: pg.pages, buildHref: (n) => qs({ page: n }) })}
</section>`;

  return page({
    lang,
    path: path + (filters.page > 1 ? `?page=${filters.page}` : ''),
    title,
    description: `${t.listSub} ${t.results(all.length)}.`,
    body,
    updatedAt: data.fetchedAt,
    env,
    noindex: Boolean(filters.q),
    pageClass: 'listings',
  });
}
