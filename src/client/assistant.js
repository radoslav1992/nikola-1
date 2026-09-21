import { Conversation } from "@elevenlabs/client";
const en = document.documentElement.lang === "en";
const txt = (bg, eng) => (en ? eng : bg);
const propertyId =
  Number(location.pathname.match(/\/imot\/(\d+)/)?.[1]) || null;
let config,
  session,
  pending = "",
  busy = false,
  voiceMode = false,
  muted = false,
  transcriptOpen = false,
  generation = 0,
  previousFocus;
const root = document.createElement("div");
root.className = "assistant";
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    {
      chat: '<path d="M5 3h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7l-4 3V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h5"/>',
      mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
      arrow: '<path d="m5 12 7-7 7 7M12 5v14"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
      home: '<path d="m3 10 9-7 9 7v10H3ZM9 20v-7h6v7"/>',
    }[name]
  }</svg>`;
const suggestions = propertyId
  ? [
      txt("Какъв е достъпът до имота?", "How is the property accessed?"),
      txt(
        "Подходящ ли е за целогодишно живеене?",
        "Is it suitable for year-round living?",
      ),
      txt("Какво има в селото и наблизо?", "What amenities are nearby?"),
      txt("Колко е далеч най-близкият град?", "How far is the nearest town?"),
    ]
  : [
      txt("Помогнете ми да избера район", "Help me choose an area"),
      txt("Търся къща с двор", "I’m looking for a house with a garden"),
      txt("Искам да предложа имот", "I have a property to sell"),
    ];
root.innerHTML = `
<button class="assistant-launch" type="button" aria-controls="assistant-dialog" aria-expanded="false">${icon("chat")}<span>${txt("Попитайте асистента", "Ask the assistant")}</span><span class="assistant-ai">AI</span></button>
<section id="assistant-dialog" class="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title" hidden>
  <header class="assistant-header"><div class="assistant-avatar" aria-hidden="true">НИ<span></span></div><div class="assistant-heading"><strong id="assistant-title">${txt("Асистент на Никола", "Nikola’s assistant")}</strong><span>${txt("Вашият ориентир сред имотите", "A little guidance. A place of your own.")}</span></div><button type="button" data-close aria-label="${txt("Затвори и приключи разговора", "Close and end conversation")}">${icon("close")}</button></header>
  <nav data-switch class="assistant-switch" aria-label="${txt("Режим на разговор", "Conversation mode")}" hidden><button type="button" data-switch-text title="${txt("Започва нов текстов разговор", "Starts a new text conversation")}" aria-pressed="true">${icon("chat")}${txt("Текстов чат", "Text chat")}</button><button type="button" data-switch-voice title="${txt("Започва нов гласов разговор", "Starts a new voice conversation")}" aria-pressed="false">${icon("mic")}${txt("Гласов разговор", "Voice call")}</button></nav>
  <div class="assistant-scroll">
    <div data-welcome class="assistant-welcome"><span class="assistant-eyebrow">${icon("home")}${propertyId ? txt("ЗА ТОЗИ ИМОТ", "ABOUT THIS PROPERTY") : txt("НЕКА НАМЕРИМ ВАШЕТО МЯСТО", "LET’S FIND YOUR PLACE")}</span><h2>${propertyId ? txt("Какво искате да знаете?", "What would you like to know?") : txt("Добрият избор започва с разговор.", "A good choice starts with a conversation.")}</h2><p>${propertyId ? txt("Попитайте за достъпа, условията за живеене или района. Отговарям по информацията в обявата.", "Ask about access, living conditions or the area. My answers use the listing’s information.") : txt("Разкажете ми какъв имот търсите. Ще Ви помогна да разгледате възможностите.", "Tell me what you’re looking for. I’ll help you explore the possibilities.")}</p></div>
    <div data-start><div class="assistant-modes"><button type="button" data-text>${icon("chat")}<span><strong>${txt("Пишете ми", "Let’s chat")}</strong><small>${txt("Започнете текстов разговор", "Start a text conversation")}</small></span></button><button type="button" data-voice>${icon("mic")}<span><strong>${txt("Да поговорим", "Let’s talk")}</strong><small>${txt("Разговор с микрофон", "Use your microphone")}</small></span></button></div><p class="assistant-consent">${txt("Избирате как да започнете. Микрофонът се включва само при гласов разговор.", "Choose how to start. Your microphone is used only for voice conversations.")}</p></div>
    <div data-voice-state class="assistant-voice" hidden><div class="assistant-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span data-voice-label></span><button type="button" data-transcript aria-expanded="false" aria-controls="assistant-transcript">${txt("Покажи разговора", "Show transcript")}</button></div>
    <p data-status role="status"></p>
    <div id="assistant-transcript" data-messages class="assistant-messages" role="log" aria-label="${txt("Разговор", "Conversation")}" aria-live="polite" aria-relevant="additions text"></div>
    <div data-suggestions class="assistant-suggestions"><p>${txt("Може да започнете с…", "A place to start…")}</p>${suggestions.map((q) => `<button type="button" data-suggestion>${q}<span aria-hidden="true">↗</span></button>`).join("")}</div>
    <div data-matches></div>
  </div>
  <div class="assistant-composer"><form data-message><label class="sr-only" for="assistant-input">${txt("Съобщение", "Message")}</label><input id="assistant-input" placeholder="${txt("Попитайте за имот или район…", "Ask about a property or area…")}" maxlength="2000" required autocomplete="off"><button aria-label="${txt("Изпрати", "Send")}">${icon("arrow")}</button></form><p data-chat-hint class="assistant-chat-hint">${txt("Напишете въпрос и натиснете стрелката, за да започнете чат.", "Type a question and press send to start chatting.")}</p><div class="assistant-controls"><button type="button" data-mute aria-pressed="false" hidden>${icon("mic")}<span>${txt("Изключи микрофона", "Mute microphone")}</span></button><button type="button" data-end hidden>${txt("Приключи", "End chat")}</button></div><details class="assistant-privacy" open><summary>${txt("За AI асистента и разговора", "About the AI assistant and your conversation")}</summary><p data-notice></p></details></div>
  <footer class="assistant-footer"><a data-direct href="tel:+359884128117">${txt("Лично с Никола", "Contact Nikola")}</a><span><a data-whatsapp href="https://wa.me/359884128117" target="_blank" rel="noopener">WhatsApp</a><a data-viber href="viber://chat?number=%2B359884128117">Viber</a></span></footer>
