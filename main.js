// Фоновые шары, cookie-плашка, 3D-наклон, мобильное меню, появление блоков
(function () {
  // --- фоновые «шары» под стеклом (декор, только с JS) ---
  var orbs = document.createElement('div');
  orbs.className = 'orbs';
  orbs.setAttribute('aria-hidden', 'true');
  orbs.innerHTML = '<div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div>';
  document.body.appendChild(orbs);

  // --- cookie-плашка ---
  try {
    if (!localStorage.getItem('cookie_ok')) {
      var cb = document.createElement('div');
      cb.className = 'cookie-bar';
      cb.setAttribute('role', 'region');
      cb.setAttribute('aria-label', 'Сообщение об использовании cookie');
      cb.innerHTML = '<span class="cookie-text">Мы используем cookie и Яндекс.Метрику, чтобы сайт работал и становился лучше. Оставаясь здесь, вы соглашаетесь с&nbsp;<a href="/privacy/">политикой конфиденциальности</a>.</span><button type="button" class="btn cookie-ok">Хорошо</button>';
      document.body.appendChild(cb);
      cb.querySelector('.cookie-ok').addEventListener('click', function () {
        try { localStorage.setItem('cookie_ok', '1'); } catch (e) {}
        cb.classList.add('hide');
        setTimeout(function () { cb.remove(); }, 400);
      });
    }
  } catch (e) { /* приватный режим без localStorage — плашку не показываем */ }

  // --- 3D-наклон карточек (только мышь + без reduced-motion) ---
  var fine = window.matchMedia('(pointer: fine)').matches &&
             !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine) {
    var tiltables = document.querySelectorAll('.money-card, .proof-shot, .tile, .hero-photo');
    tiltables.forEach(function (el) {
      el.classList.add('tilt');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
        el.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  }

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });
    // клик/тап где угодно вне меню и вне бургера — закрыть
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });
  }

  var items = document.querySelectorAll('.reveal');
  if (!items.length || !('IntersectionObserver' in window)) return;

  // Скрывать блоки можно только здесь: если этот скрипт не загрузился,
  // класс .js не появится и весь контент останется видимым.
  document.documentElement.className += ' js';

  function show(el) {
    if (el.classList.contains('visible')) return;
    var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
    setTimeout(function () { el.classList.add('visible'); }, delay);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      show(entry.target);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  items.forEach(function (el) { io.observe(el); });

  // Страховка: при резких прыжках прокрутки наблюдатель иногда пропускает
  // элементы, и блок остаётся невидимым. Досматриваем вручную.
  var ticking = false;
  function sweep() {
    ticking = false;
    var left = 0;
    items.forEach(function (el) {
      if (el.classList.contains('visible')) return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) show(el);
      else left++;
    });
    if (!left) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(sweep);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();

// Цели Метрики: клики по контактным ссылкам + использование калькулятора
(function () {
  var YM_ID = 110973275;

  function goal(name) {
    if (typeof ym === 'function') ym(YM_ID, 'reachGoal', name);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-goal')) { goal(a.getAttribute('data-goal')); return; }  // 24.09: CPA-блок
    if (href.indexOf('t.me/Dostavka_park_bot') !== -1) goal('tg_click');
    else if (href.indexOf('max.ru') !== -1) goal('max_click');
    else if (href.indexOf('t.me/dostaw_ka_chat') !== -1) goal('chat_click');
  });

  window.__dostavkaGoal = goal;
})();

// Живые рекорды парка из /data/top.json (fallback — цифры, зашитые в HTML)
(function () {
  var hooks = document.querySelectorAll('[data-top-hero],[data-top-num],[data-top-month-label],[data-podium]');
  if (!hooks.length || !window.fetch) return;

  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  // «июнь 2026» → «в июне» / «за июнь»
  var PREP = { 'январь': 'январе', 'февраль': 'феврале', 'март': 'марте', 'апрель': 'апреле',
    'май': 'мае', 'июнь': 'июне', 'июль': 'июле', 'август': 'августе', 'сентябрь': 'сентябре',
    'октябрь': 'октябре', 'ноябрь': 'ноябре', 'декабрь': 'декабре' };

  fetch('/data/top.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.top || !d.top.length) return;
    var top = d.top;
    var monthWord = (d.month || '').split(' ')[0];

    document.querySelectorAll('[data-top-hero]').forEach(function (el) {
      el.textContent = 'до ' + fmt(Math.floor(top[0].total / 5000) * 5000) + ' ₽';
    });
    document.querySelectorAll('[data-top-num]').forEach(function (el) {
      el.textContent = fmt(top[0].total);
    });
    document.querySelectorAll('[data-top-inline]').forEach(function (el) {
      el.textContent = fmt(top[0].total) + ' ₽';
    });
    if (PREP[monthWord]) {
      document.querySelectorAll('[data-top-month-label]').forEach(function (el) {
        var prefix = el.textContent.trim().indexOf('за') === 0 ? 'за ' + monthWord : 'в ' + PREP[monthWord];
        el.textContent = prefix;
      });
    }
    // подиум: место задаётся data-rank (в DOM порядок 2-1-3)
    top.slice(0, 3).forEach(function (t, i) {
      var num = document.querySelector('[data-rank="' + (i + 1) + '"]');
      var name = document.querySelector('[data-rank-name="' + (i + 1) + '"]');
      if (num) { num.setAttribute('data-value', Math.round(t.total)); num.textContent = fmt(t.total) + ' \u20BD'; }
      if (name) name.textContent = t.name || 'Курьер парка';
    });
  }).catch(function () { /* нет данных — остаются цифры из HTML */ });
})();

