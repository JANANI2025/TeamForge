/* Component 5 - jQuery validation of the Event Registration Form + autocomplete from a JSON file */
$(function () {
  var ZIP_LEN = 5;   // change to 6 for Indian PIN codes
  var SKILLS = [['fe', 'Frontend'], ['be', 'Backend'], ['ml', 'Data / AI'], ['ux', 'Design / UX'], ['hw', 'Hardware / IoT'], ['pm', 'Pitch / Domain']];
  var cities = [];

  // ---------- build the six range sliders (HTML5 range + output) ----------
  SKILLS.forEach(function (s) {
    $('#skills').append('<div class="skillrow"><label for="sk_' + s[0] + '" style="margin:0">' + s[1] + '</label>' +
      '<input type="range" id="sk_' + s[0] + '" min="0" max="5" step="1" value="0" data-key="' + s[0] + '"><output id="out_' + s[0] + '">0</output></div>');
  });
  $('#skills').on('input', 'input[type=range]', function () { $('#out_' + this.dataset.key).text(this.value); updateComplete(); });

  // ---------- skill quiz (inline) -> fills the sliders automatically ----------
  var quiz = null;
// Start each new registration with a fresh quiz state.
quiz = null;  function setSlider(key, v) { $('#sk_' + key).val(v); $('#out_' + key).text(v); }
  function applyQuiz(level, fromQuiz) {
    SKILLS.forEach(function (s) { setSlider(s[0], Math.round(level[s[0]])); });
    $('#quizStatus').addClass('good').html('Quiz verified: ' + SKILLS.map(function (s) { return s[1] + ' ' + level[s[0]] + '/5'; }).join(' &middot; ') +
      (fromQuiz ? ' &mdash; sliders set for you, adjust them if you disagree' : ''));
    $('#quizBtn').text('Retake the quiz');
    updateComplete();
  }
  $('#quizBtn').on('click', function () {
    SkillQuiz.start(function (level) {
      quiz = level;
      applyQuiz(level, true); TF.toast('Skill sliders filled from your quiz');
    });
  });


  // ---------- bio -> skill hints: an ARRAY of words per skill, counted with REGULAR EXPRESSIONS ----------
  var KEYWORDS = {
    fe: ['html', 'css', 'javascript', 'react', 'angular', 'vue', 'bootstrap', 'jquery', 'tailwind', 'frontend', 'website'],
    be: ['node', 'express', 'mongodb', 'sql', 'mysql', 'api', 'django', 'flask', 'spring', 'docker', 'backend', 'database', 'server'],
    ml: ['python', 'pandas', 'tensorflow', 'pytorch', 'machine learning', 'model', 'dataset', 'nlp', 'opencv', 'ai', 'data'],
    ux: ['figma', 'design', 'prototype', 'wireframe', 'ui', 'ux', 'canva', 'logo', 'poster'],
    hw: ['arduino', 'raspberry', 'sensor', 'iot', 'robot', 'circuit', 'esp32', 'embedded', 'drone'],
    pm: ['pitch', 'presentation', 'startup', 'business', 'marketing', 'leader', 'captain', 'organised', 'organized', 'public speaking', 'report']
  };
  var TOOL_TEXT = { git: 'git', figma: 'figma', docker: 'docker', python: 'python', node: 'node', arduino: 'arduino' };
  function hints() {
    var text = $('#bio').val() + ' ' + $('input[name=tools]:checked').map(function () { return TOOL_TEXT[this.value]; }).get().join(' ');
    var rows = [];
    SKILLS.forEach(function (s) {
      var re = new RegExp('\\b(' + KEYWORDS[s[0]].join('|') + ')\\b', 'gi');
      var found = text.match(re) || [], uniq = found.map(function (w) { return w.toLowerCase(); }).filter(function (w, i, a) { return a.indexOf(w) === i; });
      var level = uniq.length === 0 ? 0 : Math.min(5, uniq.length + 1);   // 1 word -> 2, 2 -> 3, 3 -> 4, 4+ -> 5
      rows.push({ key: s[0], label: s[1], words: uniq, level: level });
    });
    return rows;
  }
  $('#hintBtn').on('click', function () {
    var rows = hints(), any = rows.some(function (r) { return r.level > 0; });
    if (!any) return $('#hintOut').html('<p class="muted">No skill words found. Mention tools or projects (e.g. "React", "MongoDB", "Figma", "Arduino"), or tick tools in step 3.</p>');
    $('#hintOut').html('<table><thead><tr><th>Skill</th><th>Words found</th><th>Suggested</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r.label + '</td><td>' + (r.words.join(', ') || '-') + '</td><td>' + (r.level ? r.level + '/5' : '-') + '</td></tr>'; }).join('') +
      '</tbody></table><p><button type="button" class="btn" id="applyHints">Apply suggestions to the sliders</button> <span class="muted">(only raises a slider, never lowers it)</span></p>');
    $('#applyHints').on('click', function () {
      rows.forEach(function (r) { if (r.level > Number($('#sk_' + r.key).val())) setSlider(r.key, r.level); });
      updateComplete(); TF.toast('Sliders updated from your bio');
    });
  });
  $('#agree').on('change', function () { if (this.checked) $('#agreeErr').text(''); });
  $('#loginLink').on('click', function (e) { e.preventDefault(); TF.openLogin(); });

  // ---------- JSON cities + autocomplete ----------
  $.getJSON('data/cities.json').done(function (data) { cities = data; }).fail(function () { TF.toast('Could not load cities.json'); });
  var $city = $('#city'), $list = $('#cityList'), selIdx = -1;
  function renderList(matches) {
    selIdx = -1;
    if (!matches.length) return $list.hide().empty();
    $list.html(matches.map(function (m) { return '<li role="option" data-v="' + m.city + '">' + m.city + ' <small>' + m.state + '</small></li>'; }).join('')).show();
  }
  $city.on('input', function () {
    var q = $.trim(this.value).toLowerCase();
    if (!q) return $list.hide();
    var starts = cities.filter(function (c) { return c.city.toLowerCase().indexOf(q) === 0; });
    var has = cities.filter(function (c) { return c.city.toLowerCase().indexOf(q) > 0; });
    renderList(starts.concat(has).slice(0, 8));
  });
  $city.on('keydown', function (e) {
    var $items = $list.children(); if (!$items.length || !$list.is(':visible')) return;
    if (e.key === 'ArrowDown') { selIdx = (selIdx + 1) % $items.length; e.preventDefault(); }
    else if (e.key === 'ArrowUp') { selIdx = (selIdx - 1 + $items.length) % $items.length; e.preventDefault(); }
    else if (e.key === 'Enter' && selIdx > -1) { $city.val($items.eq(selIdx).data('v')); $list.hide(); e.preventDefault(); return; }
    else if (e.key === 'Escape') { $list.hide(); return; }
    else return;
    $items.removeClass('sel').eq(selIdx).addClass('sel');
  });
  $list.on('mousedown', 'li', function (e) { e.preventDefault(); $city.val($(this).data('v')).trigger('blur'); $list.hide(); });
  $city.on('blur', function () { setTimeout(function () { $list.hide(); }, 120); });

  // ---------- validation rules ----------
  var rules = {
    name: function (v) { return v.length >= 3 ? '' : 'Enter your full name (3+ letters)'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a valid email like name@college.edu'; },
    phone: function (v) { return /^\d{10}$/.test(v) ? '' : 'Mobile number must be exactly 10 digits'; },
    dob: function (v) { return v ? '' : 'Choose your date of birth'; },
    college: function (v) { return v.length >= 3 ? '' : 'Enter your college'; },
    year: function (v) { return v ? '' : 'Choose your year'; },
    city: function (v) {
      if (!v) return 'Choose a city';
      var ok = !cities.length || cities.some(function (c) { return c.city.toLowerCase() === v.toLowerCase(); });
      return ok ? '' : 'Pick a city from the suggestions';
    },
    zip: function (v) { return new RegExp('^\\d{' + ZIP_LEN + '}$').test(v) ? '' : 'Zip code must be exactly ' + ZIP_LEN + ' digits'; },
    track: function (v) { return v ? '' : 'Choose a track'; },
    friendEmail: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Not a valid email'; },
    website: function (v) { return !v || /^https?:\/\/.+\..+/.test(v) ? '' : 'Start with http:// or https://'; },
    password: function (v) { return v.length >= 6 ? '' : 'At least 6 characters'; }
  };
  function check(name) {
    var $f = $('#' + name), msg = rules[name]($.trim($f.val()));
    $f.toggleClass('invalid', !!msg).closest('.row > div').find('.err').first().text(msg);
    return !msg;
  }
  Object.keys(rules).forEach(function (n) { $('#' + n).on('blur change', function () { check(n); }); });
  $('#zip, #phone').on('input', function () { this.value = this.value.replace(/\D/g, ''); }); // digits only

  function updateComplete() {
    var names = ['name', 'email', 'phone', 'dob', 'college', 'year', 'city', 'zip', 'track', 'password'];
    var filled = names.filter(function (n) { return $.trim($('#' + n).val()) !== ''; }).length;
    var skillSet = $('#skills input').filter(function () { return Number(this.value) > 0; }).length;
    var pct = Math.round(((filled + Math.min(skillSet, 3)) / (names.length + 3)) * 100);
    $('#complete').val(pct); $('#completeOut').text(pct + '%');
  }
  $('#regForm').on('input change', updateComplete);
  $('#resetBtn').on('click', function () { setTimeout(function () { $('.invalid').removeClass('invalid'); $('.err').text(''); $('#skills output').text('0'); $('#hintOut').empty(); updateComplete(); }, 0); });

  // ---------- submit ----------
  $('#regForm').on('submit', function (e) {
    e.preventDefault();
    $('#formErr').text('');
    var allOk = true;
    Object.keys(rules).forEach(function (n) { if (!check(n)) allOk = false; });
    var agreed = $('#agree').is(':checked');
    $('#agreeErr').text(agreed ? '' : 'You must accept the rules'); if (!agreed) allOk = false;
    if (!allOk) { $('#formErr').text('Please fix the highlighted fields.'); $('.invalid').first().trigger('focus'); return; }

    var skills = {}; SKILLS.forEach(function (s) { skills[s[0]] = Number($('#sk_' + s[0]).val()); });
    var body = {
      name: $.trim($('#name').val()), email: $.trim($('#email').val()), phone: $('#phone').val(), dob: $('#dob').val(),
      college: $.trim($('#college').val()), year: $('#year').val(), city: $.trim($('#city').val()), zip: $('#zip').val(), track: $('#track').val(),
      friendEmail: $.trim($('#friendEmail').val()), website: $.trim($('#website').val()), color: $('#color').val(),
      gender: $('input[name=gender]:checked').val(), bio: $('#bio').val(), password: $('#password').val(), agree: true,
      tools: $('input[name=tools]:checked').map(function () { return this.value; }).get(), skills: skills, quiz: quiz
    };
    var $btn = $('#regForm button[type=submit]').prop('disabled', true).text('Submitting...');
    TF.api('/api/register', { method: 'POST', body: body }).then(function (r) {
      $btn.prop('disabled', false).text('Register');
      if (r.errors) {
        Object.keys(r.errors).forEach(function (k) { $('#' + k).addClass('invalid').closest('.row > div').find('.err').first().text(r.errors[k]); });
        $('#formErr').text('The server rejected some fields.'); return;
      }
      TF.setSession({ token: r.token, name: r.name, id: r.id, accountNo: r.accountNo }); TF.renderWho(); // logged in right away
      $('#regForm').hide();
      $('#done').show().html('<h2 style="margin-top:0">You are registered!</h2><p>Your participant ID is <b>' + r.id + '</b>.</p>' +
        '<p>Your wallet account number is <b style="font-family:Consolas,monospace">' + r.accountNo + '</b> with a demo balance of &#8377;' + r.welcomeBalance + '. Pay the &#8377;' + r.fee + ' fee on the <a href="pay.html?acc=' + r.accountNo + '&amt=' + r.fee + '">wallet page</a>.</p>' +
        '<p>You are now logged in as <b>' + $('<i>').text(r.name).html() + '</b> - your password is used whenever you log in again.</p>' +
        '<p><a class="btn" href="pay.html?acc=' + r.accountNo + '&amt=' + r.fee + '">Pay fee</a> <a class="btn ghost" href="teams.html">See my team</a> <a class="btn ghost" href="kit.html">Pick a resource kit</a></p>');
      window.scrollTo(0, 0);
    }).catch(function () { $btn.prop('disabled', false).text('Register'); $('#formErr').text('Cannot reach the server.'); });
  });
  updateComplete();
});
