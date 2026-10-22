# TeamForge

Skill-balanced hackathon registration (HTML5, CSS, JavaScript/DOM, jQuery, JSON, AngularJS, MongoDB, Node.js).
Full explanation, research gap, results and viva notes: **PROJECT_GUIDE.md**.

## Run
```
npm install
mongod                          # or set MONGO_URI to a MongoDB Atlas URI
node scripts/seed-demo.js 40    # demo data
node server.js                  # http://localhost:3000
mongosh teamforge mongo/books.mongosh.js
```

## Logins
| Who | Username / email | Password |
|---|---|---|
| **Organizer (admin)** | `organizer` | `Forge@2026` |
| Demo participant | `demo1@college.edu` (also demo2...demo40) | `demo123` |

The organizer logs in on the **Teams** page: click *Organizer access*. Credentials are hard-coded in `server.js`
(`ADMIN_USER`, `ADMIN_PASS`) because there is a single organizer.
