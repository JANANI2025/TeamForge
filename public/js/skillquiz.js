/* 12-question skill quiz (2 per skill), client-side only. Used inside the registration page.
   SkillQuiz.start(callback) -> callback({fe:1|3|5, ...}) when finished. 0 right = 1 (beginner), 1 right = 3, 2 right = 5. */
window.SkillQuiz = (function ($) {
  var SK = { fe: 'Frontend', be: 'Backend', ml: 'Data / AI', ux: 'Design / UX', hw: 'Hardware / IoT', pm: 'Pitch / Domain' };
  var Q = [
    { s: 'fe', q: 'Which CSS property adds space OUTSIDE an element\'s border?', o: ['margin', 'padding', 'outline-offset', 'line-height'], a: 0 },
    { s: 'fe', q: 'Which DOM method attaches a click handler to an element?', o: ['addEventListener', 'appendChild', 'setAttribute', 'querySelector'], a: 0 },
    { s: 'be', q: 'Which HTTP status code means "resource created"?', o: ['200', '201', '301', '404'], a: 1 },
    { s: 'be', q: 'Why add an index to a database field?', o: ['To make lookups on that field faster', 'To encrypt the field', 'To reduce the document size', 'To stop duplicate servers'], a: 0 },
    { s: 'ml', q: 'Why split data into training and test sets?', o: ['To make training faster', 'To estimate performance on unseen data', 'To remove outliers', 'To balance the classes'], a: 1 },
    { s: 'ml', q: 'High training accuracy but low test accuracy usually means:', o: ['Underfitting', 'Overfitting', 'Perfect model', 'Missing labels'], a: 1 },
    { s: 'ux', q: 'Which choice is best for readable body text?', o: ['Light grey text on white', 'Dark text on a light background with strong contrast', 'Red text on green', 'Small text in all capitals'], a: 1 },
    { s: 'ux', q: 'Testing a prototype with about five users mainly helps you:', o: ['Prove statistical significance', 'Find the most common usability problems', 'Pick the colour palette', 'Estimate server load'], a: 1 },
    { s: 'hw', q: 'On an Arduino, which kind of pin reads a varying sensor voltage?', o: ['Digital output', 'Analog input', 'Ground', 'Reset'], a: 1 },
    { s: 'hw', q: 'Why put a resistor in series with an LED?', o: ['To make it blink', 'To limit the current', 'To increase voltage', 'To store charge'], a: 1 },
    { s: 'pm', q: 'A good order for a 3-minute demo pitch is:', o: ['Team bios, tech stack, future work', 'Problem, solution, demo, impact', 'Code walkthrough, then problem', 'Slides of every feature'], a: 1 },
    { s: 'pm', q: 'A "minimum viable product" is:', o: ['A product with all features', 'The smallest version that tests the core idea', 'A prototype nobody uses', 'A product without design'], a: 1 }
  ];
  var order, idx, score, picked, cb, opts;
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(t) { return $('<i>').text(t).html(); }
  function show() {
    var q = Q[order[idx]]; picked = null;
    $('#qzProg').css('width', (idx / Q.length * 100) + '%');
    $('#qzMeta').text('Question ' + (idx + 1) + ' of ' + Q.length + ' - ' + SK[q.s]);
    $('#qzText').text(q.q);
    opts = shuffle(q.o.map(function (t, i) { return { t: t, ok: i === q.a }; }));
    $('#qzOpts').html(opts.map(function (o, i) {
      return '<label style="font-weight:400;display:block;padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;margin-bottom:8px;cursor:pointer"><input type="radio" name="qzopt" value="' + i + '"> ' + esc(o.t) + '</label>';
    }).join(''));
    $('#qzNext').prop('disabled', true).text(idx === Q.length - 1 ? 'Finish' : 'Next');
  }
  function finish() {
    var level = {}; Object.keys(score).forEach(function (k) { level[k] = [1, 3, 5][score[k]]; });
    $('#qzPanel').slideUp(150);
    if (cb) cb(level);
  }
  function start(callback) {
    cb = callback; order = shuffle(Q.map(function (_, i) { return i; })); idx = 0; score = { fe: 0, be: 0, ml: 0, ux: 0, hw: 0, pm: 0 };
    $('#qzPanel').slideDown(150); show();
  }
  $(document).on('change', '#qzOpts input', function () { picked = Number(this.value); $('#qzNext').prop('disabled', false); });
  $(document).on('click', '#qzNext', function () {
    if (picked !== null && opts[picked].ok) score[Q[order[idx]].s]++;
    idx++; if (idx < Q.length) show(); else finish();
  });
  $(document).on('click', '#qzCancel', function () { $('#qzPanel').slideUp(150); });
  return { start: start, skills: SK };
})(jQuery);
