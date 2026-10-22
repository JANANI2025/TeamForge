# TeamForge — Skill-Balanced Hackathon Registration
*Web Technologies mini project — covers all 8 course components*

## 1. Problem and the research gap (verified)
Hackathon registration forms collect names and emails, then teams form by self-selection. Research and organizer guides report the consequence: skill imbalance and missing skills.

| What I checked | What I found |
|---|---|
| Devfolio "Create/Join a team" help page | Describes only create/join timing rules. No skill-based matching or recommendation is documented. |
| Hackathon planning kit, arXiv 2008.08025 | Teams formed by open selection, assignment or hybrid. Open selection risks missing skills. No matching algorithm; the moderator configures teams by hand (Google Forms at small events). |
| Hev et al. 2021, *Team Formation and Inclusion in Hackathons* (IEEE) | Open assignment produced skill imbalances; an algorithmic assignment struggled with no-shows. Authors recommend suggest-then-adjust and call for empirical evidence. |
| Existing student matchmaker apps (e.g. TeamSync, DevMatchups) | Describe matching individuals to teammates; no public explanation of scoring, no cohort-wide skill balancing, no measurement against a baseline. |

**Honest framing:** "team matching" itself is not new. The gap is a *small, transparent, measurable* system that (a) designs the registration form to feed the matcher, (b) balances skills across **all** teams at once, (c) **explains** each placement, (d) lets people adjust with a safety rule, and (e) **measures** the result against random teams. I did not find all five together in the sources above. I could not read every platform's internals (some pages were unreadable), so state it as "not documented in the sources reviewed", not "does not exist anywhere".

## 2. What is new in TeamForge
1. **Skill-complement objective** — a skill counts as covered when someone in the team has level ≥ 3/5; the score rewards covering all six skills and penalises uneven team strength.
2. **Verified skills** — a 12-question quiz built into the registration form fills the skill sliders for you; the final skill is the average of self-rating and quiz result (unverified ratings count 85%). A bio scanner suggests ratings from the words you write.
3. **Friend pods** — a requested friend stays in the same team when team size allows.
4. **Explainable placement** — each person sees *why* (e.g. "only teammate strong in Backend").
5. **Safe swaps** — preview before/after; allowed only if no new skill gap is created.
6. **Evaluation** — `node scripts/simulate.js` compares TeamForge with random and a friends-first model.

### Results (300 synthetic cohorts × 120 people, teams of 5)
| Method | Skill gaps per team ↓ | Teams fully covered ↑ | Strength spread (SD) ↓ |
|---|---|---|---|
| Random | 1.56 ±0.02 | 8.9% | 0.85 |
| Friends-first (assumed model) | 2.49 ±0.02 | 1.1% | 0.87 |
| **TeamForge** | **0.10 ±0.01** | **89.8% ±1.2** | **0.09** |

Limits to state in your viva: data are synthetic; the friends-first arm is an assumption; no real participants were tested; the quiz runs client-side so it can be gamed; a real study would compare project outcomes.

