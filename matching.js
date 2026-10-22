/**
 * TeamForge matching engine  (pure functions, no database, fully testable)
 *
 * Idea: a hackathon team needs COVERAGE (someone who can do frontend, backend,
 * data, design, hardware, pitching) and teams should be FAIR (similar strength).
 * Registration collects the data; this module turns it into balanced teams and
 * explains every placement in plain words.
 */

const SKILLS = [
  { key: 'fe', label: 'Frontend' },
  { key: 'be', label: 'Backend' },
  { key: 'ml', label: 'Data / AI' },
  { key: 'ux', label: 'Design / UX' },
  { key: 'hw', label: 'Hardware / IoT' },
  { key: 'pm', label: 'Pitch / Domain' },
];
const THRESH = 3;      // a skill is "covered" when someone on the team is >= 3 (out of 5)
const LAMBDA = 1.5;    // weight of the fairness penalty (variance of team strength)
const UNVERIFIED = 0.85; // self-rating shrink when no quiz result is available

/** Effective skill level 0..5: average of self rating and quiz result when the quiz was taken. */
function effective(p) {
  const out = {};
  for (const { key } of SKILLS) {
    const self = Number((p.skills || {})[key]) || 0;
    const q = p.quiz && p.quiz[key] !== undefined ? Number(p.quiz[key]) : null;
    out[key] = q === null ? self * UNVERIFIED : (self + q) / 2;
  }
  return out;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (x) => Math.min(x, THRESH) + 0.15 * Math.min(x, 5); // concave: first 3 levels matter most

function coverage(members) {
  const best = {};
  for (const { key } of SKILLS) best[key] = 0;
  for (const m of members) for (const { key } of SKILLS) best[key] = Math.max(best[key], m.eff[key]);
  return best;
}
const covValue = (members) => { const c = coverage(members); return SKILLS.reduce((s, { key }) => s + f(c[key]), 0); };
const strength = (members) =>
  members.length ? members.reduce((s, m) => s + SKILLS.reduce((a, { key }) => a + m.eff[key], 0), 0) / members.length : 0;

/** Union-find: friends who named each other (or one-way) stay together if the pod fits. */
function makePods(people, maxSize) {
  const byEmail = new Map(people.map((p) => [p.email.toLowerCase(), p]));
  const parent = new Map(people.map((p) => [p.id, p.id]));
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  const size = new Map(people.map((p) => [p.id, 1]));
  for (const p of people) {
    const fe = (p.friendEmail || '').toLowerCase();
    const q = fe && byEmail.get(fe);
    if (!q || q.id === p.id) continue;
    const a = find(p.id), b = find(q.id);
    if (a !== b && size.get(a) + size.get(b) <= maxSize) {
      parent.set(a, b); size.set(b, size.get(a) + size.get(b));
    }
  }
  const pods = new Map();
  for (const p of people) {
    const r = find(p.id);
    if (!pods.has(r)) pods.set(r, []);
    pods.get(r).push(p);
  }
  return [...pods.values()];
}

/** Build balanced teams. people: [{id,email,skills,quiz,friendEmail}]. Returns array of arrays of people. */
function buildTeams(people, { teamSize = 4, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const n = people.length;
  if (!n) return [];
  const P = people.map((p) => ({ ...p, eff: effective(p) }));
  const k = Math.max(1, Math.round(n / teamSize));
  const caps = Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
  const maxCap = Math.max(...caps);

  const pods = makePods(P, maxCap).map((m) => ({ m, sz: m.length, s: strength(m) + rng() * 1e-6 }));
  pods.sort((a, b) => b.sz - a.sz || b.s - a.s);

  const teams = Array.from({ length: k }, (_, i) => ({ pods: [], cap: caps[i] }));
  const members = (t) => t.pods.flatMap((p) => p.m);
  for (const pod of pods) {
    let best = -1, bestGain = -Infinity;
    for (let i = 0; i < k; i++) {
      const cur = members(teams[i]);
      if (cur.length + pod.sz > teams[i].cap) continue;
      const gain = covValue([...cur, ...pod.m]) - covValue(cur) - 0.001 * cur.length;
      if (gain > bestGain) { bestGain = gain; best = i; }
    }
    if (best < 0) { // overflow fallback: emptiest team
      best = teams.reduce((b, t, i) => (members(t).length < members(teams[b]).length ? i : b), 0);
    }
    teams[best].pods.push(pod);
  }

  // Local search: swap equal-sized pods between teams while the global objective improves.
  const val = teams.map((t) => covValue(members(t)));
  const str = teams.map((t) => strength(members(t)));
  let S1 = str.reduce((a, b) => a + b, 0), S2 = str.reduce((a, b) => a + b * b, 0);
  const variance = (s1, s2) => s2 / k - (s1 / k) ** 2;
  for (let pass = 0; pass < 40; pass++) {
    let improved = false;
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) {
        for (let ia = 0; ia < teams[a].pods.length; ia++) {
          for (let ib = 0; ib < teams[b].pods.length; ib++) {
            const pa = teams[a].pods[ia], pb = teams[b].pods[ib];
            if (pa.sz !== pb.sz) continue;
            const ma = [...members(teams[a]).filter((x) => !pa.m.includes(x)), ...pb.m];
            const mb = [...members(teams[b]).filter((x) => !pb.m.includes(x)), ...pa.m];
            const nva = covValue(ma), nvb = covValue(mb), nsa = strength(ma), nsb = strength(mb);
            const ns1 = S1 - str[a] - str[b] + nsa + nsb;
            const ns2 = S2 - str[a] ** 2 - str[b] ** 2 + nsa ** 2 + nsb ** 2;
            const delta = nva + nvb - val[a] - val[b] - LAMBDA * (variance(ns1, ns2) - variance(S1, S2));
            if (delta > 1e-9) {
              teams[a].pods[ia] = pb; teams[b].pods[ib] = pa;
              val[a] = nva; val[b] = nvb; str[a] = nsa; str[b] = nsb; S1 = ns1; S2 = ns2;
              improved = true;
            }
          }
        }
      }
    }
    if (!improved) break;
  }
  return teams.map((t) => members(t));
}

