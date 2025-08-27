const Database = require('better-sqlite3');
const db = new Database('data.sqlite');

// Initialize schema
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vin TEXT,
    rego TEXT,
    odometer TEXT,
    location TEXT,
    inspector_name TEXT,
    summary TEXT,
    score INTEGER,
    status TEXT DEFAULT 'draft'
  );
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id TEXT NOT NULL,
    section TEXT,
    label TEXT,
    rating TEXT,
    notes TEXT,
    photo_path TEXT,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
  );
`);

module.exports = db;