</section>`;
document.body.append(root);
const $ = (s) => root.querySelector(s),
  panel = $(".assistant-panel"),
  status = $("[data-status]");
async function post(url, body) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
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
      $("[data-message]").hidden = true;
      $("[data-chat-hint]").hidden = true;
      $("[data-suggestions]").hidden = true;
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
    $("[data-message]").hidden = true;
    $("[data-chat-hint]").hidden = true;
    $("[data-suggestions]").hidden = true;
  });
function message(role, text) {
  if (!text) return;
  const p = document.createElement("p");
  p.className = role === "user" ? "from-user" : "from-agent";
  p.textContent = text;
  $("[data-welcome]").hidden = true;
  $("[data-messages]").append(p);
  if (!voiceMode) p.scrollIntoView({ block: "nearest" });
}
function open(q = "") {
  previousFocus = document.activeElement;
  panel.hidden = false;
  root.classList.add("is-open");
  $(".assistant-launch").setAttribute("aria-expanded", "true");
  if (q) {
    if (session) {
      session.sendUserMessage(q);
      message("user", q);
    } else {
      pending = q;
      $("#assistant-input").value = q;
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
  busy = false;
  const old = session;
  session = null;
  $("[data-start]").hidden = !config?.enabled;
  $("[data-message]").hidden = !config?.enabled;
  $("[data-chat-hint]").hidden = !config?.enabled;
  $("[data-switch]").hidden = true;
  $("[data-end]").hidden = true;
  root.classList.remove("is-voice");
  $("[data-mute]").hidden = true;
  $("[data-voice-state]").hidden = true;
  root.classList.remove("is-speaking");
  voiceMode = false;
  $("[data-messages]").hidden = false;
  $("[data-message] button").disabled = false;
  $("#assistant-input").disabled = false;
  if (old) await old.endSession().catch(() => {});
}
async function start(voice) {
  if (busy || session) return;
  busy = true;
  const started = ++generation;
  await ready;
  if (started !== generation) return;
  if (!config?.enabled) {
    busy = false;
    return;
  }
  pending = $("#assistant-input").value.trim();
  $("[data-start]").hidden = true;
  $("[data-suggestions]").hidden = true;
  $(".assistant-privacy").open = false;
  $("[data-messages]").replaceChildren();
  $("[data-matches]").replaceChildren();
  voiceMode = voice;
  transcriptOpen = false;
  root.classList.toggle("is-voice", voice);
  $("[data-messages]").hidden = voice;
  $("[data-message]").hidden = voice;
  $("[data-message] button").disabled = true;
  $("#assistant-input").disabled = true;
  $("[data-chat-hint]").hidden = true;
  $("[data-transcript]").setAttribute("aria-expanded", "false");
  $("[data-transcript]").textContent = txt(
    "Покажи разговора",
    "Show transcript",
  );
  muted = false;
  $("[data-mute]").setAttribute("aria-pressed", "false");
  $("[data-mute] span").textContent = txt(
    "Изключи микрофона",
    "Mute microphone",
  );
  status.textContent = txt("Свързване…", "Connecting…");
  try {
    const c = await post("/api/assistant/session", {
      lang: en ? "en" : "bg",
      propertyId,
      pagePath: location.pathname,
      consent: true,
    });
    if (started !== generation) return;
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
          if (started !== generation) return "Conversation ended.";
          $("[data-matches]").innerHTML = res.html;
          return "Published property cards shown.";
        },
      },
      onMessage: (m) => {
        if (started === generation)
          message(m.source === "user" ? "user" : "agent", m.message);
      },
      onModeChange: ({ mode }) => {
        if (started !== generation || !voice) return;
        root.classList.toggle("is-speaking", mode === "speaking");
        $("[data-voice-label]").textContent =
          mode === "speaking"
            ? txt("Асистентът говори…", "The assistant is speaking…")
            : muted
              ? txt("Микрофонът е изключен", "Microphone muted")
              : txt("Слушам Ви…", "I’m listening…");
      },
      onError: () => {
        if (started !== generation) return;
        status.textContent = txt(
          "Връзката прекъсна. Опитайте отново или се свържете с Никола.",
          "Connection failed. Try again or contact Nikola.",
        );
        void end();
      },
      onDisconnect: () => {
        if (started !== generation) return;
        session = null;
        void end();
        status.textContent = txt("Разговорът приключи.", "Conversation ended.");
      },
    });
    if (started !== generation) {
      await startedSession.endSession();
      return;
    }
    session = startedSession;
    $("[data-message]").hidden = voice;
    $("[data-message] button").disabled = false;
    $("#assistant-input").disabled = false;
    $("[data-switch]").hidden = false;
    $("[data-switch-text]").setAttribute("aria-pressed", String(!voice));
    $("[data-switch-voice]").setAttribute("aria-pressed", String(voice));
    $("[data-end]").hidden = false;
    $("[data-mute]").hidden = !voice;
    $("[data-voice-state]").hidden = !voice;
    $("[data-welcome]").hidden = true;
    $("[data-voice-label]").textContent = txt("Слушам Ви…", "I’m listening…");
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
      $("#assistant-input").value = "";
    }
    if (!voice) $("#assistant-input").focus();
  } catch (e) {
    if (started !== generation) return;
    status.textContent =
      e.name === "TimeoutError"
        ? txt(
            "Свързването отне твърде дълго. Опитайте отново — въпросът Ви е запазен в полето.",
            "The connection timed out. Try again — your question is still in the input.",
          )
        : e.message;
    await end();
  } finally {
    if (started === generation) busy = false;
  }
}
$(".assistant-launch").onclick = () => open();
$("[data-close]").onclick = async () => {
  panel.hidden = true;
  pending = "";
  root.classList.remove("is-open");
  $(".assistant-launch").setAttribute("aria-expanded", "false");
  previousFocus?.focus();
  await end();
};
$("[data-text]").onclick = () => start(false);
$("[data-voice]").onclick = () => start(true);
$("[data-end]").onclick = () => {
  status.textContent = txt(
    "Разговорът приключи. Можете да започнете нов.",
    "Conversation ended. You can start a new one.",
  );
  void end();
};
$("[data-mute]").onclick = () => {
  if (!session || !voiceMode) return;
  muted = !muted;
  session.setMicMuted(muted);
  $("[data-mute]").setAttribute("aria-pressed", String(muted));
  $("[data-mute] span").textContent = muted
    ? txt("Включи микрофона", "Unmute microphone")
    : txt("Изключи микрофона", "Mute microphone");
  $("[data-voice-label]").textContent = muted
    ? txt("Микрофонът е изключен", "Microphone muted")
    : txt("Слушам Ви…", "I’m listening…");
  status.textContent = muted
    ? txt(
        "Гласов разговор · микрофонът е изключен",
        "Voice conversation · microphone muted",
      )
    : txt(
        "Гласов разговор · микрофонът е включен",
        "Voice conversation · microphone on",
      );
};
root.querySelectorAll("[data-suggestion]").forEach((button) => {
  button.onclick = () => {
    // Choosing an example prepares a question; starting a session is a separate choice.
    pending = button.firstChild.textContent.trim();
    $("#assistant-input").value = pending;
    status.textContent =
      txt(
        "Изберете „Пишете ми“ или „Да поговорим“, за да изпратите: ",
        "Choose chat or voice to send: ",
      ) + pending;
    root
      .querySelectorAll("[data-suggestion]")
      .forEach((b) => b.classList.toggle("is-selected", b === button));
    $("#assistant-input").focus();
  };
});
$("[data-transcript]").onclick = () => {
  transcriptOpen = !transcriptOpen;
  $("[data-messages]").hidden = !transcriptOpen;
  $("[data-transcript]").setAttribute("aria-expanded", String(transcriptOpen));
  $("[data-transcript]").textContent = transcriptOpen
    ? txt("Скрий разговора", "Hide transcript")
    : txt("Покажи разговора", "Show transcript");
};
async function switchMode(voice) {
  if (busy || (session && voiceMode === voice)) return;
  const ending = end();
  const stopped = generation;
  await ending;
  if (generation !== stopped || panel.hidden) return;
  await start(voice);
}
$("[data-switch-text]").onclick = () => switchMode(false);
$("[data-switch-voice]").onclick = () => switchMode(true);
$("#assistant-input").oninput = () => session?.sendUserActivity();
$("[data-message]").onsubmit = async (e) => {
  e.preventDefault();
  const input = $("#assistant-input");
  if (busy || voiceMode || !input.value.trim()) return;
  if (!session) {
    pending = input.value.trim();
    await start(false);
    return;
  }
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
