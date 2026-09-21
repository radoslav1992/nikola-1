/* Private broker workspace. All data access is authenticated by the Worker. */
const root = document.querySelector("#admin-root");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const labels = {
  properties: "Имоти",
  regions: "Райони",
  leads: "Запитвания",
  calendar: "Календар",
  conversations: "Разговори",
  knowledge: "База знания",
  settings: "Настройки",
  activity: "История",
};
const states = {
  draft: "Чернова",
  published: "Публикуван",
  archived: "Архив",
  active: "Активен",
  reserved: "Резервиран",
  sold: "Продаден",
  withdrawn: "Свален",
  new: "Ново",
  contacted: "Потърсен",
  closed: "Приключено",
  open: "Свободен",
  booked: "Запазен",
  blocked: "Блокиран",
  confirmed: "Потвърден",
  cancelled: "Отменен",
};
let tab = "properties",
  editor = null,
  regionItems = [];
const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)];
const time = (v) =>
  v
    ? new Date(v).toLocaleString("bg-BG", {
        timeZone: "Europe/Sofia",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
async function api(path, body, method = body ? "POST" : "GET", signal) {
  const r = await fetch("/api/admin/" + path, {
    method,
    signal,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error("Неуспешна връзка със сървъра.");
  }
  if (!r.ok) {
    if (r.status === 401 && path !== "login") login();
    throw Error(d.error || "Неуспешна операция.");
  }
  return d;
}
function notify(text, error = false) {
  const el = $("#status");
  if (el) {
    el.textContent = text;
    el.className = error ? "error" : "success";
  }
}
function action(fn) {
  return async (e) => {
    e?.preventDefault();
    const button = e?.currentTarget;
    if (button?.tagName === "BUTTON") button.disabled = true;
    try {
      await fn(e);
    } catch (err) {
      notify(err.message, true);
    } finally {
      if (button?.tagName === "BUTTON") button.disabled = false;
    }
  };
}
function field(key, label, value = "", type = "text") {
  return `<label>${label}<input name="${key}" type="${type}" value="${esc(value)}" ${type === "number" ? 'min="0" step="any"' : ""}></label>`;
}
function area(key, label, value = "", rows = 5) {
  return `<label class="wide">${label}<textarea name="${key}" rows="${rows}">${esc(value)}</textarea></label>`;
}
function check(key, label, value) {
  return `<label class="check"><input name="${key}" type="checkbox" ${value ? "checked" : ""}>${label}</label>`;
}
function select(key, label, value, options) {
  return `<label>${label}<select name="${key}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(value) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
}
function table(head, rows) {
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${head.length}">Все още няма записи.</td></tr>`}</tbody></table></div>`;
}
function login() {
  root.innerHTML =
    '<main class="login"><h1>НИ Имоти</h1><p>Вход за управление на имотите и разговорите.</p><form id="login"><label>Парола<input name="password" type="password" required autocomplete="current-password"></label><button>Вход</button></form><p id="status" role="status"></p><a href="/">Към сайта</a></main>';
  $("#login").onsubmit = action(async () => {
    await api("login", {
      password: $("#login").elements.namedItem("password").value,
    });
    shell();
    await load();
  });
}
function shell() {
  root.innerHTML = `<header class="top"><a href="/">НИ Имоти</a><span>Работно пространство на Никола</span><button id="logout" class="quiet">Изход</button></header><div class="workspace"><nav aria-label="Управление">${Object.entries(
    labels,
  )
    .map(([k, v]) => `<button data-tab="${k}">${v}</button>`)
    .join(
      "",
    )}</nav><main><h1 id="title"></h1><p id="status" role="status"></p><div id="content"></div></main></div><dialog id="notes"><button class="quiet" id="close-notes">Затвори</button><h2>Бележки</h2><div id="note-list"></div><form id="note-form"><label>Нова бележка<textarea name="body" rows="4" required></textarea></label><button>Добави бележка</button></form><p id="note-status" role="status"></p></dialog>`;
  all("[data-tab]").forEach(
    (b) =>
      (b.onclick = action(async () => {
        if (
          editor &&
          !confirm(
            "Да затворя ли редактора? Незапазените промени ще се загубят.",
          )
        )
          return;
        editor = null;
        tab = b.dataset.tab;
        await load();
      })),
  );
  $("#logout").onclick = action(async () => {
    await api("logout", {});
    login();
  });
  $("#close-notes").onclick = () => $("#notes").close();
}
async function load() {
  $("#title").textContent = labels[tab];
  all("[data-tab]").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab),
  );
  notify("");
  $("#content").innerHTML = "<p>Зареждане…</p>";
  await views[tab]();
}
async function notes(type, id) {
  const dialog = $("#notes");
  if (!dialog.open) dialog.showModal();
  const data = await api(
    `notes?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`,
  );
  $("#note-list").innerHTML =
    data.items
      .map(
        (n) =>
          `<article><small>${time(n.created_at)}</small><p class="pre">${esc(n.body)}</p></article>`,
      )
      .join("") || "<p>Няма бележки.</p>";
  $("#note-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("notes", {
        type,
        entity_id: String(id),
        body: $("#note-form").elements.namedItem("body").value,
      });
      $("#note-form").reset();
      await notes(type, id);
    } catch (err) {
      $("#note-status").textContent = err.message;
    }
  };
}
function bindNotes() {
  all("[data-note]").forEach(
    (b) => (b.onclick = action(() => notes(b.dataset.kind, b.dataset.note))),
  );
}
const views = {
  async properties() {
    const { items } = await api("properties");
    $("#content").innerHTML =
      `<div class="toolbar"><button id="new-property">Нов имот</button><button class="quiet" id="sync">Обнови от SUPRIMMO</button><input id="find" placeholder="Заглавие, място или номер"><select id="state"><option value="">Всички</option value="published">Публикувани</option value="draft">Чернови</option value="archived">Архив</option value="review">За преглед</option></select></div><p>${items.filter((i) => i.publication === "published").length} публикувани · ${items.length} общо. Новите импорти остават чернови, докато ги прегледате и публикувате.</p><div id="property-list"></div>`;
    const draw = () => {
      const q = $("#find").value.toLocaleLowerCase(),
        state = $("#state").value;
      const rows = items.filter(
        (p) =>
          (!state ||
            (state === "review" ? p.needs_review : p.publication === state)) &&
          `${p.id} ${p.content.title} ${p.content.place}`
            .toLocaleLowerCase()
            .includes(q),
      );
      $("#property-list").innerHTML = table(
        ["Имот", "Място", "Цена (€)", "Публикация", "Наличност", ""],
        rows.map((p) => [
          `<b>${esc(p.content.title || p.source.title || "Нов имот")}</b><small>#${p.id}${p.needs_review ? " · За преглед" : ""}</small>`,
          esc(p.content.place),
          esc(p.sync_price && p.source_id ? p.source.price : p.content.price),
          states[p.publication],
          states[p.status],
          `<button class="quiet" data-edit="${p.id}">Редактирай</button>`,
        ]),
      );
      all("[data-edit]").forEach(
        (b) => (b.onclick = action(() => editProperty(Number(b.dataset.edit)))),
      );
    };
    draw();
    $("#find").oninput = draw;
    $("#state").onchange = draw;
    $("#new-property").onclick = action(async () => {
      const p = await api("properties", { content: {} });
      await editProperty(p.id);
    });
    $("#sync").onclick = action(async () => {
      notify("Обновяване на цени и наличност…");
      const d = await api("sync", {});
      await load();
      notify(
        `Обновени ${d.count} имота.${d.failedPages?.length ? " Непълен импорт — наличността не е променена." : ""}`,
      );
    });
  },
  async regions() {
    regionItems = (await api("regions")).items;
    drawRegions();
  },
  async leads() {
    const { items } = await api("leads");
    $("#content").innerHTML = table(
      ["Получено", "Име / контакт", "Запитване", "Статус", ""],
      items.map((r) => [
        time(r.created_at),
        `<b>${esc(r.data.name)}</b><br>${esc(r.data.contact)}`,
        `<strong>${r.data.intent === "sell" ? "Предложение за продажба" : "Търсене на имот"}</strong><p class="pre">${esc([r.data.propertyLocation, r.data.propertyType, r.data.message].filter(Boolean).join("\n"))}</p>`,
        select(
          "status",
          "",
          r.status,
          ["new", "contacted", "closed"].map((s) => [s, states[s]]),
        ).replace("<select ", '<select data-lead="' + r.id + '" '),
        `<button data-note="${r.id}" data-kind="lead">Бележки</button>`,
      ]),
    );
    bindNotes();
    all("[data-lead]").forEach(
      (s) =>
        (s.onchange = action(() =>
          api("leads/" + s.dataset.lead, { status: s.value }, "PATCH"),
        )),
    );
  },
  async calendar() {
    const data = await api("calendar");
    $("#content").innerHTML =
      `<p>Часовете се показват в Europe/Sofia. Агентът може да резервира само добавени тук свободни часове.</p><a href="/api/admin/calendar.ics">Изтегли потвърдените огледи (.ics)</a><form id="slot" class="panel form-grid"><h2 class="wide">Добави час</h2>${field("starts_at", "Начало (часова зона на устройството)", "", "datetime-local")}${field("ends_at", "Край (часова зона на устройството)", "", "datetime-local")}${check("blocked", "Блокиран период", false)}<button>Добави</button></form><label>Ден<input id="calendar-day" type="date"></label><div id="calendar-list"></div><h2>Огледи и уговорки</h2>${table(
        ["Час", "Клиент", "Имот", "Статус", ""],
        data.appointments.map((a) => [
          time(a.starts_at),
          `${esc(a.name)}<br>${esc(a.contact)}<p>${esc(a.message)}</p>`,
          esc(a.property_id || "Консултация"),
          states[a.status],
          `<button data-note="${a.id}" data-kind="appointment">Бележки</button>${a.status === "confirmed" ? ` <button class="quiet" data-cancel="${a.id}">Отмени</button>` : ""}`,
        ]),
      )}`;
    const draw = () => {
      const day = $("#calendar-day").value;
      const rows = data.slots.filter(
        (s) =>
          !day ||
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Sofia",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(s.starts_at)) === day,
      );
      $("#calendar-list").innerHTML = table(
        ["Начало", "Край", "Състояние", ""],
        rows.map((s) => [
          time(s.starts_at),
          time(s.ends_at),
          states[s.state],
          s.state === "open"
            ? `<button class="quiet" data-block="${s.id}">Блокирай</button>`
            : "",
        ]),
      );
      all("[data-block]").forEach(
        (b) =>
          (b.onclick = action(async () => {
            await api(
              "slots/" + b.dataset.block,
              { state: "blocked" },
              "PATCH",
            );
            await load();
          })),
      );
    };
    draw();
    $("#calendar-day").onchange = draw;
    $("#slot").onsubmit = action(async () => {
      const f = $("#slot");
      await api("calendar", {
        starts_at: new Date(
          f.elements.namedItem("starts_at").value,
        ).toISOString(),
        ends_at: new Date(f.elements.namedItem("ends_at").value).toISOString(),
        blocked: f.elements.namedItem("blocked").checked,
      });
      await load();
      notify("Часът е добавен.");
    });
    all("[data-cancel]").forEach(
      (b) =>
        (b.onclick = action(async () => {
          if (!confirm("Да отменя ли уговорката и да освободя часа?")) return;
          await api("appointments/" + b.dataset.cancel + "/cancel", {});
          await load();
        })),
    );
    bindNotes();
  },
  async conversations() {
    const { items } = await api("conversations");
    $("#content").innerHTML =
      `<button id="sync-calls">Обнови разговорите</button><p>Транскрипциите пристигат след края на разговора. Аудио има само когато записването е включено.</p>${items.map((c) => `<details class="panel"><summary>${time(c.occurred_at)} · ${c.channel === "phone" ? "Телефон" : "Сайт"} · ${esc(c.status)}</summary><p>${esc(c.summary)}</p>${c.metadata.hasAudio ? `<audio controls preload="none" src="/api/admin/conversations/${encodeURIComponent(c.id)}/audio"></audio>` : ""}<div class="transcript">${c.transcript.map((t) => `<p><b>${t.role === "user" ? "Посетител" : "Асистент"}:</b> ${esc(t.message)}</p>`).join("")}</div><button data-note="${c.id}" data-kind="conversation">Бележки</button></details>`).join("") || "<p>Няма разговори.</p>"}`;
    $("#sync-calls").onclick = action(async () => {
      await api("conversations/sync", {});
      await load();
    });
    bindNotes();
  },
  async knowledge() {
    const { items } = await api("knowledge");
    $("#content").innerHTML =
      `<p>Проверена информация за процеса на работа, районите и услугите. Агентът чете тези документи при въпрос. Текущите цени се вземат от каталога.</p><form id="knowledge" class="panel form-grid">${field("title", "Заглавие")}${field("file", "Зареди текстов документ (.txt, .md)", "", "file")}${area("body", "Съдържание", "", 10)}<button>Добави документ</button></form>${items.map((k) => `<details class="panel"><summary>${esc(k.title)}</summary><p class="pre">${esc(k.body)}</p><button data-knowledge="${k.id}" class="quiet">Редактирай</button></details>`).join("")}`;
    $("#knowledge").elements.namedItem("file").accept =
      ".txt,.md,text/plain,text/markdown";
    $("#knowledge").elements.namedItem("file").onchange = action(async () => {
      const f = $("#knowledge").elements.namedItem("file").files[0];
      if (f) {
        if (f.size > 100000) throw Error("Документът трябва да е до 100 KB.");
        $("#knowledge").elements.namedItem("body").value = await f.text();
        $("#knowledge").elements.namedItem("title").value = f.name;
      }
    });
    let editing = null;
    all("[data-knowledge]").forEach(
      (b) =>
        (b.onclick = () => {
          editing = b.dataset.knowledge;
          const k = items.find((k) => k.id === editing);
          $("#knowledge").elements.namedItem("title").value = k.title;
          $("#knowledge").elements.namedItem("body").value = k.body;
          $("#knowledge").scrollIntoView();
        }),
    );
    $("#knowledge").onsubmit = action(async () => {
      await api(
        "knowledge" + (editing ? "/" + editing : ""),
        {
          title: $("#knowledge").elements.namedItem("title").value,
          body: $("#knowledge").elements.namedItem("body").value,
        },
        editing ? "PUT" : "POST",
      );
      await load();
      notify("Документът е запазен.");
    });
  },
  async settings() {
    const { settings: s, ready } = await api("settings");
    $("#content").innerHTML = `<div class="readiness">${Object.entries({
      db: "База данни",
      media: "Снимки",
      elevenlabs: "ElevenLabs",
      tools: "Достъп на агента",
      webhook: "История на разговорите",
      translation: "Преводи",
    })
      .map(([k, v]) => `<span>${ready[k] ? "✓" : "○"} ${v}</span>`)
      .join(
        "",
      )}</div><form id="settings" class="form-grid panel">${field("phone", "Телефон на Никола", s.phone || "+359884128117")}${field("whatsapp", "WhatsApp / Viber", s.whatsapp || "+359884128117")}${field("voiceId", "ElevenLabs Voice ID", s.voiceId)}${field("llm", "Модел на агента", s.llm || "gemini-2.5-flash")}${select(
      "phoneMode",
      "Телефонни разговори",
      s.phoneMode || "website",
      [
        ["website", "Само сайт"],
        ["direct", "Входящи обаждания към агента"],
        ["missed", "Пренасочени пропуснати обаждания"],
      ],
    )}${field("phoneNumberId", "ElevenLabs Phone Number ID", s.phoneNumberId)}<div class="wide"><button type="button" id="numbers" class="quiet">Покажи наличните телефонни номера</button><div id="numbers-list"></div><p>За пропуснатите обаждания настройте условно пренасочване при оператора към отделния номер на агента. Зает номер на друг агент не може да се използва.</p></div>${check("agentEnabled", "Разреши разговори в сайта", s.agentEnabled)}${check("recordAudio", "Записвай и аудио (с предварително съобщение)", s.recordAudio)}${field("retentionDays", "Съхранение на разговорите (дни)", s.retentionDays || 30, "number")}${select(
      "widgetPosition",
      "Позиция на асистента",
      s.widgetPosition || "right",
      [
        ["right", "Долу вдясно"],
        ["left", "Долу вляво"],
      ],
    )}${area("recordingNotice", "Допълнително съобщение преди разговор (BG)", s.recordingNotice, 3)}${area("recordingNoticeEn", "Допълнително съобщение преди разговор (EN)", s.recordingNoticeEn, 3)}<button>Запази настройките</button></form><div class="panel"><p>Агент: ${esc(s.agentId || "Все още не е създаден")} · ${s.configured ? "Настроен" : "Изисква прилагане"}</p><button id="configure">${s.agentManagement === "external" ? "Провери връзката и активирай" : s.agentId ? "Приложи настройките в ElevenLabs" : "Създай агента в ElevenLabs"}</button><p>${s.agentManagement === "external" ? "Гласът, моделът, инструментите, записването и телефонът се управляват в ElevenLabs. Срокът за съхранение тук се отнася за копието на разговорите в сайта." : "Този бутон настройва агента и избрания отделен телефонен номер."}</p></div><form id="connect-agent" class="panel form-grid">${field("existingAgentId", "Свържи съществуващ ElevenLabs Agent ID", s.agentId || "agent_2001m3080a0ff86r8wgj0tk9n6mr")}<p class="wide">Проверява достъпа и разрешава език, първо съобщение и текстов режим за сайта. Запазва prompt-а, гласа, инструментите, webhook-а и телефонните настройки в ElevenLabs.</p><button>Свържи съществуващ агент</button></form>`;
    $("#settings").onsubmit = action(async () => {
      const f = $("#settings"),
        data = Object.fromEntries(new FormData(f));
      for (const k of ["recordAudio", "agentEnabled"])
        data[k] = f.elements[k].checked;
      await api("settings", data, "PUT");
      await load();
      notify(
        s.agentManagement === "external"
          ? "Запазено."
          : "Запазено. Приложете настройките в ElevenLabs.",
      );
    });
    $("#numbers").onclick = action(async () => {
      const { items } = await api("phone-numbers");
      $("#numbers-list").innerHTML = table(
        ["Номер", "ID", "Зает от"],
        items.map((n) => [
          esc(n.number),
          esc(n.id),
          esc(n.assignedAgent || "Свободен"),
        ]),
      );
    });
    $("#connect-agent").onsubmit = action(async () => {
      const agentId = $("#connect-agent").elements.existingAgentId.value.trim();
      notify("Проверка на агента и свързване…");
      await api("agent/connect", { agentId });
      await load();
      notify("Агентът е свързан. Текстовият и гласовият чат са активирани.");
    });
    $("#configure").onclick = action(async () => {
      notify("Настройване на агента…");
      await api("agent/configure", {});
      await load();
      notify("Агентът е настроен.");
    });
  },
  async activity() {
    const data = await api("activity");
    $("#content").innerHTML = `<h2>Синхронизации</h2>${table(
      ["Кога", "Резултат", "Детайли"],
      data.syncs.map((s) => [time(s.created_at), esc(s.state), esc(s.detail)]),
    )}<h2>Промени</h2>${table(
      ["Кога", "Действие", "Запис", "Детайли"],
      data.audit.map((a) => [
        time(a.created_at),
        esc(a.action),
        esc(a.entity_id),
        esc(a.detail),
      ]),
    )}`;
  },
};
async function editProperty(id) {
  editor = await api("properties/" + id);
  const c = editor.content,
    { items: regions } = await api("regions");
  $("#title").textContent = "Редакция на имот";
  $("#content").innerHTML =
    `<div class="toolbar"><button id="back" class="quiet">← Към имотите</button><button data-note="${id}" data-kind="property" class="quiet">Лични бележки</button><a href="/imot/${id}" target="_blank" rel="noopener">Публична страница</a>${editor.source_id ? '<button type="button" id="import-detail" class="quiet">Зареди заглавие, описание и снимки от SUPRIMMO</button>' : ""}</div><p class="muted">За публикуване са нужни заглавие и пълно описание на BG и EN, тип, действително населено място, снимка и двете отметки за преглед в края. Можете да запазвате незавършен имот като „Чернова“.</p><form id="property" class="form-grid panel"><h2 class="wide">Публикация и наличност</h2>${select(
      "publication",
      "Публикация",
      editor.publication,
      ["draft", "published", "archived"].map((s) => [s, states[s]]),
    )}${select(
      "status",
      "Наличност",
      editor.status,
      ["active", "reserved", "sold", "withdrawn"].map((s) => [s, states[s]]),
    )}${check("sync_price", "Обновявай цената от SUPRIMMO", editor.sync_price && editor.source_id)}${check("sync_status", "Следи наличността в SUPRIMMO", editor.sync_status && editor.source_id)}<p class="wide muted">Източник: ${esc(editor.source_id || "Собствен имот")} · Последна синхронизация: ${time(editor.synced_at)} · Цена при източника: ${esc(editor.source.price ?? "—")} €. При две пълни проверки без обявата тя се сваля автоматично, ако следенето е включено.</p>${field("title", "Заглавие (BG)", c.title)}${field("titleEn", "Заглавие (EN)", c.titleEn)}${field("type", "Тип (напр. Къща)", c.type)}${field("place", "Действително населено място", c.place)}${field("region", "Област", c.region)}${select("regionKey", "Район на сайта", c.regionKey || "", [["", "Избери район"], ...regions.map((r) => [r.key, r.name.bg])])}${field("price", "Собствена цена (€)", c.price, "number")}${field("area", "Площ (м²)", c.area, "number")}${field("plotArea", "Двор / парцел (м²)", c.plotArea, "number")}${field("bedrooms", "Спални", c.bedrooms, "number")}${field("floors", "Етажи", c.floors, "number")}${check("rent", "Под наем", c.rent)}${area("description", "Пълно описание (BG)", c.description, 12)}${area("descriptionEn", "Пълно описание (EN)", c.descriptionEn, 12)}<div class="wide toolbar"><button type="button" id="translate" class="quiet">Подготви английски превод</button><span id="translation-status" role="status" aria-live="polite"></span></div><h2 class="wide">Снимки</h2><div id="images" class="wide images"></div><label class="wide">Добави снимки (JPEG, PNG, WebP до 8 MB)<input id="upload" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><h2 class="wide">Проверени отговори за купувачите</h2><p class="wide">Само отговори с посочен източник и дата на проверката се показват на сайта и агента.</p>${Object.entries(
      {
        access: "Достъп до имота",
        yearRound: "Целогодишно живеене",
        amenities: "В селото и наблизо",
        nearestTown: "Най-близък град",
        electricity: "Електричество",
        water: "Вода",
        internet: "Интернет",
        condition: "Състояние",
      },
    )
      .map(
        ([k, label]) =>
          `<fieldset class="wide form-grid"><legend>${label}</legend>${area("fact_" + k, "Отговор (BG)", c.facts?.[k]?.text, 2)}${area("factEn_" + k, "Отговор (EN)", c.facts?.[k]?.textEn, 2)}${field("source_" + k, "Източник на проверката", c.facts?.[k]?.source)}${field("reviewed_" + k, "Проверено на", c.facts?.[k]?.reviewedAt, "date")}</fieldset>`,
      )
      .join(
        "",
      )}${area("privateAddress", "Точен адрес — само за администратора", c.privateAddress, 2)}${area("privateNotes", "Вътрешна информация — не се подава на агента", c.privateNotes, 3)}${check("locationConfirmed", "Потвърждавам действителното населено място", c.locationConfirmed)}${check("contentReviewed", "Проверих съдържанието и снимките; няма точен адрес, координати или лични данни в публичните полета", c.contentReviewed)}<div class="wide sticky-save"><button type="submit">Запази имота</button><span id="editor-status" role="status"></span></div></form>`;
  const f = $("#property");
  let images = [...(c.images || [])];
  const drawImages = () => {
    $("#images").innerHTML = images
      .map(
        (im, i) =>
          `<figure><img src="${esc(im.startsWith("/media/") ? im : "/img/medium/" + encodeURIComponent(im))}" alt="Снимка ${i + 1}"><figcaption><button type="button" data-up="${i}" class="quiet" ${i === 0 ? "disabled" : ""}>←</button><button type="button" data-down="${i}" class="quiet" ${i === images.length - 1 ? "disabled" : ""}>→</button><button type="button" data-remove="${i}" class="quiet">Премахни</button></figcaption></figure>`,
      )
      .join("");
    all("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          images.splice(Number(b.dataset.remove), 1);
          drawImages();
        }),
    );
    for (const [key, delta] of [
      ["up", -1],
      ["down", 1],
    ])
      all("[data-" + key + "]").forEach(
        (b) =>
          (b.onclick = () => {
            const i = Number(b.dataset[key]);
            [images[i], images[i + delta]] = [images[i + delta], images[i]];
            drawImages();
          }),
      );
  };
  drawImages();
  $("#back").onclick = action(async () => {
    if (
      !confirm("Да затворя ли редактора? Незапазените промени ще се загубят.")
    )
      return;
    editor = null;
    await load();
  });
  bindNotes();
  $("#upload").onchange = action(async () => {
    for (const file of $("#upload").files) {
      if (file.size > 8 * 1024 * 1024) throw Error("Снимката е над 8 MB.");
      const r = await fetch(`/api/admin/properties/${id}/upload`, {
        method: "POST",
        body: file,
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      images.push(result.url);
    }
    drawImages();
    notify("Снимките са качени. Запазете имота.");
  });
  $("#translate").onclick = async () => {
    const button = $("#translate"),
      status = $("#translation-status");
    if (button.disabled) return;
    const report = (text, error = false) => {
      status.textContent = text;
      status.className = error ? "error" : "success";
      $("#editor-status").textContent = text;
      notify(text, error);
    };
    const title = f.elements.title.value.trim(),
      description = f.elements.description.value.trim();
    if (!title || !description) {
      report("Първо попълнете заглавието и описанието на български.", true);
      return;
    }
    const previousTitleEn = f.elements.titleEn.value,
      previousDescriptionEn = f.elements.descriptionEn.value;
    if (
      (previousTitleEn || previousDescriptionEn) &&
      !confirm("Да заменя ли английския текст с нов превод?")
    )
      return;
    button.disabled = true;
    button.textContent = "Превежда се…";
    button.setAttribute("aria-busy", "true");
    report("Подготвяне на английски превод. Може да отнеме до 90 секунди.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const result = await api(
        `properties/${id}/translate`,
        { title, description },
        "POST",
        controller.signal,
      );
      if (!f.isConnected) return;
      if (
        f.elements.title.value.trim() !== title ||
        f.elements.description.value.trim() !== description ||
        f.elements.titleEn.value !== previousTitleEn ||
        f.elements.descriptionEn.value !== previousDescriptionEn
      ) {
        report(
          "Текстът е променен по време на превода. Натиснете отново за превод на актуалния текст.",
          true,
        );
        return;
      }
      f.elements.titleEn.value = result.titleEn;
      f.elements.descriptionEn.value = result.descriptionEn;
      report(
        "Английското заглавие и описание са попълнени. Прегледайте ги и запазете имота.",
      );
    } catch (error) {
      if (f.isConnected)
        report(
          controller.signal.aborted
            ? "Преводът се забави. Опитайте отново след малко или въведете английския текст ръчно."
            : error.message,
          true,
        );
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      button.textContent = "Подготви английски превод";
      button.removeAttribute("aria-busy");
    }
  };
  if ($("#import-detail"))
    $("#import-detail").onclick = action(async () => {
      if (
        (f.elements.description.value || images.length) &&
        !confirm(
          "Да заредя ли описание и снимки от източника в редактора? Записът ще остане непроменен, докато не натиснете „Запази“.",
        )
      )
        return;
      notify("Извличане на описание и снимки…");
      const d = await api(`properties/${id}/detail`, {});
      if (!f.elements.title.value.trim())
        f.elements.title.value = d.title || "";
      if (d.description) f.elements.description.value = d.description;
      const importedImages = [];
      for (const image of d.images) {
        notify(
          `Копиране на снимка ${importedImages.length + 1} от ${d.images.length}…`,
        );
        importedImages.push(
          d.mirrorAvailable
            ? (await api(`properties/${id}/mirror`, { image })).url
            : image,
        );
      }
      if (importedImages.length) images = importedImages;
      drawImages();
      notify(
        d.mirrorAvailable
          ? "Снимките са копирани в собственото хранилище. Прегледайте описанието."
          : "Заредено. За собствено съхранение на снимките е нужно R2.",
      );
    });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const button = f.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(f)),
        content = { ...c };
      for (const key of [
        "title",
        "titleEn",
        "type",
        "place",
        "region",
        "regionKey",
        "description",
        "descriptionEn",
        "privateNotes",
        "privateAddress",
        "price",
        "area",
        "plotArea",
        "bedrooms",
        "floors",
      ])
        content[key] = data[key];
      for (const key of ["rent", "locationConfirmed", "contentReviewed"])
        content[key] = f.elements[key].checked;
      content.images = images;
      content.facts = {};
      for (const key of [
        "access",
        "yearRound",
        "amenities",
        "nearestTown",
        "electricity",
        "water",
        "internet",
        "condition",
      ])
        content.facts[key] = {
          text: data["fact_" + key],
          textEn: data["factEn_" + key],
          source: data["source_" + key],
          reviewedAt: data["reviewed_" + key],
        };
      editor = await api(
        "properties/" + id,
        {
          content,
          publication: data.publication,
          status: data.status,
          sync_price: f.elements.sync_price.checked,
          sync_status: f.elements.sync_status.checked,
          version: editor.version,
        },
        "PUT",
      );
      $("#editor-status").textContent = "Запазено.";
      notify("Имотът е запазен.");
    } catch (err) {
      $("#editor-status").textContent = err.message;
      notify(err.message, true);
    } finally {
      button.disabled = false;
    }
  };
}
function drawRegions() {
  $("#content").innerHTML =
    `<p>Районите се подреждат по реда по-долу. Имотите се отнасят към район от редактора на имота.</p><form id="regions">${regionItems.map((r, i) => `<fieldset class="panel form-grid" data-region="${i}"><legend>Район ${i + 1}</legend>${field("key", "Код в адреса", r.key)}${field("nameBg", "Име (BG)", r.name.bg)}${field("nameEn", "Име (EN)", r.name.en)}${area("guideBg", "Полезна информация (BG)", r.guide?.bg)}${area("guideEn", "Полезна информация (EN)", r.guide?.en)}${check("enabled", "Показвай района", r.enabled !== false)}</fieldset>`).join("")}<div class="toolbar"><button>Запази районите</button><button type="button" id="add-region" class="quiet">Добави район</button></div></form>`;
  const collect = () =>
    all("[data-region]").map((el) => ({
      key: el.querySelector("[name=key]").value,
      name: {
        bg: el.querySelector("[name=nameBg]").value,
        en: el.querySelector("[name=nameEn]").value,
      },
      guide: {
        bg: el.querySelector("[name=guideBg]").value,
        en: el.querySelector("[name=guideEn]").value,
      },
      enabled: el.querySelector("[name=enabled]").checked,
    }));
  $("#add-region").onclick = () => {
    regionItems = collect();
    regionItems.push({
      key: "",
      name: { bg: "", en: "" },
      guide: { bg: "", en: "" },
      enabled: true,
    });
    drawRegions();
  };
  $("#regions").onsubmit = action(async () => {
    await api("regions", { items: collect() }, "PUT");
    await load();
    notify("Районите са запазени.");
  });
}
api("session")
  .then(() => {
    shell();
    return load();
  })
  .catch((err) => {
    login();
    if (!/Влезте/.test(err.message)) notify(err.message, true);
  });
