import { html } from "./html.js";
import { page, href } from "./layout.js";
import { cardGrid } from "./components.js";
import { regionOf } from "../regions.js";
export function renderRegion({ lang, data, region, env }) {
  const items = data.items.filter((l) => regionOf(l) === region.key),
    title = region.name[lang] || region.name.bg;
  const body = html`<section class="wrap section">
    <nav class="crumbs">
      <a href="${href(lang, "/#regions")}"
        >${lang === "en" ? "Areas" : "Райони"}</a
      >
    </nav>
    <h1>${title}</h1>
    <div class="prose">
      ${(region.guide?.[lang] || region.guide?.bg || "").split(/\n\s*\n/).map((p) => html`<p>${p}</p>`)}
    </div>
    <p>
      <button type="button" class="btn btn-primary" data-agent-open>
        ${lang === "en" ? "Tell us what you are looking for" : "Споделете какъв имот търсите"}
      </button>
    </p>
    <h2>
      ${lang === "en" ? "Properties in this area" : "Имоти в този район"}
      (${items.length})
    </h2>
    ${items.length ? cardGrid(items, lang) : html`<p>${lang === "en" ? "No published properties yet. Ask Nikola about upcoming offers." : "Все още няма публикувани имоти. Попитайте Никола за предстоящи предложения."}</p>`}
  </section>`;
  return page({ lang, path: `/raion/${region.key}`, title, body, env });
}
