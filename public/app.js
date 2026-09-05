/* НИ Имоти — progressive enhancement. The site works without this file; it adds:
   mobile menu, AI search / questions, contact form via fetch, gallery + lightbox. */
(function () {
  'use strict';
  var lang = document.body.getAttribute('data-lang') || 'bg';
  var bg = lang === 'bg';
  var T = {
    thinking: bg ? 'Търсим подходящи имоти…' : 'Looking for matching properties…',
    asking: bg ? 'Търсим отговор в обявата…' : 'Checking the listing…',
    none: bg ? 'Не намерихме точно съвпадение. Опитайте с други думи или разгледайте всички имоти.' : 'No close match. Try different words or browse all properties.',
    error: bg ? 'Търсенето не сработи. Опитайте отново или използвайте филтрите.' : 'Search did not work. Please try again or use the filters.',
    keyword: bg ? 'Резултати по ключови думи:' : 'Keyword results:',
    sending: bg ? 'Изпращане…' : 'Sending…',
    ok: bg ? 'Благодаря! Получих запитването и ще се свържа с вас.' : 'Thank you! I have received your enquiry and will be in touch.',
    okWa: bg ? 'Може също да ми пишете директно в WhatsApp:' : 'You can also message me directly on WhatsApp:',
    fail: bg ? 'Формата не е налична в момента — моля, обадете се или пишете в WhatsApp:' : 'The form is unavailable right now — please call or message on WhatsApp:',
    invalid: bg ? 'Моля, попълнете име и телефон/имейл.' : 'Please fill in your name and phone/email.',
    all: bg ? 'Всички имоти →' : 'All properties →'
  };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function postJSON(url, data) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { j.__status = r.status; return j; }); });
  }

  /* Mobile menu */
  var menuBtn = $('[data-menu]');
  var mobileNav = $('#mobilenav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = mobileNav.hidden;
      mobileNav.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    mobileNav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { mobileNav.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });
  }

  /* Mobile "enquire" button → nearest contact form */
  $all('[data-scroll-contact]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = $('#contact') || $('[data-contact]');
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = $('input[name=name]', target);
      if (first) setTimeout(function () { first.focus(); }, 500);
    });
  });

  /* AI search (home) */
  $all('[data-ai-search]').forEach(function (form) {
    var out = form.parentNode.querySelector('.ai-result');
    var allHref = (lang === 'en' ? '/en' : '') + '/imoti';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = form.q.value.trim();
      if (!q) return;
      var btn = form.querySelector('button');
      btn.disabled = true;
      out.hidden = false;
      out.innerHTML = '<div class="ai-answer">' + esc(T.thinking) + '</div>';
      postJSON('/api/ask', { q: q, lang: lang }).then(function (res) {
        var parts = [];
        if (res.error) throw new Error(res.error);
        if (res.answer) parts.push('<div class="ai-answer">' + esc(res.answer) + '</div>');
        else if (res.source === 'keyword' && res.count) parts.push('<div class="ai-answer">' + esc(T.keyword) + '</div>');
        if (res.count) parts.push(res.html);
        else parts.push('<div class="ai-answer">' + esc(T.none) + '</div>');
        parts.push('<p style="margin-top:14px"><a class="link-more" href="' + allHref + '?q=' + encodeURIComponent(q) + '">' + esc(T.all) + '</a></p>');
        out.innerHTML = parts.join('');
      }).catch(function () {
        out.innerHTML = '<div class="ai-answer error">' + esc(T.error) + '</div>';
      }).then(function () { btn.disabled = false; });
    });
  });

  /* AI question about a property */
  $all('[data-ai-ask]').forEach(function (form) {
    var out = form.parentNode.querySelector('.ai-result');
    var listingId = form.getAttribute('data-listing');
    function ask(q) {
      var btn = form.querySelector('button');
      btn.disabled = true;
      out.hidden = false;
      out.innerHTML = '<div class="ai-answer">' + esc(T.asking) + '</div>';
      postJSON('/api/ask', { q: q, lang: lang, listingId: listingId }).then(function (res) {
        if (res.error) throw new Error(res.error);
        out.innerHTML = '<div class="ai-answer">' + esc(res.answer || T.error) + '</div>';
      }).catch(function () {
        out.innerHTML = '<div class="ai-answer error">' + esc(T.error) + '</div>';
      }).then(function () { btn.disabled = false; });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); var q = form.q.value.trim(); if (q) ask(q); });
    $all('[data-ai-chip]', form.parentNode).forEach(function (chip) {
      chip.addEventListener('click', function () { form.q.value = chip.textContent.trim(); ask(form.q.value); });
    });
  });

  /* Contact forms */
  $all('[data-contact]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      $all('input, textarea', form).forEach(function (el) { if (el.name) data[el.name] = el.value; });
      if (!data.name || !data.contact) { status.className = 'form-status err'; status.textContent = T.invalid; return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      status.className = 'form-status';
      status.textContent = T.sending;
      postJSON('/api/contact', data).then(function (res) {
        var wa = res.whatsapp ? ' <a href="' + esc(res.whatsapp) + '" target="_blank" rel="noopener">WhatsApp ↗</a>' : '';
        if (res.ok) {
          status.className = 'form-status ok';
          status.innerHTML = esc(T.ok) + (wa ? ' ' + esc(T.okWa) + wa : '');
          form.reset();
        } else {
          status.className = 'form-status err';
          status.innerHTML = esc(res.__status === 400 ? T.invalid : T.fail) + wa;
        }
      }).catch(function () {
        status.className = 'form-status err';
        status.textContent = T.fail;
      }).then(function () { btn.disabled = false; });
    });
  });

  /* Gallery + lightbox */
  var gallery = $('[data-gallery]');
  var lightbox = $('[data-lightbox]');
  if (gallery && lightbox) {
    var images = [];
    try { images = JSON.parse($('[data-gallery-images]', gallery).textContent); } catch (err) { images = []; }
    var main = $('[data-gallery-main]', gallery);
    var lbImg = $('img', lightbox);
    var lbCount = $('.lb-count', lightbox);
    var idx = 0;
    function show(i) {
      if (!images.length) return;
      idx = (i + images.length) % images.length;
      lbImg.src = images[idx];
      lbCount.textContent = (idx + 1) + ' / ' + images.length;
    }
    function open(i) { show(i); lightbox.hidden = false; document.body.style.overflow = 'hidden'; }
    function close() { lightbox.hidden = true; document.body.style.overflow = ''; }
    if (main) main.addEventListener('click', function () { open(0); });
    $all('[data-gallery-open]', gallery).forEach(function (b) { b.addEventListener('click', function () { open(0); }); });
    $all('[data-gallery-index]', gallery).forEach(function (b) {
      b.addEventListener('click', function () { open(parseInt(b.getAttribute('data-gallery-index'), 10) || 0); });
    });
    $('[data-lb-close]', lightbox).addEventListener('click', close);
    $('[data-lb-prev]', lightbox).addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]', lightbox).addEventListener('click', function () { show(idx + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var touchX = null;
    lightbox.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (touchX == null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) show(dx < 0 ? idx + 1 : idx - 1);
      touchX = null;
    });
  }
})();
