/* Component 4 - jQuery popup login at the centre of the screen after a time interval, with Captcha text */
(function ($) {
  var captchaText = '';
  var DELAY_MS = 6000; // "specified time interval"

  function makeCaptcha() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I)
    captchaText = '';
    for (var i = 0; i < 5; i++) captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
    var c = document.getElementById('captchaCanvas'), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#f1f5f2'; g.fillRect(0, 0, c.width, c.height);
    for (var n = 0; n < 6; n++) { // noise lines
      g.strokeStyle = 'rgba(15,118,110,' + (0.2 + Math.random() * 0.4) + ')';
      g.beginPath(); g.moveTo(Math.random() * c.width, Math.random() * c.height); g.lineTo(Math.random() * c.width, Math.random() * c.height); g.stroke();
    }
    g.font = 'bold 28px Consolas, monospace'; g.textBaseline = 'middle';
    for (var j = 0; j < captchaText.length; j++) { // each letter slightly rotated
      g.save(); g.translate(14 + j * 24, c.height / 2 + (Math.random() * 8 - 4)); g.rotate((Math.random() - 0.5) * 0.6);
      g.fillStyle = ['#0f766e', '#9a3412', '#4338ca', '#be123c'][j % 4]; g.fillText(captchaText.charAt(j), 0, 0); g.restore();
    }
  }

  function build() {
    if ($('#loginPopup').length) return;
    $('body').append(
      '<div class="overlay" id="overlay"></div>' +
      '<div class="popup" id="loginPopup" role="dialog" aria-modal="true" aria-labelledby="lpTitle">' +
      '<button class="close" id="lpClose" aria-label="Close">&times;</button>' +
      '<h3 id="lpTitle">Participant login</h3><p class="muted" style="margin-top:-6px">See your team and why you were placed in it.</p>' +
      '<form id="loginForm" novalidate>' +
      '<label for="lpEmail">Email</label><input type="email" id="lpEmail" autocomplete="username">' +
      '<label for="lpPw" style="margin-top:10px">Password</label><input type="password" id="lpPw" autocomplete="current-password">' +
      '<label style="margin-top:10px">Type the text in the image</label>' +
      '<div class="captcha-box"><canvas id="captchaCanvas" width="130" height="44"></canvas>' +
      '<button type="button" class="btn ghost" id="captchaRefresh" title="New captcha">&#8635;</button>' +
      '<input type="text" id="lpCaptcha" maxlength="5" autocomplete="off" style="text-transform:uppercase"></div>' +
      '<div class="err" id="lpErr" role="alert"></div>' +
      '<button class="btn" type="submit" style="width:100%;margin-top:6px">Log in</button>' +
      '<p class="muted" style="font-size:.85rem">Demo: demo1@college.edu / demo123 (after running the seed script)</p></form></div>');
    $('#lpClose, #overlay').on('click', TF.closeLogin);
    $('#captchaRefresh').on('click', makeCaptcha);
    $(document).on('keydown', function (e) { if (e.key === 'Escape') TF.closeLogin(); });
    $('#loginForm').on('submit', function (e) {
      e.preventDefault();
      var typed = $.trim($('#lpCaptcha').val()).toUpperCase();
      if (!$('#lpEmail').val() || !$('#lpPw').val()) return $('#lpErr').text('Enter email and password.');
      if (typed !== captchaText) { $('#lpErr').text('Captcha does not match. Try the new one.'); makeCaptcha(); $('#lpCaptcha').val(''); return; }
      TF.api('/api/login', { method: 'POST', body: { email: $('#lpEmail').val(), password: $('#lpPw').val() } }).then(function (r) {
        if (r.token) { TF.setSession({ token: r.token, name: r.name, id: r.id, accountNo: r.accountNo }); TF.closeLogin(); TF.toast('Welcome back, ' + r.name + '!'); setTimeout(function () { location.reload(); }, 600); }
        else { $('#lpErr').text(r.error || 'Login failed'); makeCaptcha(); $('#lpCaptcha').val(''); }
      });
    });
  }

  TF.openLogin = function () {
    build(); makeCaptcha(); $('#lpErr').text('');
    $('#overlay').fadeIn(150); $('#loginPopup').fadeIn(200); $('#lpEmail').trigger('focus');
  };
  TF.closeLogin = function () { $('#overlay').fadeOut(150); $('#loginPopup').fadeOut(150); };

  // Appear automatically after DELAY_MS on pages that ask for it (<body data-autopopup>) when nobody is logged in.
  $(function () {
    if ($('body').is('[data-autopopup]') && !TF.session()) {
      var wait = Number($('body').attr('data-autopopup')) || DELAY_MS;
      setTimeout(function () { if (!TF.session()) TF.openLogin(); }, wait);
    }
  });
})(jQuery);
