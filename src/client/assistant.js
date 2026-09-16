import { Conversation } from "@elevenlabs/client";
const en = document.documentElement.lang === "en";
const txt = (bg, eng) => (en ? eng : bg);
const propertyId =
  Number(location.pathname.match(/\/imot\/(\d+)/)?.[1]) || null;
let config,
  session,
  pending = "",
  busy = false,
  generation = 0,
  previousFocus;
const root = document.createElement("div");
root.className = "assistant";
root.innerHTML = `<button class="assistant-launch" type="button" aria-controls="assistant-dialog" aria-expanded="false">${txt("Попитайте асистента", "Ask the assistant")}</button><section id="assistant-dialog" class="assistant-panel" role="dialog" aria-modal="true" aria-label="${txt("Асистент на Никола", "Nikola’s assistant")}" hidden><header><strong>${txt("Асистент на Никола", "Nikola’s assistant")}</strong><button type="button" data-close aria-label="${txt("Затвори", "Close")}">×</button></header><div class="assistant-body"><p data-notice></p><div data-start><button type="button" data-text>${txt("Започни текстов разговор", "Start text chat")}</button><button type="button" data-voice>${txt("Започни гласов разговор", "Start voice conversation")}</button><p class="small">${txt("С избрания бутон потвърждавате началото на разговора. Микрофонът се включва само при гласов разговор.", "Selecting a button confirms starting the conversation. The microphone is used only for voice conversations.")}</p></div><p data-status role="status"></p><div data-messages class="assistant-messages" aria-live="polite"></div><div data-matches></div><form data-message hidden><label class="sr-only" for="assistant-input">${txt("Съобщение", "Message")}</label><input id="assistant-input" maxlength="2000" required autocomplete="off"><button>${txt("Изпрати", "Send")}</button></form><button type="button" data-end hidden>${txt("Край на разговора", "End conversation")}</button><p class="small"><a data-direct>${txt("Директно с Никола", "Contact Nikola directly")}</a> · <a data-whatsapp target="_blank" rel="noopener">WhatsApp</a> · <a data-viber>Viber</a></p></div></section>`;
document.body.append(root);
const $ = (s) => root.querySelector(s),
  panel = $(".assistant-panel"),
  status = $("[data-status]");
async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw Error(data.error || txt("Възникна грешка.", "Something went wrong."));
  return data;
}
const ready = fetch("/api/assistant/config?lang=" + (en ? "en" : "bg"))
  .then((r) => r.json())
  .then((c) => {
    config = c;
    root.classList.toggle("assistant-left", c.position === "left");
    $("[data-notice]").textContent = c.notice;
    $("[data-direct]").href = "tel:" + c.phone;
    $("[data-whatsapp]").href =
      "https://wa.me/" + (c.whatsapp || c.phone).replace(/\D/g, "");
    $("[data-viber]").href =
      "viber://chat?number=" + encodeURIComponent(c.whatsapp || c.phone);
    if (!c.enabled) {
      $("[data-start]").hidden = true;
      status.textContent = txt(
        "Асистентът още не е активиран. Свържете се с Никола или използвайте филтрите за търсене.",
        "The assistant is not active yet. Contact Nikola or use the search filters.",
      );
    }
  })
  .catch(() => {
    status.textContent = txt(
      "Няма връзка с асистента. Телефон: +359 884 128 117",
      "Assistant unavailable. Phone: +359 884 128 117",
    );
    $("[data-start]").hidden = true;
  });