// Калькулятор заработка
(function () {
  var calc = document.querySelector('.earn-calc');
  if (!calc) return;

  var result = calc.querySelector('.earn-calc-result');
  var resultSub = calc.querySelector('.earn-calc-sub');
  var transportBtns = calc.querySelectorAll('[data-transport]');
  var fixedCoef = null;
  if (calc.getAttribute('data-coef')) {
    var fc = calc.getAttribute('data-coef').split(',');
    fixedCoef = fc.length > 1 ? [parseFloat(fc[0]), parseFloat(fc[1])] : parseFloat(fc[0]);
  }
  var cityBtns = calc.querySelectorAll('[data-city]');
  var hoursInput = calc.querySelector('[data-hours]');
  var daysInput = calc.querySelector('[data-days]');
  var hoursOut = calc.querySelector('[data-hours-out]');
  var daysOut = calc.querySelector('[data-days-out]');

  // ставки в час по Москве: [мин, макс]
  var RATES = {
    walk: [350, 500],
    bike: [800, 1000],
    car: [800, 1200],
    cargo: [1000, 1500]
  };
  // коэффициент города
  var CITY_COEF = {
    msk: 1,
    spb: 0.85,
    other: [0.6, 0.75]
  };

  var state = {
    transport: 'walk',
    city: 'msk',
    hours: parseInt(hoursInput && hoursInput.value, 10) || 6,
    days: parseInt(daysInput && daysInput.value, 10) || 5
  };
  var goalFired = false;
  function fireGoalOnce() {
    if (goalFired) return;
    goalFired = true;
    if (window.__dostavkaGoal) window.__dostavkaGoal('calc_used');
  }

  function formatNum(n) {
    return Math.round(n / 100) * 100;
  }
  function withSpaces(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function calcRange() {
    var rate = RATES[state.transport];
    var coef = fixedCoef !== null ? fixedCoef : CITY_COEF[state.city];
    var coefMin, coefMax;
    if (Array.isArray(coef)) {
      coefMin = coef[0];
      coefMax = coef[1];
    } else {
      coefMin = coefMax = coef;
    }
    var base = state.hours * state.days * 4.33;
    var min = base * rate[0] * coefMin;
    var max = base * rate[1] * coefMax;
    return [formatNum(min), formatNum(max)];
  }

  function render() {
    var range = calcRange();
    if (result) result.textContent = '≈ ' + withSpaces(range[0]) + ' – ' + withSpaces(range[1]) + ' ₽ в месяц';
    if (resultSub) {
      resultSub.textContent = 'Ориентир по ставкам курьеров парка. Сколько реально выходит в вашем городе — покажет менеджер на живых примерах.';
    }
    if (hoursOut) hoursOut.textContent = state.hours;
    if (daysOut) daysOut.textContent = state.days;
  }

  transportBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      transportBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.transport = btn.getAttribute('data-transport');
      fireGoalOnce();
      render();
    });
  });

  cityBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      cityBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.city = btn.getAttribute('data-city');
      fireGoalOnce();
      render();
    });
  });

  if (hoursInput) {
    hoursInput.addEventListener('input', function () {
      state.hours = parseInt(hoursInput.value, 10) || 0;
      fireGoalOnce();
      render();
    });
  }
  if (daysInput) {
    daysInput.addEventListener('input', function () {
      state.days = parseInt(daysInput.value, 10) || 0;
      fireGoalOnce();
      render();
    });
  }

  calc.classList.add('js-ready');
  render();
})();

// Набегание цифр рекордов при появлении блока
(function () {
  var nums = document.querySelectorAll('.rec-num[data-value]');
  if (!nums.length || !('IntersectionObserver' in window)) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function spaced(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }
  function animate(el) {
    var target = parseInt(el.getAttribute('data-value'), 10);
    if (!target || reduced) { el.textContent = spaced(target) + '\u00A0\u20BD'; return; }
    var t0 = null, dur = 1300;
    function frame(ts) {
      if (!t0) t0 = ts;
      var k = Math.min((ts - t0) / dur, 1);
      k = 1 - Math.pow(1 - k, 3); // ease-out cubic
      el.textContent = spaced(target * k) + '\u00A0\u20BD';
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      animate(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.4 });
  nums.forEach(function (el) { io.observe(el); });
})();

// Липкая CTA-кнопка на мобильном: появляется после первого экрана
(function () {
  if (window.innerWidth > 900) return;
  var bar = document.createElement('div');
  bar.className = 'sticky-cta';
  bar.innerHTML = '<a class="btn" href="https://t.me/Dostavka_park_bot?start=site" target="_blank" rel="noopener">Начать зарабатывать</a>';
  document.body.appendChild(bar);
  var shown = false;
  function check() {
    var need = window.scrollY > window.innerHeight * 0.9;
    if (need !== shown) { shown = need; bar.classList.toggle('show', need); }
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
})();

// Safari/iOS не умеют прозрачный VP9 — вместо видео показываем анимированный WebP (iOS 14+),
// а совсем старым — статичный логотип.
(function () {
  var v = document.querySelector('.logo video');
  if (!v) return;
  var ua = navigator.userAgent;
  var isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/chrome|crios|android|edg|opr/i.test(ua);
  if (!isIOS && !isSafari) return;
  var img = v.querySelector('img') || document.createElement('img');
  img.loading = 'eager';
  img.width = 360; img.height = 203;
  img.alt = 'ДОСТАВЬ-КА — парк курьеров';
  // проверяем поддержку анимированного WebP тестовой картинкой
  var probe = new Image();
  probe.onload = function () {
    if (probe.width === 1) { img.src = '/img/logo-anim.webp'; }
    v.parentNode && v.parentNode.replaceChild(img, v);
  };
  probe.onerror = function () { v.parentNode && v.parentNode.replaceChild(img, v); };
  probe.src = 'data:image/webp;base64,UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA';
})();
