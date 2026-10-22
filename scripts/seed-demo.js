/**
 * Loads DEMO data (synthetic people, wallet accounts, books) so you can try the app.
 *   node scripts/seed-demo.js [count]
 * All demo participants have the password "demo123".  Safe to re-run (it clears the demo db first).
 */
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const { SKILLS, mulberry32 } = require('../matching');

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const COUNT = Number(process.argv[2]) || 40;
const first = ['Aarav', 'Diya', 'Karthik', 'Meena', 'Rohan', 'Sneha', 'Vikram', 'Anjali', 'Arjun', 'Lakshmi', 'Nikhil', 'Priya', 'Suresh', 'Divya', 'Harish', 'Kavya', 'Manoj', 'Nithya', 'Pranav', 'Ritika'];
const last = ['Kumar', 'Raj', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Sharma', 'Das', 'Pillai', 'Gupta'];
const colleges = ['PSG Tech', 'Anna University', 'VIT', 'SRM', 'NIT Trichy', 'Amrita'];
const cities = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Vellore'];

function hashPw(pw) { const s = crypto.randomBytes(8).toString('hex'); return `${s}:${crypto.scryptSync(pw, s, 32).toString('hex')}`; }

(async () => {
  const client = new MongoClient(URI); await client.connect();
  const db = client.db(process.env.DB_NAME || 'teamforge');
  for (const c of ['participants', 'accounts', 'teams', 'transactions', 'books']) await db.collection(c).deleteMany({});
  await db.collection('participants').createIndex({ email: 1 }, { unique: true });
  await db.collection('accounts').createIndex({ accountNo: 1 }, { unique: true });
  await db.collection('books').createIndex({ isbn: 1 }, { unique: true });
  const rng = mulberry32(2026), pw = hashPw('demo123');
  const parts = [], accts = [];
  for (let i = 0; i < COUNT; i++) {
    const primary = Math.floor(rng() * 6), secondary = Math.floor(rng() * 6);
    const skills = {};
    SKILLS.forEach(({ key }, idx) => { skills[key] = idx === primary ? 3 + Math.floor(rng() * 3) : idx === secondary ? 2 + Math.floor(rng() * 2) : Math.floor(rng() * 3); });
    const name = `${first[i % first.length]} ${last[Math.floor(rng() * last.length)]}`;
    const accountNo = 'TF' + String(10000000 + i * 7919);
    parts.push({
      _id: 'P' + String(1000 + i), name, email: `demo${i + 1}@college.edu`, phone: '98' + String(10000000 + Math.floor(rng() * 8e7)),
      dob: '2004-0' + (1 + (i % 9)) + '-1' + (i % 9), college: colleges[Math.floor(rng() * colleges.length)], year: String(1 + (i % 4)),
      city: cities[Math.floor(rng() * cities.length)], zip: String(60000 + Math.floor(rng() * 9999)), track: ['Web', 'AI', 'IoT', 'Social'][i % 4],
      skills, quiz: i % 3 === 0 ? null : { ...skills }, friendEmail: '', tools: [], password: pw, accountNo, feePaid: false, teamId: null, createdAt: new Date(),
    });
    accts.push({ accountNo, owner: 'P' + (1000 + i), balance: 500, createdAt: new Date() });
  }
  await db.collection('participants').insertMany(parts);
  await db.collection('accounts').insertMany(accts);
  await db.collection('books').insertMany([
    { title: 'Eloquent JavaScript', isbn: '978-1593279509', authors: ['Marijn Haverbeke'], publication: 'No Starch Press', year: 2018, price: 650, topic: 'fe' },
    { title: 'The Pragmatic Programmer', isbn: '978-0135957059', authors: ['Andrew Hunt', 'David Thomas'], publication: 'Addison-Wesley', year: 2019, price: 899, topic: 'be' },
    { title: 'Clean Code', isbn: '978-0132350884', authors: ['Robert C. Martin'], publication: 'Prentice Hall', year: 2008, price: 695, topic: 'be' },
    { title: 'Designing Data-Intensive Applications', isbn: '978-1449373320', authors: ['Martin Kleppmann', 'Chris Riccomini'], publication: "O'Reilly", year: 2017, price: 1250, topic: 'ml' },
    { title: 'Hands-On Machine Learning', isbn: '978-1492032649', authors: ['Aurelien Geron'], publication: "O'Reilly", year: 2019, price: 1500, topic: 'ml' },
    { title: "Don't Make Me Think", isbn: '978-0321965516', authors: ['Steve Krug'], publication: 'New Riders', year: 2014, price: 540, topic: 'ux' },
    { title: 'Arduino Workshop', isbn: '978-1593274481', authors: ['John Boxall'], publication: 'No Starch Press', year: 2013, price: 700, topic: 'hw' },
    { title: 'Hackers & Painters', isbn: '978-1449389550', authors: ['Paul Graham'], publication: "O'Reilly", year: 2004, price: 480, topic: 'pm' },
  ]);
  console.log(`Seeded ${COUNT} demo participants (password demo123), ${COUNT} wallet accounts, 8 books.`);
  await client.close();
})();
