// CRUD stations
const express = require('express');
const db = require('../db/database');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

const CHALLENGE_TYPES = ['mcq', 'physical', 'none'];

function normalizeStation(body, existing = {}) {
  const challenge_type = CHALLENGE_TYPES.includes(body.challenge_type) ? body.challenge_type : 'none';
  return {
    name: (body.name || '').trim(),
    description: body.description || null,
    map_link: body.map_link || null,
    map_text: body.map_text || null,
    hint: body.hint || null,
    duration_seconds: Math.max(10, parseInt(body.duration_seconds, 10) || existing.duration_seconds || 300),
    max_teams: Math.max(1, parseInt(body.max_teams, 10) || existing.max_teams || 1),
    unit: body.unit || null,
    is_private: body.is_private ? 1 : 0,
    challenge_type,
    question_id: challenge_type === 'mcq' && body.question_id ? parseInt(body.question_id, 10) : null,
    display_order: parseInt(body.display_order, 10) || existing.display_order || 0,
  };
}

// ---- List stations (admin: theo game_id) ----
router.get('/stations', isAdmin, (req, res) => {
  const gameId = req.query.game_id;
  if (!gameId) return res.status(400).json({ error: 'Thiếu game_id' });
  const stations = db.prepare(
    'SELECT * FROM stations WHERE game_id = ? ORDER BY display_order, id'
  ).all(gameId);
  res.json({ stations });
});

// ---- Get single station ----
router.get('/stations/:id', isAdmin, (req, res) => {
  const station = db.prepare('SELECT * FROM stations WHERE id=?').get(req.params.id);
  if (!station) return res.status(404).json({ error: 'Không tìm thấy trạm' });
  res.json({ station });
});

// ---- Create station ----
router.post('/stations', isAdmin, (req, res) => {
  const { game_id } = req.body || {};
  if (!game_id) return res.status(400).json({ error: 'Thiếu game_id' });
  const s = normalizeStation(req.body);
  if (!s.name) return res.status(400).json({ error: 'Tên trạm là bắt buộc' });
  const info = db.prepare(`
    INSERT INTO stations
      (game_id, name, description, map_link, map_text, hint, duration_seconds,
       max_teams, unit, is_private, challenge_type, question_id, display_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(game_id, s.name, s.description, s.map_link, s.map_text, s.hint, s.duration_seconds,
    s.max_teams, s.unit, s.is_private, s.challenge_type, s.question_id, s.display_order);
  res.status(201).json({ station: db.prepare('SELECT * FROM stations WHERE id=?').get(info.lastInsertRowid) });
});

// ---- Update station ----
router.put('/stations/:id', isAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM stations WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy trạm' });
  const s = normalizeStation(req.body, existing);
  if (!s.name) return res.status(400).json({ error: 'Tên trạm là bắt buộc' });
  db.prepare(`
    UPDATE stations SET name=?, description=?, map_link=?, map_text=?, hint=?,
      duration_seconds=?, max_teams=?, unit=?, is_private=?, challenge_type=?,
      question_id=?, display_order=? WHERE id=?
  `).run(s.name, s.description, s.map_link, s.map_text, s.hint, s.duration_seconds,
    s.max_teams, s.unit, s.is_private, s.challenge_type, s.question_id, s.display_order, req.params.id);
  res.json({ station: db.prepare('SELECT * FROM stations WHERE id=?').get(req.params.id) });
});

// ---- Delete station ----
router.delete('/stations/:id', isAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM stations WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy trạm' });
  res.json({ ok: true });
});

module.exports = router;
