/**
 * Simulation: TeamForge vs random teams vs a "friends-first" (homophily) model.
 * Synthetic cohorts - no real participants. Run:  node scripts/simulate.js [runs] [participants]
 *
 * Honest limits: synthetic data; the homophily arm is a stated modelling assumption
 * (people team up with someone of the same college and same strongest skill).
 */
const { SKILLS, buildTeams, randomTeams, evaluate, mulberry32 } = require('../matching');

const RUNS = Number(process.argv[2]) || 300;
const N = Number(process.argv[3]) || 120;
const TEAM = Number(process.argv[4]) || 5;

function cohort(seed, n) {
  const rng = mulberry32(seed * 7919 + 13);
  const people = [];
  for (let i = 0; i < n; i++) {
    const skills = {};
    const primary = Math.floor(rng() * SKILLS.length);
    const secondary = Math.floor(rng() * SKILLS.length);
    SKILLS.forEach(({ key }, idx) => {
      let v;
      if (idx === primary) v = 3 + Math.floor(rng() * 3);            // 3..5
      else if (idx === secondary) v = 2 + Math.floor(rng() * 2);     // 2..3
      else v = Math.floor(rng() * 3);                                // 0..2
      skills[key] = v;
    });
    people.push({ id: 'p' + i, email: `p${i}@x.edu`, skills, quiz: { ...skills }, college: Math.floor(rng() * 6), primary });
  }
  return people;
}

// friends-first: group by (college, primary skill) as far as possible, then fill the rest by order
function homophily(people, seed) {
  const rng = mulberry32(seed + 99);
  const sorted = [...people].sort((a, b) => a.college - b.college || a.primary - b.primary || rng() - 0.5);
  const { effective } = require('../matching');
  const P = sorted.map((p) => ({ ...p, eff: effective(p) }));
  const k = Math.round(P.length / TEAM), teams = Array.from({ length: k }, () => []);
  P.forEach((p, i) => teams[Math.min(k - 1, Math.floor(i / TEAM))].push(p));
  return teams;
}

const arms = { random: [], friendsFirst: [], teamforge: [] };
const t0 = Date.now();
for (let s = 1; s <= RUNS; s++) {
  const people = cohort(s, N);
  arms.random.push(evaluate(randomTeams(people, { teamSize: TEAM, seed: s })));
  arms.friendsFirst.push(evaluate(homophily(people, s)));
  arms.teamforge.push(evaluate(buildTeams(people, { teamSize: TEAM, seed: s })));
}
const mean = (a, k) => a.reduce((x, r) => x + r[k], 0) / a.length;
const sd = (a, k) => { const m = mean(a, k); return Math.sqrt(a.reduce((x, r) => x + (r[k] - m) ** 2, 0) / a.length); };
const ci = (a, k) => 1.96 * sd(a, k) / Math.sqrt(a.length);

const rows = Object.entries(arms).map(([name, a]) => ({
  method: name,
  'skill gaps / team': `${mean(a, 'gapsPerTeam').toFixed(2)} ±${ci(a, 'gapsPerTeam').toFixed(2)}`,
  'teams fully covered %': `${mean(a, 'fullCoveragePct').toFixed(1)} ±${ci(a, 'fullCoveragePct').toFixed(1)}`,
  'strength spread (SD)': `${mean(a, 'strengthSD').toFixed(2)} ±${ci(a, 'strengthSD').toFixed(2)}`,
}));
console.log(`Cohorts: ${RUNS} x ${N} synthetic participants, team size ${TEAM}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.table(rows);
require('fs').writeFileSync(__dirname + '/../simulation-results.json', JSON.stringify({ runs: RUNS, participants: N, teamSize: TEAM, results: rows }, null, 2));
