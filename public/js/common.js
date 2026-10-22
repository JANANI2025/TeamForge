/* Shared: header/nav, live digital clock, EN/Tamil toggle, session helpers (Components 2 & 3: DOM) */
window.TF = window.TF || {};
(function () {
  var EVENT_START = new Date('2026-11-14T09:00:00');
  var I18N = {
    en: { home: 'Home', register: 'Register', quiz: 'Skill Quiz', teams: 'Teams', kit: 'Resource Kit', pay: 'Wallet', library: 'Library', login: 'Log in', logout: 'Log out', hello: 'Hello' },
    ta: { home: 'முகப்பு', register: 'பதிவு', quiz: 'திறன் வினாடி', teams: 'அணிகள்', kit: 'கிட்', pay: 'பணப்பை', library: 'நூலகம்', login: 'உள்நுழை', logout: 'வெளியேறு', hello: 'வணக்கம்' }
  };
  var PAGES = [['index.html', 'home'], ['register.html', 'register'], ['teams.html', 'teams'], ['kit.html', 'kit'], ['pay.html', 'pay'], ['library.html', 'library']];

  function lang() { try { return localStorage.getItem('tf_lang') || 'en'; } catch (e) { return 'en'; } }
  TF.t = function (k) { return (I18N[lang()] || I18N.en)[k] || k; };
  TF.dict = I18N;
  TF.session = function () { try { return JSON.parse(sessionStorage.getItem('tf_session') || 'null'); } catch (e) { return null; } };
  TF.setSession = function (s) { try { if (s) sessionStorage.setItem('tf_session', JSON.stringify(s)); else sessionStorage.
    removeItem('tf_session'); } catch (e) {} };
  TF.toast = function (msg) {
    var $t = $('#toast'); if (!$t.length) $t = $('<div id="toast" class="toast"></div>').appendTo('body');
    $t.text(msg).stop(true, true).fadeIn(150).delay(3200).fadeOut(300);
  };
  TF.api = function (url, opts) {
    opts = opts || {}; var s = TF.session();
    var headers = { 'Content-Type': 'application/json' };
    if (s && s.token) headers.Authorization = 'Bearer ' + s.token;
    if (opts.headers) $.extend(headers, opts.headers);
    return fetch(url, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  };

  function applyLang() {
    $('[data-i18n]').each(function () { $(this).text(TF.t($(this).data('i18n'))); });
    $('html').attr('lang', lang());
  }
  TF.applyLang = applyLang;

  function header(active) {
    var s = TF.session();
    var nav = PAGES.map(function (p) {
      return '<a href="' + p[0] + '" class="' + (p[0] === active ? 'active' : '') + '" data-i18n="' + p[1] + '"></a>';
    }).join('');
    var h = '<header class="top"><div class="bar"><a class="brand" href="index.html"><img src="img/logo.svg" alt="TeamForge logo">TeamForge</a>' +
      '<nav>' + nav + '</nav><span class="clock" id="clock" title="Live clock">--:--:--</span>' +
      '<select class="lang" id="lang" aria-label="Language"><option value="en">English</option><option value="ta">தமிழ்</option></select>' +
      '<span id="who"></span></div></header>';
    $('body').prepend(h);
    $('#lang').val(lang()).on('change', function () { try { localStorage.setItem('tf_lang', this.value); } catch (e) {} applyLang(); renderWho(); });
    renderWho();
  }
  TF.renderWho = function () { renderWho(); };
  function renderWho() {
    var s = TF.session();
    if (s) $('#who').html('<a class="btn ghost" style="color:#fff;border-color:#fff;padding:4px 12px" href="#" id="logout">' + TF.t('logout') + ' (' + $('<i>').text(s.name.split(' ')[0]).html() + ')</a>');
    else $('#who').html('<a class="btn warn" style="padding:4px 12px" href="#" id="loginbtn">' + TF.t('login') + '</a>');
    $('#logout').off().on('click', function (e) { e.preventDefault(); TF.setSession(null); location.reload(); });
    $('#loginbtn').off().on('click', function (e) { e.preventDefault(); if (TF.openLogin) TF.openLogin(); });
  }

  // Digital clock (setInterval + Date + DOM update)
  function tick() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var el = document.getElementById('clock'); if (el) el.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    var cd = document.getElementById('countdown');
    if (cd) {
      var ms = EVENT_START - d;
      if (ms <= 0) cd.textContent = 'Hackathon has started!';
      else { var days = Math.floor(ms / 864e5), hrs = Math.floor(ms / 36e5) % 24, mins = Math.floor(ms / 6e4) % 60, secs = Math.floor(ms / 1e3) % 60;
        cd.textContent = days + 'd ' + p(hrs) + 'h ' + p(mins) + 'm ' + p(secs) + 's'; }
    }
  }

  $(function () {
    var active = (location.pathname.split('/').pop() || 'index.html');
    header(active); applyLang();
    // "Back" arrow on every page except the home page
    if (active !== 'index.html') {
      $('main').first().prepend('<button type="button" class="btn ghost back" id="backBtn" aria-label="Go back">&larr; Back</button>');
      $('#backBtn').on('click', function () {
        var same = document.referrer && document.referrer.indexOf(location.origin) === 0;
        if (same && history.length > 1) history.back(); else location.href = 'index.html';
      });
    } tick(); setInterval(tick, 1000);
    $('body').append('<footer>TeamForge - a web-technology mini project. Demo data only.</footer>');
  });
})();
