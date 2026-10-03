import { html } from "./html.js";
import { page, href, assistantEnabled } from "./layout.js";
import { cardGrid } from "./components.js";
import { regionOf } from "../regions.js";
export function renderRegion({ lang, data, region, env }) {
  const items = data.items.filter((l) => regionOf(l) === region.key),
    title = region.name[lang] || region.name.bg,
    tell =
      lang === "en"
        ? "Tell us what you are looking for"
        : "Споделете какъв имот търсите";
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
      ${
        assistantEnabled(env)
          ? html`<button type="button" class="btn btn-primary" data-agent-open>
              ${tell}
            </button>`
          : html`<a class="btn btn-primary" href="${href(lang, "/#contact")}"
              >${tell}</a
            >`
      }
    </p>
    <h2>
      ${lang === "en" ? "Properties in this area" : "Имоти в този район"}
      (${items.length})
    </h2>
    ${items.length ? cardGrid(items, lang) : html`<p>${lang === "en" ? "No published properties yet. Ask Nikola about upcoming offers." : "Все още няма публикувани имоти. Попитайте Никола за предстоящи предложения."}</p>`}
  </section>`;
  return page({ lang, path: `/raion/${region.key}`, title, body, env });
}
