const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'apexcart.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite Database:', err);
  } else {
    console.log('Connected to ApexCart SQLite Database.');
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

module.exports = db;