function randomTeams(people, { teamSize = 4, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const P = people.map((p) => ({ ...p, eff: effective(p) }));
  for (let i = P.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  const k = Math.max(1, Math.round(P.length / teamSize));
  const teams = Array.from({ length: k }, () => []);
  P.forEach((p, i) => teams[i % k].push(p));
  return teams;
}

/** Quality metrics for a set of teams. Lower gaps / spread = better. */
function evaluate(teams) {
  let gaps = 0, full = 0;
  const str = [];
  for (const t of teams) {
    const c = coverage(t);
    const g = SKILLS.filter(({ key }) => c[key] < THRESH).length;
    gaps += g; if (g === 0) full++;
    str.push(strength(t));
  }
  const mean = str.reduce((a, b) => a + b, 0) / (str.length || 1);
  const sd = Math.sqrt(str.reduce((a, b) => a + (b - mean) ** 2, 0) / (str.length || 1));
  return { teams: teams.length, gaps, gapsPerTeam: gaps / (teams.length || 1), fullCoveragePct: (100 * full) / (teams.length || 1), strengthSD: sd };
}

/** Plain-language reasons shown to each participant. */
function explain(team, person) {
  const eff = person.eff || effective(person);
  const mates = team.filter((m) => m.id !== person.id);
  const reasons = [];
  for (const { key, label } of SKILLS) {
    if (eff[key] >= THRESH) {
      const others = mates.filter((m) => m.eff[key] >= THRESH).length;
      reasons.push(others === 0
        ? `You are the only teammate strong in ${label} (${eff[key].toFixed(1)}/5), so the team depends on you for it.`
        : `You share ${label} with ${others} teammate${others > 1 ? 's' : ''}, which gives the team a backup.`);
    }
  }
  const cov = coverage(team);
  const gaps = SKILLS.filter(({ key }) => cov[key] < THRESH).map((s) => s.label);
  const friend = person.friendEmail && mates.some((m) => m.email.toLowerCase() === person.friendEmail.toLowerCase());
  if (friend) reasons.push('Your requested teammate is in this team.');
  if (!reasons.length) reasons.push('You bring breadth rather than one standout skill - you help the team learn the skills it is missing.');
  return { reasons, teamGaps: gaps, learnFrom: SKILLS.filter(({ key }) => eff[key] < 2 && cov[key] >= THRESH).map((s) => s.label) };
}

/** Preview swapping person A (team ta) with person B (team tb). */
function swapPreview(ta, tb, a, b) {
  const na = [...ta.filter((m) => m.id !== a.id), b];
  const nb = [...tb.filter((m) => m.id !== b.id), a];
  const before = evaluate([ta, tb]), after = evaluate([na, nb]);
  return { before, after, allowed: after.gaps <= before.gaps, newTeams: [na, nb] };
}

module.exports = { SKILLS, THRESH, effective, buildTeams, randomTeams, evaluate, explain, coverage, strength, swapPreview, mulberry32 };
