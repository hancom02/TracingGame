// CRUD ngân hàng câu hỏi trắc nghiệm
const express = require('express');
const db = require('../db/database');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();
const ANSWERS = ['a', 'b', 'c', 'd'];

function validate(body) {
  const fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d'];
  for (const f of fields) {
    if (!body[f] || !String(body[f]).trim()) return `Thiếu trường: ${f}`;
  }
  if (!ANSWERS.includes(body.correct_answer)) return 'Phải chọn đáp án đúng (a/b/c/d)';
  return null;
}

// ---- List questions (admin) ----
router.get('/questions', isAdmin, (req, res) => {
  const gameId = req.query.game_id;
  if (!gameId) return res.status(400).json({ error: 'Thiếu game_id' });
  const questions = db.prepare(
    'SELECT * FROM question_bank WHERE game_id = ? ORDER BY id'
  ).all(gameId);
  res.json({ questions });
});

// ---- Create ----
router.post('/questions', isAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.game_id) return res.status(400).json({ error: 'Thiếu game_id' });
  const err = validate(b);
  if (err) return res.status(400).json({ error: err });
  const info = db.prepare(`
    INSERT INTO question_bank
      (game_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
    VALUES (?,?,?,?,?,?,?)
  `).run(b.game_id, b.question_text.trim(), b.option_a, b.option_b, b.option_c, b.option_d, b.correct_answer);
  res.status(201).json({ question: db.prepare('SELECT * FROM question_bank WHERE id=?').get(info.lastInsertRowid) });
});

// ---- Update ----
router.put('/questions/:id', isAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM question_bank WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
  const b = req.body || {};
  const err = validate(b);
  if (err) return res.status(400).json({ error: err });
  db.prepare(`
    UPDATE question_bank SET question_text=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_answer=?
    WHERE id=?
  `).run(b.question_text.trim(), b.option_a, b.option_b, b.option_c, b.option_d, b.correct_answer, req.params.id);
  res.json({ question: db.prepare('SELECT * FROM question_bank WHERE id=?').get(req.params.id) });
});

// ---- Delete ----
router.delete('/questions/:id', isAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM question_bank WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
  res.json({ ok: true });
});

module.exports = router;
