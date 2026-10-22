// Player: join game, team state, game flow (intro question, stations)
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const {
  getTeamByToken, teamTotalScore, pickNextStation,
  randomQuestion, stationForPlayer,
} = require('../lib/gameLogic');

const router = express.Router();

function teamFromReq(req) {
  const token = req.get('x-session-token') || req.query.token || (req.body && req.body.token);
  return getTeamByToken(token);
}

// ---- Slots của game (public) ----
router.get('/games/:id/slots', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  const teams = db.prepare('SELECT slot_number, name FROM teams WHERE game_id=?').all(game.id);
  const taken = {};
  for (const t of teams) taken[t.slot_number] = t.name;
  res.json({ total_slots: game.total_slots, taken, game_status: game.status, game_name: game.name });
});

// Tìm slot trống có số nhỏ nhất trong game; null nếu đã đầy
function findSmallestFreeSlot(game) {
  const taken = new Set(
    db.prepare('SELECT slot_number FROM teams WHERE game_id=?').all(game.id).map(t => t.slot_number)
  );
  for (let i = 1; i <= game.total_slots; i++) {
    if (!taken.has(i)) return i;
  }
  return null;
}

// ---- Join game ----
router.post('/teams/join', (req, res) => {
  const { game_id, name } = req.body || {};
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(game_id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Tên đội là bắt buộc' });

  const nameTaken = db.prepare('SELECT id FROM teams WHERE game_id=? AND name=?').get(game_id, name.trim());
  if (nameTaken) return res.status(409).json({ error: 'Tên đội đã tồn tại, vui lòng chọn tên khác' });

  const slot = findSmallestFreeSlot(game);
  if (!slot) return res.status(409).json({ error: 'Tất cả đội đã tham gia đủ' });

  const token = uuidv4();
  const info = db.prepare(
    "INSERT INTO teams (game_id, name, slot_number, session_token, status) VALUES (?,?,?,?, 'waiting')"
  ).run(game_id, name.trim(), slot, token);
  const team = db.prepare('SELECT * FROM teams WHERE id=?').get(info.lastInsertRowid);
  res.status(201).json({ team, session_token: token });
});

// ---- Trạng thái đội hiện tại (restore/redirect) ----
router.get('/teams/me', (req, res) => {
  const team = teamFromReq(req);
  if (!team) return res.status(404).json({ error: 'Không tìm thấy đội (token không hợp lệ)' });
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(team.game_id);
  const total = db.prepare('SELECT COUNT(*) AS c FROM stations WHERE game_id=? AND is_private=0').get(team.game_id).c;
  const done = db.prepare(
    "SELECT COUNT(*) AS c FROM team_stations ts JOIN stations s ON s.id=ts.station_id WHERE ts.team_id=? AND s.is_private=0 AND ts.status='completed'"
  ).get(team.id).c;
  res.json({
    team, game_status: game ? game.status : null,
    total_public: total, completed_public: done, total_score: teamTotalScore(team.id),
  });
});

// ---- Câu hỏi intro (ngẫu nhiên, không kèm đáp án) ----
router.get('/games/:id/intro-question', (req, res) => {
  const exclude = req.query.exclude;
  const q = randomQuestion(req.params.id, exclude);
  if (!q) return res.status(404).json({ error: 'Game chưa có câu hỏi trong ngân hàng' });
  res.json({ question: { id: q.id, question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d } });
});

// ---- Kiểm tra đáp án intro → nếu đúng, gán trạm đầu tiên ----
router.post('/teams/:id/verify-answer', (req, res) => {
  const team = teamFromReq(req);
  if (!team || String(team.id) !== String(req.params.id)) {
    return res.status(403).json({ error: 'Không hợp lệ' });
  }
  const { question_id, answer } = req.body || {};
  const q = db.prepare('SELECT * FROM question_bank WHERE id=?').get(question_id);
  if (!q) return res.status(404).json({ error: 'Câu hỏi không tồn tại' });

  if (q.correct_answer !== answer) {
    const nq = randomQuestion(team.game_id, question_id);
    return res.json({
      correct: false,
      next_question: nq ? { id: nq.id, question_text: nq.question_text, option_a: nq.option_a, option_b: nq.option_b, option_c: nq.option_c, option_d: nq.option_d } : null,
    });
  }

  // Đúng → chọn trạm đầu tiên
  const station = pickNextStation(team);
  if (!station) {
    return res.json({ correct: true, station: null, message: 'Hiện chưa có trạm public khả dụng, vui lòng chờ.' });
  }
  db.prepare(
    "INSERT OR IGNORE INTO team_stations (team_id, station_id, status, visit_order) VALUES (?,?, 'pending', ?)"
  ).run(team.id, station.id, 1);
  db.prepare("UPDATE teams SET status='playing', current_station_id=? WHERE id=?").run(station.id, team.id);
  res.json({ correct: true, station: stationForPlayer(station) });
});

// ---- Lấy trạm hiện tại của đội ----
router.get('/teams/:id/current-station', (req, res) => {
  const team = teamFromReq(req);
  if (!team || String(team.id) !== String(req.params.id)) return res.status(403).json({ error: 'Không hợp lệ' });
  if (!team.current_station_id) return res.json({ station: null });
  const station = db.prepare('SELECT * FROM stations WHERE id=?').get(team.current_station_id);
  const ts = db.prepare('SELECT * FROM team_stations WHERE team_id=? AND station_id=?').get(team.id, team.current_station_id);
  res.json({ station: stationForPlayer(station), team_station: ts });
});

module.exports = router;
