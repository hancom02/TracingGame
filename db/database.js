// Kết nối SQLite qua module built-in `node:sqlite` (Node >= 22.5, không cần native build).
// API tương thích better-sqlite3: prepare().get/all/run, exec().
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'htrace2.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Chạy schema (idempotent)
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Migration: CREATE TABLE IF NOT EXISTS không thêm cột mới vào bảng đã tồn tại
const tsColumns = db.prepare("PRAGMA table_info(team_stations)").all().map(c => c.name);
if (!tsColumns.includes('requested_at')) {
  db.exec('ALTER TABLE team_stations ADD COLUMN requested_at TEXT');
}

module.exports = db;
