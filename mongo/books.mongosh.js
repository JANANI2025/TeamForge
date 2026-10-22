// Component 7 - MongoDB 'books' collection (TeamForge Library: reading list for participants)
// Run in mongosh:   mongosh teamforge mongo/books.mongosh.js
// (or paste the commands one by one into mongosh after:  use teamforge)

// 0) Create the collection with a unique ISBN
db.books.drop();
db.createCollection('books');
db.books.createIndex({ isbn: 1 }, { unique: true });

// 1) Insert books  (fields: Title, ISBN(unique id), Authors, Publication, Year of Publication, Price)
//    + topic = the TeamForge skill key the book helps with (fe, be, ml, ux, hw, pm); the Library page uses it to recommend books for your team's gaps
db.books.insertMany([
  { title: 'The Pragmatic Programmer',      isbn: '978-0135957059', authors: ['Andrew Hunt', 'David Thomas'], publication: 'Addison-Wesley', year: 2019, price: 899 , topic: 'be' },
  { title: 'The Mythical Man-Month',        isbn: '978-0201835953', authors: ['Frederick P. Brooks Jr.'],     publication: 'Addison-Wesley', year: 1975, price: 650 , topic: 'pm' },
  { title: 'Peopleware',                    isbn: '978-0321934116', authors: ['Tom DeMarco', 'Timothy Lister'], publication: 'Addison-Wesley', year: 1987, price: 720 , topic: 'pm' },
  { title: 'Don\'t Make Me Think',          isbn: '978-0321965516', authors: ['Steve Krug'],                  publication: 'New Riders',     year: 2014, price: 540 , topic: 'ux' },
  { title: 'The Design of Everyday Things', isbn: '978-0465050659', authors: ['Don Norman'],                  publication: 'Basic Books',    year: 2013, price: 610 , topic: 'ux' },
  { title: 'Clean Code',                    isbn: '978-0132350884', authors: ['Robert C. Martin'],            publication: 'Prentice Hall',  year: 2008, price: 780 , topic: 'be' },
  { title: 'Hackers & Painters',            isbn: '978-1449389550', authors: ['Paul Graham'],                 publication: 'O\'Reilly',      year: 2004, price: 480 , topic: 'pm' },
]);

// 2) a) Insert a NEW document with MULTIPLE authors
db.books.insertOne({
  title: 'Designing Data-Intensive Applications', isbn: '978-1449373320',
  authors: ['Martin Kleppmann', 'Chris Riccomini'], publication: 'O\'Reilly', year: 2017, price: 1250, topic: 'ml',
});

// 3) b) Update a document with a change in price
db.books.updateOne({ isbn: '978-0132350884' }, { $set: { price: 695 } });

// 4) c) Remove documents with year of publication lesser than 1990
db.books.deleteMany({ year: { $lt: 1990 } });

// Check the result
printjson(db.books.find({}, { _id: 0, title: 1, year: 1, price: 1 }).toArray());
