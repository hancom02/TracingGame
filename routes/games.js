// CRUD game + QR + start/end/reset
const express = require('express');
const QRCode = require('qrcode');
const db = require('../db/database');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// ---- List games ----
router.get('/games', isAdmin, (req, res) => {
  const games = db.prepare('SELECT * FROM games ORDER BY created_at DESC').all();
  res.json({ games });
});

// ---- Get single game (public: player cần đọc info cơ bản) ----
router.get('/games/:id', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  res.json({ game });
});

// ---- Create game ----
router.post('/games', isAdmin, (req, res) => {
  const { name, banner_url, total_slots } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên game là bắt buộc' });
  const slots = Math.max(1, parseInt(total_slots, 10) || 10);
  const info = db.prepare(
    'INSERT INTO games (name, banner_url, total_slots, status) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), banner_url || null, slots, 'waiting');
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ game });
});

// ---- Update game ----
router.put('/games/:id', isAdmin, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  if (game.status === 'active') return res.status(400).json({ error: 'Không thể sửa khi game đang chạy' });
  const { name, banner_url, total_slots } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên game là bắt buộc' });
  const slots = Math.max(1, parseInt(total_slots, 10) || game.total_slots);
  db.prepare(
    "UPDATE games SET name=?, banner_url=?, total_slots=?, updated_at=datetime('now') WHERE id=?"
  ).run(name.trim(), banner_url || null, slots, req.params.id);
  res.json({ game: db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) });
});

// ---- Delete game ----
router.delete('/games/:id', isAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy game' });
  res.json({ ok: true });
});

// ---- QR code (base64 PNG) ----
router.get('/games/:id/qr', isAdmin, async (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  const host = `${req.protocol}://${req.get('host')}`;
  const url = `${host}/player/join.html?game_id=${game.id}`;
  const qr = await QRCode.toDataURL(url, { width: 400, margin: 1 });
  res.json({ url, qr });
});

// ---- Start / End / Reset ----
router.post('/games/:id/start', isAdmin, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  db.prepare("UPDATE games SET status='active', updated_at=datetime('now') WHERE id=?").run(game.id);
  req.app.get('io').to(`game:${game.id}`).emit('game:started', { game_id: Number(game.id) });
  res.json({ ok: true, status: 'active' });
});

router.post('/games/:id/end', isAdmin, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  db.prepare("UPDATE games SET status='ended', updated_at=datetime('now') WHERE id=?").run(game.id);
  db.prepare("UPDATE teams SET status='finished' WHERE game_id=?").run(game.id);
  req.app.get('io').to(`game:${game.id}`).emit('game:ended', { game_id: Number(game.id) });
  res.json({ ok: true, status: 'ended' });
});

router.post('/games/:id/reset', isAdmin, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  // Xóa toàn bộ team_stations của game này, đưa đội về 'waiting' (giữ slot & tên đội)
  db.prepare(`DELETE FROM team_stations WHERE team_id IN (SELECT id FROM teams WHERE game_id=?)`).run(game.id);
  db.prepare("UPDATE teams SET status='waiting', current_station_id=NULL WHERE game_id=?").run(game.id);
  db.prepare("UPDATE games SET status='waiting', updated_at=datetime('now') WHERE id=?").run(game.id);
  req.app.get('io').to(`game:${game.id}`).emit('game:reset', { game_id: Number(game.id) });
  res.json({ ok: true, status: 'waiting' });
});

module.exports = router;