function message(role, text) {
  if (!text) return;
  const p = document.createElement("p");
  p.className = role === "user" ? "from-user" : "from-agent";
  p.textContent = text;
  $("[data-messages]").append(p);
  p.scrollIntoView({ block: "nearest" });
}
function open(q = "") {
  previousFocus = document.activeElement;
  panel.hidden = false;
  $(".assistant-launch").setAttribute("aria-expanded", "true");
  if (q) {
    if (session) {
      session.sendUserMessage(q);
      message("user", q);
    } else {
      pending = q;
      status.textContent = txt(
        "Въпросът Ви е готов. Изберете текстов или гласов разговор.",
        "Your question is ready. Choose text or voice.",
      );
    }
  }
  $("[data-close]").focus();
}
async function end() {
  generation++;
  if (session) {
    const old = session;
    session = null;
    await old.endSession().catch(() => {});
  }
  $("[data-start]").hidden = !config?.enabled;
  $("[data-message]").hidden = true;
  $("[data-end]").hidden = true;
}
async function start(voice) {
  if (busy || session) return;
  busy = true;
  const started = ++generation;
  await ready;
  if (!config?.enabled) {
    busy = false;
    return;
  }
  $("[data-start]").hidden = true;
  status.textContent = txt("Свързване…", "Connecting…");
  try {
    const c = await post("/api/assistant/session", {
      lang: en ? "en" : "bg",
      propertyId,
      pagePath: location.pathname,
      consent: true,
    });
    if (started !== generation) {
      busy = false;
      return;
    }
    const startedSession = await Conversation.startSession({
      signedUrl: c.signedUrl,
      connectionType: "websocket",
      textOnly: !voice,
      dynamicVariables: c.dynamicVariables,
      overrides: {
        agent: { language: en ? "en" : "bg", firstMessage: c.firstMessage },
        conversation: { textOnly: !voice },
      },
      clientTools: {
        show_properties: async ({ ids }) => {
          const values = String(ids)
            .split(",")
            .map(Number)
            .filter(Number.isFinite);
          const res = await post("/api/assistant/matches", {
            ids: values,
            lang: en ? "en" : "bg",
          });
          $("[data-matches]").innerHTML = res.html;
          return "Published property cards shown.";
        },
      },
      onMessage: (m) =>
        message(m.source === "user" ? "user" : "agent", m.message),
      onError: () => {
        status.textContent = txt(
          "Връзката прекъсна. Опитайте отново или се свържете с Никола.",
          "Connection failed. Try again or contact Nikola.",
        );
        void end();
      },
      onDisconnect: () => {
        session = null;
        $("[data-message]").hidden = true;
        $("[data-end]").hidden = true;
        $("[data-start]").hidden = !config?.enabled;
        status.textContent = txt("Разговорът приключи.", "Conversation ended.");
      },
    });
    if (started !== generation) {
      await startedSession.endSession();
      return;
    }
    session = startedSession;
    $("[data-message]").hidden = false;
    $("[data-end]").hidden = false;
    status.textContent = voice
      ? txt(
          "Гласов разговор · микрофонът е включен",
          "Voice conversation · microphone on",
        )
      : txt("Текстов разговор", "Text chat");
    if (pending) {
      session.sendUserMessage(pending);
      message("user", pending);
      pending = "";
    }
    if (!voice) $("#assistant-input").focus();
  } catch (e) {
    status.textContent = e.message;
    await end();
  } finally {
    busy = false;
  }
}
$(".assistant-launch").onclick = () => open();
$("[data-close]").onclick = async () => {
  panel.hidden = true;
  $(".assistant-launch").setAttribute("aria-expanded", "false");
  previousFocus?.focus();
  await end();
};
$("[data-text]").onclick = () => start(false);
$("[data-voice]").onclick = () => start(true);
$("[data-end]").onclick = () => end();
$("[data-message]").onsubmit = (e) => {
  e.preventDefault();
  const input = $("#assistant-input");
  if (session && input.value.trim()) {
    session.sendUserMessage(input.value.trim());
    message("user", input.value.trim());
    input.value = "";
  }
};
panel.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("[data-close]").click();
  if (e.key === "Tab") {
    const list = [...panel.querySelectorAll("button,input,a[href]")].filter(
      (x) => x.offsetParent !== null && !x.disabled,
    );
    const first = list[0],
      last = list.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
});
document
  .querySelectorAll("[data-agent-open]")
  .forEach((b) => (b.onclick = () => open()));
document
  .querySelectorAll("[data-agent-search],[data-agent-ask]")
  .forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let q = form.elements.q.value.trim();
      if (form.matches("[data-agent-search]")) {
        const f = new FormData(form);
        for (const k of ["region", "budget", "type", "deal"]) {
          const v = f.get(k);
          if (v) q += ` ${k}: ${v}.`;
        }
      }
      open(q);
    });
    form.parentNode
      .querySelectorAll("[data-ai-chip],[data-search-example]")
      .forEach((b) =>
        b.addEventListener("click", () => {
          form.elements.q.value = b.textContent.trim();
          open(b.textContent.trim());
        }),
      );
  });
