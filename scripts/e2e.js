// End-to-end browser test (Playwright). Needs the server + MongoDB running and demo data seeded.
//   node scripts/e2e.js [screenshot-dir]
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
const BASE = process.env.BASE || 'http://localhost:3000';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch());
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const fixCaptcha = () => pg.evaluate(() => { Math.random = () => 0; }); // captcha becomes AAAAA

  // ---------- HOME ----------
  await pg.goto(BASE + '/index.html'); await pg.waitForTimeout(500);
  ok((await pg.locator('#clock').innerText()) !== '--:--:--', 'digital clock ticking');
  ok((await pg.locator('#backBtn').count()) === 0, 'no Back button on home page');
  ok((await pg.locator('#cal td.prev').count()) > 0, 'calendar has previous-month cells');
  ok((await pg.locator('#rect').evaluate((e) => getComputedStyle(e).borderTopWidth)) === '6px', 'info box has 6px border');
  const t0 = await pg.locator('#rect').innerText(); const w0 = await pg.locator('#teamImg').evaluate((e) => e.width);
  await pg.click('#zoomIn'); await pg.waitForTimeout(350);
  const t1 = await pg.locator('#rect').innerText(); ok(t1 !== t0 && (await pg.locator('#teamImg').evaluate((e) => e.width)) > w0, 'zoom IN shows different, more detailed hackathon info');
  await pg.click('#zoomOut'); await pg.click('#zoomOut'); const t2 = await pg.locator('#rect').innerText(); ok(t2 !== t1 && t2 !== t0 && /journey/i.test(t2), 'zoom OUT shows the big-picture info');
  await pg.click('#pollBox .vote >> nth=0'); ok((await pg.locator('#pollNote').innerText()).includes('you voted Frontend'), 'poll vote recorded');
  await pg.click('#pollBox .vote >> nth=2'); const note = await pg.locator('#pollNote').innerText(); ok(note.includes('you voted Data / AI') && note.startsWith('1 vote'), 'poll vote can be switched (still 1 vote)');
  await pg.click('#unvote'); ok((await pg.locator('#pollNote').innerText()).startsWith('0 votes'), 'poll vote can be withdrawn');
  ok(!(await pg.locator('#gameBox').isVisible()), 'word game hidden at first');
  await pg.click('#showGame'); await pg.waitForSelector('#gameBox', { state: 'visible' }); await pg.click('#letters .lt >> nth=0'); ok((await pg.locator('#gameMsg').innerText()).length > 0, 'word game appears after the button and works');
  await pg.click('#hideGame'); await pg.waitForTimeout(300); ok(!(await pg.locator('#gameBox').isVisible()), 'word game can be hidden again');
  await pg.screenshot({ path: OUT + '/home.png', fullPage: true });
  await pg.waitForSelector('#loginPopup', { state: 'visible', timeout: 9000 });
  const box = await pg.locator('#loginPopup').boundingBox(); ok(Math.abs(box.x + box.width / 2 - 600) < 3 && Math.abs(box.y + box.height / 2 - 450) < 3, 'login popup centred after delay');
  await pg.fill('#lpEmail', 'demo1@college.edu'); await pg.fill('#lpPw', 'demo123'); await pg.fill('#lpCaptcha', 'WRONG'); await pg.click('#loginForm button[type=submit]');
  ok((await pg.locator('#lpErr').innerText()).includes('Captcha'), 'wrong captcha rejected');
  await pg.screenshot({ path: OUT + '/popup.png' });
  await fixCaptcha(); await pg.click('#captchaRefresh'); await pg.fill('#lpCaptcha', 'AAAAA'); await pg.click('#loginForm button[type=submit]');
  await pg.waitForFunction(() => sessionStorage.getItem('tf_session')); ok(true, 'popup login with correct captcha succeeds');

  // ---------- REGISTER (new user) ----------
  await pg.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await pg.goto(BASE + '/index.html'); await pg.click('a[href="register.html"].btn');
  await pg.waitForURL('**/register.html'); ok((await pg.locator('#backBtn').count()) === 1, 'Back button present on register page');
  ok(await pg.locator('#complete').evaluate((e) => e.closest('fieldset') === null), 'profile completeness is outside the skills fieldset');
  ok(await pg.evaluate(() => { const c = document.getElementById('complete'), s = document.querySelector('#regForm button[type=submit]'); return !!(c.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'profile completeness sits at the end, just before Register');
  await pg.click('#regForm button[type=submit]'); ok((await pg.locator('.invalid').count()) >= 8, 'empty form shows many errors');
  await pg.fill('#email', 'bad'); await pg.fill('#zip', '1234'); await pg.click('#regForm button[type=submit]');
  const msgs = await pg.locator('.err').allInnerTexts(); ok(msgs.some((m) => /valid email/i.test(m)) && msgs.some((m) => /exactly 5 digits/i.test(m)), 'email + 5-digit zip validation');
  await pg.fill('#city', 'chen'); await pg.waitForSelector('#cityList li'); ok((await pg.locator('#cityList li').first().innerText()).startsWith('Chennai'), 'city autocomplete from JSON');
  await pg.click('#cityList li >> nth=0');
  ok((await pg.locator('#sk_fe').inputValue()) === '0', 'sliders start at 0');
  await pg.click('#quizBtn'); await pg.waitForSelector('#qzPanel', { state: 'visible' });
  for (let i = 0; i < 12; i++) { await pg.locator('#qzOpts input').first().check(); await pg.click('#qzNext'); }
  await pg.waitForSelector('#quizStatus.good');
  const st = await pg.locator('#quizStatus').innerText(); const m = st.match(/Frontend (\d)\/5/);
  const fe = await pg.locator('#sk_fe').inputValue(); const all = await pg.$$eval('#skills input', (els) => els.map((e) => Number(e.value)));
  ok(m && fe === m[1] && all.some((v) => v > 0), 'quiz result sets the skill sliders automatically (' + all.join(',') + ')');
  await pg.fill('#bio', 'Built a React website with Node and MongoDB, designed screens in Figma and used Arduino sensors.');
  await pg.click('#hintBtn'); await pg.waitForSelector('#applyHints'); await pg.click('#applyHints');
  ok(Number(await pg.locator('#sk_hw').inputValue()) >= 2 && Number(await pg.locator('#sk_be').inputValue()) >= 3, 'bio hints (regex over keyword arrays) raise Hardware and Backend sliders');
  const email = 'e2e' + Date.now() + '@college.edu';
  await pg.fill('#name', 'Test Student'); await pg.fill('#email', email); await pg.fill('#phone', '9876543210'); await pg.fill('#dob', '2005-04-12'); await pg.fill('#college', 'PSG College of Technology');
  await pg.selectOption('#year', '3'); await pg.fill('#zip', '60001'); await pg.selectOption('#track', 'Web'); await pg.fill('#password', 'secret1'); await pg.check('#agree');
  ok((await pg.locator('#completeOut').innerText()) === '100%' || parseInt(await pg.locator('#completeOut').innerText()) > 60, 'completeness meter rises as fields are filled');
  await pg.screenshot({ path: OUT + '/register.png', fullPage: true });
  await pg.click('#regForm button[type=submit]'); await pg.waitForSelector('#done', { state: 'visible' });
  const done = await pg.locator('#done').innerText(); const acc = (done.match(/TF\d{8}/) || [])[0]; ok(!!acc && /logged in/i.test(done), 'registered and logged in automatically');
  ok((await pg.locator('#who').innerText()).includes('Log out'), 'header shows logged-in user');
  await pg.evaluate(() => sessionStorage.clear()); await pg.goto(BASE + '/index.html'); await fixCaptcha();
  await pg.click('#loginbtn'); await pg.fill('#lpEmail', email); await pg.fill('#lpPw', 'secret1'); await fixCaptcha(); await pg.click('#captchaRefresh'); await pg.fill('#lpCaptcha', 'AAAAA'); await pg.click('#loginForm button[type=submit]');
  await pg.waitForFunction(() => sessionStorage.getItem('tf_session')); ok(true, 'new user logs in again with email + the password they registered');

  // ---------- TEAMS: organizer access ----------
  await pg.goto(BASE + '/teams.html'); await pg.waitForSelector('.team-card, #teamGrid p');
  ok(!(await pg.locator('#adminBox').isVisible()), 'organizer panel hidden by default');
  await pg.click('#orgBtn'); await pg.fill('#orgUser', 'organizer'); await pg.fill('#orgPass', 'wrong'); await pg.click('#orgForm button[type=submit]');
  await pg.waitForFunction(() => document.getElementById('orgErr').textContent.length > 0); ok(!(await pg.locator('#adminBox').isVisible()), 'wrong organizer password keeps the panel hidden');
  await pg.fill('#orgPass', 'Forge@2026'); await pg.click('#orgForm button[type=submit]'); await pg.waitForSelector('#adminBox', { state: 'visible' }); ok(true, 'organizer username + password opens the panel');
  await pg.click('#buildBtn'); await pg.waitForSelector('#buildResult table'); await pg.waitForTimeout(600);
  ok((await pg.locator('.team-card').count()) >= 2 && (await pg.locator('canvas.rd').count()) >= 2, 'teams built, cards and canvas radar drawn');
  ok((await pg.locator('#summary').innerText()).includes('registered'), 'organizer summary shown');
  await pg.click('#orgLock'); await pg.waitForTimeout(300); ok(!(await pg.locator('#adminBox').isVisible()), 'Lock panel hides it again');
  await pg.reload(); await pg.waitForSelector('#mine h2'); ok((await pg.locator('#mine').innerText()).includes('Why you are here'), 'personal explanation shown');
  await pg.screenshot({ path: OUT + '/teams.png', fullPage: true });
  const hasGap = /Team gaps/.test(await pg.locator('#mine').innerText());

  // ---------- LIBRARY / KIT correlated to team gaps ----------
  await pg.goto(BASE + '/library.html'); await pg.waitForSelector('#books tbody tr td:nth-child(2)');
  ok((await pg.locator('#books tbody tr').count()) >= 6, 'library lists books from MongoDB');
  ok(!hasGap || (await pg.locator('#books .badge:has-text("Recommended")').count()) > 0, "library recommends books for the team's gaps (team has gaps: " + hasGap + ')');
  await pg.screenshot({ path: OUT + '/library.png', fullPage: true });
  await pg.goto(BASE + '/kit.html'); await pg.waitForSelector('.item'); await pg.waitForTimeout(600);
  ok((await pg.locator('.item').count()) === 10, 'angular rendered 10 items');
  ok(!hasGap || (await pg.locator('.item:has-text("Recommended for your team")').count()) > 0, "kit recommends items for the team's gaps");
  await pg.selectOption('#cat', { label: 'Hardware' }); ok((await pg.locator('.item').count()) === 3, 'category filter works');
  await pg.locator('.item input[type=checkbox]').first().check(); await pg.click('button:has-text("Submit")'); await pg.waitForSelector('text=Your cart');
  ok(/₹\d/.test(await pg.locator('tfoot th').last().innerText()), 'cart shows total'); await pg.click('button:has-text("Pay")'); await pg.waitForSelector('text=/Paid. New balance/');
  await pg.screenshot({ path: OUT + '/kit.png', fullPage: true });

  // ---------- PAY ----------
  await pg.goto(BASE + '/pay.html?acc=' + acc + '&amt=99999'); ok((await pg.locator('#backBtn').count()) === 1, 'Back button on wallet page');
  await pg.click('#debitForm button[type=submit]'); await pg.waitForSelector('#msg .err'); ok((await pg.locator('#msg').innerText()).includes('Insufficient'), 'overdraft refused');
  await pg.fill('#amt', '10'); await pg.click('#debitForm button[type=submit]'); await pg.waitForSelector('#msg .badge'); await pg.waitForTimeout(500);
  ok((await pg.locator('#hist tbody tr').count()) >= 2, 'debit history lists the kit payment and this debit');
  await pg.screenshot({ path: OUT + '/pay.png' });

  // ---------- Back button ----------
  await pg.goto(BASE + '/index.html'); await pg.click('nav a[href="teams.html"]'); await pg.waitForURL('**/teams.html'); await pg.click('#backBtn'); await pg.waitForURL('**/index.html'); ok(true, 'Back button returns to the previous page');

  const real = errs.filter((e) => !/401|403|409|402|404/.test(e)); ok(real.length === 0, 'no JS errors' + (real.length ? ': ' + real.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