## 3. Mapping to your 8 table rows (every component serves the page it sits on)
| # | Course component | Where in TeamForge | Why it belongs there |
|---|---|---|---|
| 1 | HTML form, input types, HTML5 types, styles | `register.html`: text, email, tel, date, url, password, color, range ×6 + `<output>`, `<meter>`, datalist, radio, checkbox, select, textarea, submit, reset, `input type=image`, fieldset/legend, `<mark> <abbr> <sup> <small>` | The form *is* the skills profile the matcher uses. Profile completeness is at the end, before Register. |
| 2 | CSS internal, external, inline | External `css/style.css`; internal `<style>` and inline `style=""` in `index.html`; 6px-border info box; `<ul>` + image; calendar `<td>` for the previous month in another colour; canvas brick wall behind the logo; two campuses with English/Tamil text | Home page = event information. |
| 2b | Enlarge / shrink | **Hackathon explorer** on the home page: zoom in = schedule, judging, help; zoom out = the big picture | Each zoom level shows different event information. |
| 3 | JavaScript + DOM | Slideshow, digital clock + countdown, **switchable poll** (change or withdraw your vote), OOP word game (hidden behind "Just play a word game for fun") on `index.html`; **bio skill scanner** on `register.html`; 12-question quiz (client-side only) on `register.html` | Quiz and scanner fill the skill sliders. |
| 3a | Array of words + regular expressions | `register.js`: an array of keywords per skill; one regex per skill counts matches in your bio and ticked tools, then suggests a rating (replaces the vowel/consonant name lab) | Same idea (array + regex counting), now useful: it speeds up skill rating. |
| 4 | jQuery popup login | Centre popup after 6 s with canvas captcha text; also opened by the Log in button | The password you set at registration is used here. |
| 5 | JSON + validation | `data/cities.json` + jQuery autocomplete; all required fields; zip exactly 5 digits; email check | Registration form. |
| 6 | AngularJS | `kit.html`: categories, selection, Submit shows items with prices and total, pay from wallet; items your team needs are tagged **Recommended** | Uses your team's skill gaps from the Teams page. |
| 7 | MongoDB | `mongo/books.mongosh.js`: unique ISBN, multi-author insert, price update, delete year < 1990 (+ `topic` skill key). `library.html` lists books and puts books for your team's gaps first | Library recommends reading for missing skills. |
| 8 | Node.js debit | `pay.html` → `/api/debit` reduces the balance in MongoDB only if funds suffice; debit history shown; registration fee and kit payments use it | Wallet for fee and kit. |

**Navigation:** every page except Home has a **← Back** button (goes to the previous page, or Home if you opened the page directly).

**Password:** set at registration, you are logged in automatically, and the same email + password is used in the Log in pop-up to see your team, swap, and use your wallet.

**Organizer access (Teams page):** the organizer panel is hidden. Click **Organizer access** and sign in with

| Username | Password |
|---|---|
| `organizer` | `Forge@2026` |

(hard-coded in `server.js`, constants `ADMIN_USER` / `ADMIN_PASS`; change them there). After login you can build teams and see a registration summary; **Lock panel** hides it again.

## 4. How to run
```
npm install
mongod                                   # or MongoDB Atlas: set MONGO_URI
node scripts/seed-demo.js 40             # demo data (password demo123)
node server.js                           # http://localhost:3000
mongosh teamforge mongo/books.mongosh.js # Component 7 commands
node scripts/simulate.js 300 120 5       # evaluation
```
Demo: log in as `demo1@college.edu` / `demo123`; organizer login is `organizer` / `Forge@2026`. Zip length is one constant (`ZIP_LEN`) if you need 6-digit PIN codes.

## 5. Tested
46 browser checks (Playwright/Chromium) all pass: Back buttons, zoom explorer, switchable poll, hidden word game, popup login + captcha, validation, autocomplete, quiz filling the sliders, bio scanner, auto-login and re-login with the password, organizer login (wrong and right), team building and radar charts, library/kit recommendations, AngularJS cart + payment, overdraft refusal, debit history. `node scripts/e2e.js <screenshot-dir>` reruns them. I ran the server on **FerretDB (a MongoDB-compatible server)** because real MongoDB could not be installed in my sandbox; the books script also ran under `mongosh`. **Please run once on real MongoDB.** Known caveat: under FerretDB, 10 parallel debits lost updates. The debit uses a single atomic `findOneAndUpdate` with a balance condition, which real MongoDB guarantees for one document; sequential debits behaved correctly (5 accepted, then refused).

## 6. Viva questions to prepare
- *What is the gap?* Section 1 — five features together, measured; not "matching is new".
- *Why not an LLM/embeddings?* Transparent, explainable, no cost, deterministic.
- *Is the algorithm optimal?* No — greedy placement plus local pair-swap search; a heuristic.
- *Why is zip 5 digits?* The assignment says so; one constant changes it.
- *Security?* Passwords hashed with scrypt; captcha is client-side so decorative; sessions in memory.
- *Why Mongo?* Flexible documents: skills as nested objects, authors as arrays.

## 7. Submission checklist
Zip of this folder **without** `node_modules` (organizer login `organizer` / `Forge@2026` is in the README) · this guide as the report (add your name/roll no.) · 6–8 screenshots (home, popup, register errors, quiz, teams, kit, pay, mongosh output) · simulation table · GitHub link if asked · be ready to run the demo live.
