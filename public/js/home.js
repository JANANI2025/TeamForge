
/* Home page: canvas brick wall, slideshow, calendar, poll, localized branches, OOP word game (Components 2 & 3) */
$(function () {
  // ---------- Canvas: abstract geometric hero illustration ----------
  (function () {
    var c = document.getElementById('brick');
    if (!c) return;

    var g = c.getContext('2d');
    var w = c.width;
    var h = c.height;

    // Light background
    g.fillStyle = '#f5f7f5';
    g.fillRect(0, 0, w, h);

    // Soft geometric circles
    g.fillStyle = '#dcefeb';
    g.beginPath();
    g.arc(w * 0.12, h * 0.15, 55, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#fef0d4';
    g.beginPath();
    g.arc(w * 0.88, h * 0.85, 60, 0, Math.PI * 2);
    g.fill();

    // Small decorative dots
    g.fillStyle = '#b7d9d1';
    for (var x = 25; x < w; x += 36) {
      for (var y = 25; y < h; y += 36) {
        g.beginPath();
        g.arc(x, y, 2, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Display the new logo in the centre
    var img = new Image();
    img.onload = function () {
      g.drawImage(img, w / 2 - 70, h / 2 - 70, 140, 140);
    };
    img.src = 'img/logo.svg';
  })();

  // ---------- Slideshow ----------
  (function () {
    var slides = ['img/slide1.svg', 'img/slide2.svg', 'img/slide3.svg', 'img/slide4.svg'], i = 0, timer = null, paused = false;
    var $dots = $('#dots');
    slides.forEach(function (s, n) { $('<span>').attr('data-i', n).appendTo($dots); });
    function show(n) {
      i = (n + slides.length) % slides.length;
      $('#slideImg').attr({ src: slides[i], alt: 'Slide ' + (i + 1) });
      $dots.children().removeClass('on').eq(i).addClass('on');
    }
    function start() { clearInterval(timer); timer = setInterval(function () { if (!paused) show(i + 1); }, 3000); }
    $('#next').on('click', function () { show(i + 1); });
    $('#prev').on('click', function () { show(i - 1); });
    $dots.on('click', 'span', function () { show(Number($(this).data('i'))); });
    $('#pause').on('click', function () { paused = !paused; $(this).text(paused ? 'Play' : 'Pause'); });
    show(0); start();
  })();

  // ---------- Zoom explorer: each zoom level shows different hackathon information ----------
  (function () {
    var levels = [
      { label: 'Zoomed out: the big picture', w: 90, size: '0.95rem', html: '<b>The journey</b><br>' + ['Register', 'Skill quiz', 'Teams built', '24 h hacking', 'Demo day'].map(function (x) { return '<span class="chip">' + x + '</span>'; }).join(' &rarr; ') + '<br><span class="muted">Everything on this site supports one of these five steps.</span>' },
      { label: 'At a glance', w: 120, size: '1rem', html: '<b>Hackathon at a glance</b><ul style="margin:6px 0"><li>Dates: Sat 14 and Sun 15 Nov 2026</li><li>Venues: Chennai and Coimbatore campuses</li><li>Teams of 5, built from your registration</li><li>Fee: &#8377;200 from your wallet</li><li>Tracks: Web, AI, IoT, Social</li></ul>' },
      { label: 'Zoomed in: schedule', w: 160, size: '1.05rem', html: '<b>Schedule</b><table style="font-size:.9rem"><tr><td>Sat 09:00</td><td>Check-in and team reveal</td></tr><tr><td>Sat 10:30</td><td>Kick-off, hacking starts</td></tr><tr><td>Sat 20:00</td><td>Dinner and mentor round</td></tr><tr><td>Sun 09:00</td><td>Hacking ends, demo slots</td></tr><tr><td>Sun 15:00</td><td>Results and prizes</td></tr></table>' },
      { label: 'Closer: judging', w: 200, size: '1.1rem', html: '<b>How projects are judged</b><ul style="margin:6px 0"><li>Impact of the idea: 30%</li><li>Technical quality: 30%</li><li>Use of every teammate\'s skill: 20%</li><li>Demo and pitch: 20%</li></ul><span class="muted">Teams are built so each of the six skills is covered, which is what the 20% rewards.</span>' },
      { label: 'Closest: help and resources', w: 240, size: '1.15rem', html: '<b>Help on the day</b><ul style="margin:6px 0"><li>Mentors for every skill (book 30 min in the <a href="kit.html">resource kit</a>)</li><li>Books for your weak skills in the <a href="library.html">library</a></li><li>Wallet top-ups at the help desk</li><li>Need a swap? Do it on the <a href="teams.html">Teams</a> page</li></ul>' }
    ], lv = 1;
    function draw() {
      var L = levels[lv];
      $('#zoomLabel').text(L.label + ' (' + (lv + 1) + '/' + levels.length + ')');
      $('#teamImg').width(L.w); $('#rect').css('font-size', L.size).html(L.html);
      $('#zoomIn').prop('disabled', lv === levels.length - 1); $('#zoomOut').prop('disabled', lv === 0);
    }
    $('#zoomIn').on('click', function () { if (lv < levels.length - 1) { lv++; draw(); } });
    $('#zoomOut').on('click', function () { if (lv > 0) { lv--; draw(); } });
    draw();
  })();

  // ---------- Calendar for the hackathon month; <td> for the previous month get another colour ----------
  (function () {
    var year = 2026, month = 10; // November 2026 (0-based)
    var first = new Date(year, month, 1), startDay = (first.getDay() + 6) % 7; // week starts on Monday
    var dim = new Date(year, month + 1, 0).getDate(), prevDim = new Date(year, month, 0).getDate();
    $('#calTitle').text(first.toLocaleString('en', { month: 'long', year: 'numeric' }));
    var html = '<tr>' + ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr><tr>';
    var cell = 0;
    for (var p = startDay - 1; p >= 0; p--, cell++) html += '<td class="prev">' + (prevDim - p) + '</td>';
    for (var d = 1; d <= dim; d++, cell++) {
      if (cell % 7 === 0 && cell) html += '</tr><tr>';
      var cls = (cell % 7 === 6 ? 'sun ' : '') + (d === 14 || d === 15 ? 'event' : '');
      html += '<td class="' + cls + '">' + d + '</td>';
    }
    html += '</tr>'; $('#cal').html(html);
  })();

  // ---------- Survey poll: you can switch your vote or withdraw it ----------
  (function () {
    var opts = ['Frontend', 'Backend', 'Data / AI', 'Design / UX', 'Hardware', 'Pitching'], key = 'tf_poll2', votes = {}, mine = null;
    opts.forEach(function (o) { votes[o] = 0; });
    try { var saved = JSON.parse(localStorage.getItem(key)); if (saved) { votes = saved.votes; mine = saved.mine; } } catch (e) {}
    function save() { try { localStorage.setItem(key, JSON.stringify({ votes: votes, mine: mine })); } catch (e) {} }
    function render() {
      var total = opts.reduce(function (s, o) { return s + (votes[o] || 0); }, 0), h = '';
      opts.forEach(function (o) {
        var pct = total ? Math.round((100 * votes[o]) / total) : 0;
        h += '<div class="poll-opt"><div><button class="btn ghost vote' + (mine === o ? ' mine' : '') + '" data-o="' + o + '" style="padding:4px 10px" aria-pressed="' + (mine === o) + '">' + (mine === o ? '&#10003; ' : '') + o + '</button>' +
          '<div class="bar" style="margin-top:4px"><i style="width:' + pct + '%"></i></div></div><b>' + pct + '%</b></div>';
      });
      $('#pollBox').html(h);
      $('#pollNote').html(total + ' vote' + (total === 1 ? '' : 's') + (mine ? ' - you voted <b>' + mine + '</b>. Click another option to switch, or <a href="#" id="unvote">withdraw your vote</a>.' : ' - click an option to vote.'));
    }
    $('#pollBox').on('click', '.vote', function () {
      var o = $(this).data('o'); if (mine === o) return;
      if (mine) votes[mine] = Math.max(0, votes[mine] - 1); // switching moves your vote
      votes[o]++; mine = o; save(); render();
    });
    $('#pollNote').on('click', '#unvote', function (e) { e.preventDefault(); if (mine) { votes[mine] = Math.max(0, votes[mine] - 1); mine = null; save(); render(); } });
    render();
  })();

  // ---------- Two branches with localized content ----------
  (function () {
    var info = {
      chn: { en: 'Chennai campus - Main auditorium, Block A. Reporting 8:30 AM. Venue map and tram route available at the desk.', ta: 'சென்னை வளாகம் - ஏ பிளாக் முதன்மை அரங்கம். காலை 8:30 மணிக்கு வருகை.' },
      cbe: { en: 'Coimbatore campus - Innovation lab, Block C. Reporting 9:00 AM. Free shuttle from the railway station.', ta: 'கோயம்புத்தூர் வளாகம் - சி பிளாக் புதுமை ஆய்வகம். காலை 9:00 மணிக்கு வருகை.' }
    };
    function show(b) {
      var l = localStorage.getItem('tf_lang') || 'en';
      $('#branchInfo').text(info[b][l] || info[b].en);
      try { localStorage.setItem('tf_branch', b); } catch (e) {}
    }
    $('#branches [data-branch]').on('click', function () { show($(this).data('branch')); });
    $('#lang').on('change', function () { show(localStorage.getItem('tf_branch') || 'chn'); });
    show(localStorage.getItem('tf_branch') || 'chn');
    // Tamil / English for hero text
    var heroText = { en: [$('#headline').html(), $('#lead').html()], ta: ['சேர்ந்து <span style="color:#0f766e">உருவாக்கும்</span> அணிகள்.', 'TeamForge உங்கள் பதிவை படித்து அனைத்து அணிகளிலும் திறன்களை சமநிலைப்படுத்துகிறது; ஏன் இந்த அணி என்பதையும் விளக்குகிறது.'] };
    $('#lang').on('change', function () { var l = this.value; $('#headline').html(heroText[l][0]); $('#lead').html(heroText[l][1]); });
    if ((localStorage.getItem('tf_lang') || 'en') === 'ta') $('#lang').trigger('change');
  })();

  // ---------- Object-oriented "Guess the Word" game ----------
  function WordGame(words) { this.words = words; this.reset(); }
  WordGame.prototype.reset = function () {
    this.word = this.words[Math.floor(Math.random() * this.words.length)].toUpperCase();
    this.guessed = []; this.wrong = 0; this.max = 6;
  };
  WordGame.prototype.guess = function (ch) {
    if (this.guessed.indexOf(ch) > -1 || this.over()) return;
    this.guessed.push(ch); if (this.word.indexOf(ch) < 0) this.wrong++;
  };
  WordGame.prototype.view = function () { var g = this.guessed; return this.word.split('').map(function (c) { return g.indexOf(c) > -1 ? c : '_'; }).join(' '); };
  WordGame.prototype.won = function () { return this.view().indexOf('_') < 0; };
  WordGame.prototype.over = function () { return this.won() || this.wrong >= this.max; };
  var game = new WordGame(['hackathon', 'frontend', 'backend', 'mentor', 'prototype', 'database', 'teamwork', 'deploy']);
  function draw() {
    $('#wordView').text(game.view());
    $('#gameMsg').text(game.won() ? 'You got it!' : game.wrong >= game.max ? 'Out of guesses. The word was ' + game.word : 'Wrong guesses: ' + game.wrong + ' / ' + game.max);
    var h = ''; 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (ch) { h += '<button class="btn ghost lt" style="padding:2px 8px;margin:2px" ' + (game.guessed.indexOf(ch) > -1 || game.over() ? 'disabled' : '') + '>' + ch + '</button>'; });
    $('#letters').html(h);
  }
  $('#letters').on('click', '.lt', function () { game.guess($(this).text()); draw(); });
  $('#newGame').on('click', function () { game.reset(); draw(); });
  $('#showGame').on('click', function () { $('#gameBox').slideDown(150); $(this).hide(); game.reset(); draw(); });
  $('#hideGame').on('click', function () { $('#gameBox').slideUp(150); $('#showGame').show(); });
  draw();
});
