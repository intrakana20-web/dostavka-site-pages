/* AVITOMA landing chat widget («нейропродавец»).
   Отдельный файл — переживает передеплой index.html с Mac.
   Появляется только когда пользователь доскроллил до статической
   секции #land (скролл-фильм не трогаем). API: /api/public/landing-chat. */
(function () {
  'use strict';
  if (window.DostavkaChat) return;

  var API_URL = 'https://api.avitoma.ru/api/public/landing-chat';
  var GREETING =
    'Здравствуйте! Я помощник парка ДОСТАВЬ-КА. Отвечу про выплаты, ' +
    'транспорт, документы и подключение — спрашивайте 👋';
  var MAX_HISTORY = 28; // сервер принимает ≤30
  var GRAD = 'linear-gradient(150deg,#ffb347,#ff7a00 55%,#f24d00)';

  var css = [
    '#avm-chat-bubble{position:fixed;right:22px;bottom:22px;z-index:70;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:' + GRAD + ';box-shadow:0 10px 28px rgba(255,122,0,.42);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transform:translateY(14px);transition:opacity .4s,transform .4s}',
    '#avm-chat-bubble.on{opacity:1;pointer-events:auto;transform:none}',
    '#avm-chat-bubble:hover{transform:translateY(-2px)}',
    '#avm-chat-bubble svg{width:26px;height:26px;fill:#fff}',
    '#avm-chat-panel{position:fixed;right:22px;bottom:92px;z-index:71;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 120px));background:#fff;border:1px solid #e3e8f2;border-radius:18px;box-shadow:0 24px 70px rgba(30,40,80,.28);display:none;flex-direction:column;overflow:hidden;font-family:inherit}',
    '#avm-chat-panel.open{display:flex}',
    '.avm-head{padding:14px 16px;background:' + GRAD + ';color:#fff;display:flex;align-items:center;gap:10px}',
    '.avm-head .t{font-weight:800;font-size:15px;line-height:1.2}',
    '.avm-head .s{font-size:11.5px;opacity:.85}',
    '.avm-head .dot{width:8px;height:8px;border-radius:50%;background:#4ade80;flex:0 0 auto}',
    '.avm-close{margin-left:auto;background:none;border:none;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:2px 4px;opacity:.85}',
    '.avm-close:hover{opacity:1}',
    '.avm-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px;background:#f7f8fb}',
    '.avm-m{max-width:85%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}',
    '.avm-m.bot{align-self:flex-start;background:#fff;border:1px solid #e3e8f2;color:#1c2230;border-bottom-left-radius:5px}',
    '.avm-m.me{align-self:flex-end;background:#ff7a00;color:#fff;border-bottom-right-radius:5px}',
    '.avm-m.typing{color:#8a93a8;font-style:italic}',
    '.avm-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e9edf5;background:#fff}',
    '.avm-form input{flex:1;border:1.5px solid #d4dcec;border-radius:22px;padding:10px 15px;font-size:14px;outline:none;font-family:inherit;color:#1c2230;background:#fff}',
    '.avm-form input:focus{border-color:#ff7a00}',
    '.avm-form button{border:none;border-radius:50%;width:42px;height:42px;flex:0 0 auto;cursor:pointer;background:' + GRAD + ';display:flex;align-items:center;justify-content:center}',
    '.avm-form button:disabled{opacity:.5;cursor:default}',
    '.avm-form button svg{width:18px;height:18px;fill:#fff}',
    '.avm-inline-cta{display:inline-flex;align-items:center;gap:8px;margin-top:18px;cursor:pointer;border:1.5px solid #d4dcec;background:#fff;color:#1a2130;font-weight:700;font-size:15px;padding:12px 24px;border-radius:28px;font-family:inherit;transition:transform .15s,box-shadow .2s}',
    '.avm-inline-cta:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(26,33,48,.10)}',
    '@media(max-width:600px){#avm-chat-panel{right:8px;left:8px;width:auto;bottom:84px;height:min(540px,calc(100vh - 100px))}#avm-chat-bubble{right:14px;bottom:14px}}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  var bubble = document.createElement('button');
  bubble.id = 'avm-chat-bubble';
  bubble.setAttribute('aria-label', 'Чат с AI-агентом');
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.7 1.4 5.1 3.7 6.7-.2.9-.7 2.2-1.6 3.2 0 0 2.8-.4 4.8-1.7 1 .3 2 .4 3.1.4 5.5 0 10-3.9 10-8.6S17.5 3 12 3z"/></svg>';

  var panel = document.createElement('div');
  panel.id = 'avm-chat-panel';
  panel.innerHTML =
    '<div class="avm-head"><span class="dot"></span>' +
    '<div><div class="t">Помощник ДОСТАВЬ-КА</div>' +
    '<div class="s">онлайн · выплаты, транспорт, подключение</div></div>' +
    '<button class="avm-close" aria-label="Закрыть">×</button></div>' +
    '<div class="avm-msgs"></div>' +
    '<form class="avm-form"><input type="text" maxlength="1400" ' +
    'placeholder="Напишите вопрос…" autocomplete="off">' +
    '<button type="submit" aria-label="Отправить">' +
    '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>' +
    '</button></form>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var msgsEl = panel.querySelector('.avm-msgs');
  var formEl = panel.querySelector('.avm-form');
  var inputEl = formEl.querySelector('input');
  var sendBtn = formEl.querySelector('button[type=submit]');

  /* ---------- state ---------- */
  var history = [];
  var sessionId = null;
  try {
    sessionId = sessionStorage.getItem('avm_chat_sid');
    if (!sessionId) {
      sessionId = ('sid-' + Date.now().toString(36) + '-' +
        Math.random().toString(36).slice(2, 10));
      sessionStorage.setItem('avm_chat_sid', sessionId);
    }
  } catch (e) {}
  try {
    var saved = sessionStorage.getItem('avm_chat_history');
    if (saved) history = JSON.parse(saved) || [];
  } catch (e) {}

  var goalsSent = {};
  function goal(name) {
    if (goalsSent[name]) return;
    goalsSent[name] = true;
    try {
      if (typeof ym === 'function') ym(110973275, 'reachGoal', name);
    } catch (e) {}
  }

  function persist() {
    try {
      sessionStorage.setItem('avm_chat_history', JSON.stringify(history));
    } catch (e) {}
  }

  function addMsg(role, text, typing) {
    var el = document.createElement('div');
    el.className = 'avm-m ' + (role === 'user' ? 'me' : 'bot') +
      (typing ? ' typing' : '');
    el.textContent = text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return el;
  }

  function renderAll() {
    msgsEl.innerHTML = '';
    addMsg('assistant', GREETING);
    history.forEach(function (m) { addMsg(m.role, m.content); });
  }

  /* ---------- open/close ---------- */
  function openPanel() {
    goal('chat_open');
    renderAll();
    panel.classList.add('open');
    if (window.innerWidth > 600) inputEl.focus();
  }
  function closePanel() { panel.classList.remove('open'); }

  bubble.addEventListener('click', function () {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  panel.querySelector('.avm-close').addEventListener('click', closePanel);

  /* ---------- send ---------- */
  var busy = false;
  formEl.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var text = (inputEl.value || '').trim();
    if (!text || busy) return;
    inputEl.value = '';
    history.push({ role: 'user', content: text });
    while (history.length > MAX_HISTORY) history.shift();
    if (history[0] && history[0].role !== 'user') history.shift();
    persist();
    goal('chat_message');
    if (/(?:\+7|^8|[\s(]8)[\s()\-]*\d{3}[\s()\-]*\d{3}[\s()\-]*\d{2}[\s()\-]*\d{2}\b/.test(text) ||
        /@[A-Za-z][A-Za-z0-9_]{4,31}\b/.test(text)) goal('chat_lead');
    addMsg('user', text);
    busy = true;
    sendBtn.disabled = true;
    var typingEl = addMsg('assistant', 'печатает…', true);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, session: sessionId, site: 'dostavka' })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (d) {
        typingEl.remove();
        var reply = (d && d.reply) || '';
        if (!reply) throw new Error('empty');
        history.push({ role: 'assistant', content: reply });
        persist();
        addMsg('assistant', reply);
      })
      .catch(function () {
        typingEl.remove();
        addMsg('assistant',
          'Кажется, я на секунду потерял связь. Попробуйте ещё раз — ' +
          'или напишите в наш бот: t.me/Dostavka_park_bot');
      })
      .finally(function () {
        busy = false;
        sendBtn.disabled = false;
      });
  });

  /* ---------- не прятаться под куки-плашкой (#ck-note) ---------- */
  function dodgeCookieNote() {
    var ck = document.getElementById('ck-note');
    var visible = ck && ck.style.display !== 'none' && ck.offsetHeight > 0;
    bubble.style.bottom = visible ? (ck.offsetHeight + 24) + 'px' : '';
  }
  dodgeCookieNote();
  var ckEl = document.getElementById('ck-note');
  if (ckEl) {
    ckEl.addEventListener('click', function () {
      setTimeout(dodgeCookieNote, 50);
    });
  }

  /* ---------- показ пузыря только после скролл-фильма ---------- */
  var land = null;
  if (land && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) bubble.classList.add('on');
        else if (!panel.classList.contains('open')) bubble.classList.remove('on');
      });
    }, { rootMargin: '0px 0px -20% 0px' }).observe(land);
  } else {
    bubble.classList.add('on'); // fallback: показываем всегда
  }

  /* ---------- инлайн-кнопки в FAQ и тарифах ---------- */
  function inlineCta(text) {
    var wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'avm-inline-cta';
    b.textContent = text;
    b.addEventListener('click', function () {
      bubble.classList.add('on');
      openPanel();
    });
    wrap.appendChild(b);
    return wrap;
  }
  try {
    var faqBox = document.querySelector('#faq');
    if (faqBox) faqBox.appendChild(inlineCta('Остались вопросы? Спросите в чате →'));
  } catch (e) {}


  /* ---------- проактивное облачко по поведению (21.08) ---------- */
  (function () {
    var LS_KEY = 'dk_teaser_seen';
    var DAY = 24 * 60 * 60 * 1000;
    try {
      var last = parseFloat(localStorage.getItem(LS_KEY) || '0');
      if (last && Date.now() - last < DAY) return;
    } catch (e) {}

    var st = document.createElement('style');
    st.textContent =
      '#avm-teaser{position:fixed;right:92px;bottom:30px;z-index:70;max-width:min(285px,calc(100vw - 120px));' +
      'background:#fff;color:#20170e;border:1px solid #f0e2d2;border-radius:14px;border-bottom-right-radius:4px;' +
      'box-shadow:0 14px 40px rgba(120,60,0,.22);padding:12px 34px 12px 14px;font-size:13.5px;line-height:1.4;' +
      'cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s;pointer-events:none;font-family:inherit}' +
      '#avm-teaser.on{opacity:1;transform:none;pointer-events:auto}' +
      '#avm-teaser b{display:block;font-size:12px;color:#ff7a00;margin-bottom:3px}' +
      '#avm-teaser .x{position:absolute;top:6px;right:8px;border:none;background:none;font-size:16px;line-height:1;' +
      'color:#a8998a;cursor:pointer;padding:2px 4px}' +
      '#avm-teaser .x:hover{color:#6b5b4c}' +
      '@media(max-width:600px){#avm-teaser{right:16px;bottom:92px;max-width:calc(100vw - 32px)}}';
    document.head.appendChild(st);

    var path = location.pathname;
    var text = 'Спросите что угодно про работу курьером — отвечу сразу, без анкет и звонков.';
    if (path.indexOf('/gorod/') === 0) {
      text = 'Подскажу по вашему городу: какие заказы есть, на чём выгоднее выходить и сколько платят.';
    } else if (path.indexOf('/articles/') === 0) {
      text = 'Вопрос по статье? Спросите — отвечу по вашей ситуации и помогу подключиться.';
    } else if (path.indexOf('/gruzovoy') === 0) {
      text = 'Есть авто или фургон? Спросите, подходит ли ваша машина под грузовой тариф.';
    } else if (path.indexOf('/eda') === 0 || path.indexOf('/dostavka') === 0 || path.indexOf('/topgo') === 0) {
      text = 'Хотите начать? Спросите про подключение — оформим за 7 минут в переписке.';
    }

    var t = document.createElement('div');
    t.id = 'avm-teaser';
    t.innerHTML = '<b>ДОСТАВЬ-КА · онлайн</b>';
    t.appendChild(document.createTextNode(text));
    var x = document.createElement('button');
    x.className = 'x';
    x.type = 'button';
    x.setAttribute('aria-label', 'Закрыть подсказку');
    x.textContent = '×';
    t.appendChild(x);
    document.body.appendChild(t);

    var done = false;
    function hide() {
      t.classList.remove('on');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }
    function remember() {
      try { localStorage.setItem(LS_KEY, String(Date.now())); } catch (e) {}
    }
    x.addEventListener('click', function (e) {
      e.stopPropagation();
      remember();
      hide();
    });
    t.addEventListener('click', function () {
      goal('chat_teaser_click');
      remember();
      hide();
      bubble.classList.add('on');
      openPanel();
    });

    function show() {
      if (done) return;
      if (panel.classList.contains('open')) { done = true; return; }
      if (!bubble.classList.contains('on')) return;
      done = true;
      remember();
      t.classList.add('on');
      goal('chat_teaser_shown');
      setTimeout(function () { if (!panel.classList.contains('open')) hide(); }, 20000);
    }

    setTimeout(show, 45000);
    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && (window.pageYOffset / h) > 0.5) show();
    }, { passive: true });
  })();

  window.DostavkaChat = { open: openPanel, close: closePanel };
})();
