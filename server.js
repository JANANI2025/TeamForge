/**
 * TeamForge - Node.js + Express + MongoDB backend
 *  - serves the static front-end in /public
 *  - REST API: register, login, teams, swap, wallet debit, library
 * Run:  MONGO_URI=mongodb://127.0.0.1:27017 node server.js
 */
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { MongoClient } = require('mongodb');
const M = require('./matching');

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'teamforge';
// Single organizer account, hard-coded on purpose (see README). Override with env vars if you like.
const ADMIN_USER = process.env.ADMIN_USER || 'organizer';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Forge@2026';
const adminTokens = new Set();
const PORT = process.env.PORT || 3000;
const ZIP_LEN = 5;            // the assignment asks for exactly five digits
const FEE = 200;              // registration fee in rupees
const WELCOME_BALANCE = 5000;  // demo wallet credit

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;
const sessions = new Map(); // token -> participant id (in-memory: fine for a demo)

// ---------- helpers ----------
const hashPw = (pw, salt = crypto.randomBytes(8).toString('hex')) =>
  `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
const checkPw = (pw, stored) => {
  const [salt, h] = stored.split(':');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), crypto.scryptSync(pw, salt, 32));
};
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: 'Server error' }); });
const pub = (p) => ({ id: p._id, name: p.name, college: p.college, city: p.city });
const toPerson = (p) => ({ id: String(p._id), email: p.email, skills: p.skills, quiz: p.quiz, friendEmail: p.friendEmail, name: p.name, college: p.college });

function validate(b) {
  const e = {};
  const need = ['name', 'email', 'phone', 'dob', 'college', 'year', 'city', 'zip', 'track', 'password'];
  for (const k of need) if (!b[k] || String(b[k]).trim() === '') e[k] = 'Required';
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email)) e.email = 'Invalid email';
  if (b.zip && !new RegExp(`^\\d{${ZIP_LEN}}$`).test(String(b.zip))) e.zip = `Zip must be exactly ${ZIP_LEN} digits`;
  if (b.phone && !/^\d{10}$/.test(String(b.phone))) e.phone = 'Phone must be 10 digits';
  if (b.password && String(b.password).length < 6) e.password = 'At least 6 characters';
  if (!b.agree) e.agree = 'You must accept the rules';
  for (const { key } of M.SKILLS) {
    const v = Number((b.skills || {})[key]);
    if (!(v >= 0 && v <= 5)) e['skill_' + key] = 'Skill must be 0-5';
  }
  return e;
}

async function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const id = sessions.get(t);
  if (!id) return res.status(401).json({ error: 'Please log in' });
  req.user = await db.collection('participants').findOne({ _id: id });
  if (!req.user) return res.status(401).json({ error: 'Please log in' });
  next();
}
const admin = (req, res, next) => (adminTokens.has(req.headers['x-admin-token']) ? next() : res.status(403).json({ error: 'Organizer login required' }));
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const a = Buffer.from(String(password || '')), b = Buffer.from(ADMIN_PASS);
  const okPw = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (username !== ADMIN_USER || !okPw) return res.status(401).json({ error: 'Wrong organizer username or password' });
  const t = crypto.randomBytes(16).toString('hex'); adminTokens.add(t); res.json({ token: t });
});
app.get('/api/admin/summary', admin, wrap(async (req, res) => {
  const c = db.collection('participants');
  res.json({ participants: await c.countDocuments(), feePaid: await c.countDocuments({ feePaid: true }), verified: await c.countDocuments({ quiz: { $ne: null } }), teams: await db.collection('teams').countDocuments() });
}));

async function loadTeams() {
  const parts = await db.collection('participants').find({}).toArray();
  const byId = new Map(parts.map((p) => [String(p._id), { ...toPerson(p), eff: M.effective(p) }]));
  const teams = await db.collection('teams').find({}).sort({ _id: 1 }).toArray();
  return teams.map((t) => ({ ...t, people: t.members.map((id) => byId.get(String(id))).filter(Boolean) }));
}

// ---------- registration & login (Components 1, 4, 5 talk to these) ----------
app.post('/api/register', wrap(async (req, res) => {
  const b = req.body || {};
  const errors = validate(b);
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  const email = b.email.trim().toLowerCase();
  if (await db.collection('participants').findOne({ email })) return res.status(409).json({ errors: { email: 'Already registered' } });
  const accountNo = 'TF' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const doc = {
    _id: 'P' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    name: b.name.trim(), email, phone: b.phone, dob: b.dob, college: b.college.trim(), year: b.year,
    city: b.city.trim(), zip: String(b.zip), track: b.track, website: b.website || '', color: b.color || '',
    gender: b.gender || '', diet: b.diet || '', bio: (b.bio || '').slice(0, 500),
    tools: Array.isArray(b.tools) ? b.tools : [],
    skills: Object.fromEntries(M.SKILLS.map(({ key }) => [key, Number(b.skills[key])])),
    quiz: b.quiz && typeof b.quiz === 'object' ? b.quiz : null,
    friendEmail: (b.friendEmail || '').trim().toLowerCase(),
    password: hashPw(b.password), accountNo, feePaid: false, teamId: null, createdAt: new Date(),
  };
  await db.collection('participants').insertOne(doc);
  await db.collection('accounts').insertOne({ accountNo, owner: doc._id, balance: WELCOME_BALANCE, createdAt: new Date() });
  const token = crypto.randomBytes(16).toString('hex'); sessions.set(token, doc._id); // auto-login so the password is used straight away
  res.status(201).json({ id: doc._id, name: doc.name, token, accountNo, fee: FEE, welcomeBalance: WELCOME_BALANCE });
}));

app.post('/api/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const p = email && (await db.collection('participants').findOne({ email: String(email).toLowerCase() }));
  if (!p || !password || !checkPw(String(password), p.password)) return res.status(401).json({ error: 'Wrong email or password' });
  const token = crypto.randomBytes(16).toString('hex');
  sessions.set(token, p._id);
  res.json({ token, name: p.name, id: p._id, accountNo: p.accountNo });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  const { password, ...rest } = req.user;
  res.json(rest);
}));

// ---------- teams ----------
app.post('/api/admin/build', admin, wrap(async (req, res) => {
  const teamSize = Math.min(8, Math.max(2, Number(req.body.teamSize) || 5));
  const parts = await db.collection('participants').find({}).toArray();
  if (parts.length < 2) return res.status(400).json({ error: 'Need at least 2 participants' });
  const people = parts.map(toPerson);
  const seed = Number(req.body.seed) || 1;
  const built = M.buildTeams(people, { teamSize, seed });
  const rnd = M.randomTeams(people, { teamSize, seed });
  const names = ['Atlas', 'Beacon', 'Comet', 'Delta', 'Echo', 'Flux', 'Gamma', 'Helix', 'Ion', 'Jade', 'Kilo', 'Lumen', 'Nova', 'Orbit', 'Pulse', 'Quark', 'Relay', 'Sigma', 'Titan', 'Unity'];
  await db.collection('teams').deleteMany({});
  const docs = built.map((t, i) => ({ _id: 'T' + (i + 1), name: `Team ${names[i % names.length]}${i >= names.length ? i : ''}`, members: t.map((m) => m.id) }));
  if (docs.length) await db.collection('teams').insertMany(docs);
  await db.collection('participants').updateMany({}, { $set: { teamId: null } });
  for (const d of docs) await db.collection('participants').updateMany({ _id: { $in: d.members } }, { $set: { teamId: d._id } });
  res.json({ teams: docs.length, ours: M.evaluate(built), randomBaseline: M.evaluate(rnd) });
}));

app.get('/api/teams', wrap(async (req, res) => {
  const teams = await loadTeams();
  res.json(teams.map((t) => {
    const cov = M.coverage(t.people);
    return {
      id: t._id, name: t.name,
      members: t.people.map((p) => ({ id: p.id, name: p.name, college: p.college })),
      coverage: M.SKILLS.map(({ key, label }) => ({ key, label, level: Math.round(cov[key] * 10) / 10, ok: cov[key] >= M.THRESH })),
      strength: Math.round(M.strength(t.people) * 10) / 10,
    };
  }));
}));

app.get('/api/teams/mine', auth, wrap(async (req, res) => {
  const teams = await loadTeams();
  const t = teams.find((x) => x._id === req.user.teamId);
  if (!t) return res.json({ team: null });
  const me = t.people.find((p) => p.id === String(req.user._id));
  const cov = M.coverage(t.people);
  res.json({ team: t._id, name: t.name, members: t.people.map((p) => ({ id: p.id, name: p.name })), explanation: M.explain(t.people, me), gapKeys: M.SKILLS.filter(({ key }) => cov[key] < M.THRESH).map((x) => x.key) });
}));

// Hybrid phase: a participant proposes a swap; allowed only if it does not create new skill gaps.
app.post('/api/swap', auth, wrap(async (req, res) => {
  const { withId, apply } = req.body || {};
  const teams = await loadTeams();
  const ta = teams.find((t) => t.people.some((p) => p.id === String(req.user._id)));
  const tb = teams.find((t) => t.people.some((p) => p.id === withId));
  if (!ta || !tb || ta._id === tb._id) return res.status(400).json({ error: 'Pick a member of a different team' });
  const a = ta.people.find((p) => p.id === String(req.user._id)), b = tb.people.find((p) => p.id === withId);
  const r = M.swapPreview(ta.people, tb.people, a, b);
  const out = { allowed: r.allowed, before: r.before, after: r.after, applied: false };
  if (apply && r.allowed) {
    await db.collection('teams').updateOne({ _id: ta._id }, { $set: { members: r.newTeams[0].map((m) => m.id) } });
    await db.collection('teams').updateOne({ _id: tb._id }, { $set: { members: r.newTeams[1].map((m) => m.id) } });
    await db.collection('participants').updateOne({ _id: a.id }, { $set: { teamId: tb._id } });
    await db.collection('participants').updateOne({ _id: b.id }, { $set: { teamId: ta._id } });
    out.applied = true;
  }
  res.json(out);
}));

app.get('/api/stats', wrap(async (req, res) => {
  const participants = await db.collection('participants').countDocuments();
  const teams = await db.collection('teams').countDocuments();
  res.json({ participants, teams, fee: FEE });
}));

// ---------- Component 8: Node.js debit operation ----------
app.get('/api/account/:no', wrap(async (req, res) => {
  const a = await db.collection('accounts').findOne({ accountNo: req.params.no });
  if (!a) return res.status(404).json({ error: 'Account not found' });
  res.json({ accountNo: a.accountNo, balance: a.balance });
}));

app.get('/api/transactions/:no', wrap(async (req, res) => {
  res.json(await db.collection('transactions').find({ accountNo: req.params.no }).sort({ at: -1 }).limit(10).toArray());
}));

app.post('/api/debit', wrap(async (req, res) => {
  const accountNo = String((req.body || {}).accountNo || '').trim();
  const amount = Number((req.body || {}).amount);
  if (!accountNo) return res.status(400).json({ error: 'Account number is required' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
  const purpose = String((req.body || {}).purpose || 'debit').slice(0, 80);
  // Single atomic update: debit only if the balance is enough (no race between check and update).
  const r = await db.collection('accounts').findOneAndUpdate(
    { accountNo, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { returnDocument: 'after' });
  const doc = r && (r.value !== undefined ? r.value : r);
  if (!doc || doc.accountNo === undefined) {
    const exists = await db.collection('accounts').findOne({ accountNo });
    return res.status(exists ? 402 : 404).json({ error: exists ? 'Insufficient balance' : 'Account not found', balance: exists ? exists.balance : undefined });
  }
  await db.collection('transactions').insertOne({ accountNo, type: 'debit', amount, purpose, balanceAfter: doc.balance, at: new Date() });
  if (/registration fee/i.test(purpose)) await db.collection('participants').updateOne({ accountNo }, { $set: { feePaid: true } });
  res.json({ ok: true, accountNo, debited: amount, balance: doc.balance });
}));

// ---------- Component 7: MongoDB 'books' collection (read side; writes are in mongo/books.mongosh.js) ----------
app.get('/api/books', wrap(async (req, res) => {
  res.json(await db.collection('books').find({}).sort({ year: 1 }).toArray());
}));

// ---------- start ----------
async function start() {
  const client = new MongoClient(URI);
  await client.connect();
  db = client.db(DB_NAME);
  await db.collection('participants').createIndex({ email: 1 }, { unique: true });
  await db.collection('accounts').createIndex({ accountNo: 1 }, { unique: true });
  await db.collection('books').createIndex({ isbn: 1 }, { unique: true });
  app.listen(PORT, () => console.log(`TeamForge running at http://localhost:${PORT}  (db: ${DB_NAME})`));
}
if (require.main === module) start().catch((e) => { console.error('Could not start:', e.message); process.exit(1); });
module.exports = { app, validate };
