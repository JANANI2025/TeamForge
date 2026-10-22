/* Teams page: canvas radar, "why am I here" explanation, hybrid swap phase, organizer build + random baseline comparison */
$(function () {
  var teams = [];

  function radar(canvas, cov) {
    var g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 30, n = cov.length;
    g.clearRect(0, 0, W, H);
    function pt(i, r) { var a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    g.strokeStyle = '#d6dfda'; g.lineWidth = 1;
    [1, 3, 5].forEach(function (lvl) { // grid rings at level 1, 3 (threshold) and 5
      g.beginPath(); for (var i = 0; i < n; i++) { var p = pt(i, (R * lvl) / 5); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath();
      g.strokeStyle = lvl === 3 ? '#f59e0b' : '#d6dfda'; g.setLineDash(lvl === 3 ? [4, 3] : []); g.stroke();
    }); g.setLineDash([]);
    g.beginPath(); cov.forEach(function (c, i) { var p = pt(i, (R * Math.min(c.level, 5)) / 5); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = 'rgba(15,118,110,.25)'; g.fill(); g.strokeStyle = '#0f766e'; g.lineWidth = 2; g.stroke();
    g.font = '11px Segoe UI, Arial'; g.textAlign = 'center';
    cov.forEach(function (c, i) { var p = pt(i, R + 16); g.fillStyle = c.ok ? '#1c2321' : '#b91c1c'; g.fillText(c.label, p[0], p[1] + 4); });
  }

  function render() {
    $('#count').text(teams.length);
    if (!teams.length) return $('#teamGrid').html('<p class="muted">No teams yet. Ask an organizer to build them.</p>');
    $('#teamGrid').html(teams.map(function (t, ti) {
      var gaps = t.coverage.filter(function (c) { return !c.ok; }).length;
      return '<div class="card team-card"><h3><span>' + $('<i>').text(t.name).html() + '</span><span class="badge ' + (gaps ? 'bad' : 'good') + '">' + (gaps ? gaps + ' gap' + (gaps > 1 ? 's' : '') : 'full coverage') + '</span></h3>' +
        '<canvas class="rd" data-i="' + ti + '" width="280" height="220" style="width:100%;max-width:280px"></canvas>' +
        '<ul>' + t.members.map(function (m) { return '<li>' + $('<i>').text(m.name).html() + ' <small class="muted">' + $('<i>').text(m.college || '').html() + '</small></li>'; }).join('') + '</ul>' +
        t.coverage.map(function (c) { return '<div class="bar-row"><span>' + c.label + '</span><div class="bar ' + (c.ok ? '' : 'gap') + '"><i style="width:' + Math.min(100, c.level / 5 * 100) + '%"></i></div><b>' + c.level + '</b></div>'; }).join('') + '</div>';
    }).join(''));
    $('canvas.rd').each(function () { radar(this, teams[$(this).data('i')].coverage); });
  }

  function loadTeams() { return TF.api('/api/teams').then(function (r) { teams = r; render(); loadMine(); }); }

  function loadMine() {
    var s = TF.session(); if (!s) return $('#mine').show().html('<h2 style="margin-top:0">Your team</h2><p>Log in to see your team and the reason you were placed in it.</p><button class="btn" id="goLogin">Log in</button>').find('#goLogin').on('click', TF.openLogin);
    TF.api('/api/teams/mine').then(function (r) {
      if (r.error) { TF.setSession(null); return; }
      if (!r.team) return $('#mine').show().html('<h2 style="margin-top:0">Your team</h2><p>Teams have not been built yet. Check back after registration closes.</p>');
      var h = '<h2 style="margin-top:0">Your team: ' + $('<i>').text(r.name).html() + '</h2>' +
        '<p><b>Why you are here</b></p><ul>' + r.explanation.reasons.map(function (x) { return '<li>' + $('<i>').text(x).html() + '</li>'; }).join('') + '</ul>';
      if (r.explanation.teamGaps.length) h += '<p><span class="badge bad">Team gaps</span> ' + r.explanation.teamGaps.join(', ') + ' - nobody here reaches 3/5 yet. Learn it together or ask a mentor.</p>';
      if (r.explanation.learnFrom.length) h += '<p class="muted">You could learn: ' + r.explanation.learnFrom.join(', ') + ' from your teammates.</p>';
      h += '<hr style="border:0;border-top:1px solid var(--line)"><p><b>Want to swap?</b> Pick a person in another team. We show what the swap does to both teams first, and only allow it if it creates no new skill gap.</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><select id="swapWith" style="max-width:340px"><option value="">Choose a person...</option>' +
        teams.filter(function (t) { return t.id !== r.team; }).map(function (t) { return '<optgroup label="' + t.name + '">' + t.members.map(function (m) { return '<option value="' + m.id + '">' + $('<i>').text(m.name).html() + '</option>'; }).join('') + '</optgroup>'; }).join('') +
        '</select><button class="btn ghost" id="previewSwap">Preview</button><button class="btn" id="applySwap" disabled>Swap</button></div><div id="swapOut" style="margin-top:10px"></div>';
      $('#mine').show().html(h);
      $('#previewSwap').on('click', function () { doSwap(false); });
      $('#applySwap').on('click', function () { doSwap(true); });
    });
  }
  function doSwap(apply) {
    var id = $('#swapWith').val(); if (!id) return TF.toast('Choose a person first');
    TF.api('/api/swap', { method: 'POST', body: { withId: id, apply: apply } }).then(function (r) {
      if (r.error) return $('#swapOut').html('<span class="err">' + r.error + '</span>');
      if (r.applied) { TF.toast('Swap done!'); return loadTeams(); }
      $('#swapOut').html('<div class="card" style="margin:0"><b>Skill gaps (both teams): ' + r.before.gaps + ' &rarr; ' + r.after.gaps + '</b><br>' + (r.allowed ? '<span class="badge good">Allowed</span> This swap does not create a new gap.' : '<span class="badge bad">Not allowed</span> It would leave more skills uncovered.') + '</div>');
      $('#applySwap').prop('disabled', !r.allowed);
    });
  }

  // ---------- organizer access: panel stays hidden until username + password are accepted ----------
  function adminToken() { try { return sessionStorage.getItem('tf_admin'); } catch (e) { return null; } }
  function showPanel() {
    $('#adminBox').slideDown(150); $('#orgBtn').hide();
    TF.api('/api/admin/summary', { headers: { 'x-admin-token': adminToken() } }).then(function (r) {
      if (r.error) return lockPanel();
      $('#summary').html('<b>' + r.participants + '</b> registered &middot; <b>' + r.verified + '</b> took the quiz &middot; <b>' + r.feePaid + '</b> paid the fee &middot; <b>' + r.teams + '</b> teams built');
    });
  }
  function lockPanel() { try { sessionStorage.removeItem('tf_admin'); } catch (e) {} $('#adminBox').slideUp(150); $('#orgBtn').show(); $('#buildResult').empty(); }
  function closeOrg() { $('#orgOverlay, #orgPopup').fadeOut(150); }
  $('#orgBtn').on('click', function () { $('#orgErr').text(''); $('#orgOverlay, #orgPopup').fadeIn(150); $('#orgUser').val('').trigger('focus'); $('#orgPass').val(''); });
  $('#orgClose, #orgOverlay').on('click', closeOrg);
  $('#orgLock').on('click', lockPanel);
  $('#orgForm').on('submit', function (e) {
    e.preventDefault();
    TF.api('/api/admin/login', { method: 'POST', body: { username: $('#orgUser').val(), password: $('#orgPass').val() } }).then(function (r) {
      if (!r.token) return $('#orgErr').text(r.error || 'Login failed');
      try { sessionStorage.setItem('tf_admin', r.token); } catch (e) {}
      closeOrg(); showPanel();
    });
  });
  if (adminToken()) showPanel();

  $('#buildBtn').on('click', function () {
    var $b = $(this).prop('disabled', true).text('Building...');
    TF.api('/api/admin/build', { method: 'POST', headers: { 'x-admin-token': adminToken() }, body: { teamSize: Number($('#teamSize').val()) } }).then(function (r) {
      $b.prop('disabled', false).text('Build teams');
      if (r._status === 403) { lockPanel(); return TF.toast('Organizer session expired - log in again'); }
      if (r.error) return $('#buildResult').html('<span class="err">' + r.error + '</span>');
      var o = r.ours, b2 = r.randomBaseline;
      $('#buildResult').html('<table><thead><tr><th>Method</th><th>Skill gaps per team</th><th>Teams fully covered</th><th>Strength spread (SD)</th></tr></thead><tbody>' +
        '<tr><td><b>TeamForge</b></td><td>' + o.gapsPerTeam.toFixed(2) + '</td><td>' + o.fullCoveragePct.toFixed(0) + '%</td><td>' + o.strengthSD.toFixed(2) + '</td></tr>' +
        '<tr><td>Random teams (same people)</td><td>' + b2.gapsPerTeam.toFixed(2) + '</td><td>' + b2.fullCoveragePct.toFixed(0) + '%</td><td>' + b2.strengthSD.toFixed(2) + '</td></tr></tbody></table>');
      showPanel(); loadTeams();
    });
  });

  loadTeams();
});
