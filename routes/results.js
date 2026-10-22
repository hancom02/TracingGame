// Scores, leaderboard, monitoring
const express = require('express');
const db = require('../db/database');
const { isAdmin } = require('../middleware/auth');
const { getTeamByToken, teamTotalScore } = require('../lib/gameLogic');

const router = express.Router();

// ---- Bảng xếp hạng (public — player xem được) ----
router.get('/games/:id/leaderboard', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  const rows = db.prepare(`
    SELECT t.id, t.name, COALESCE(SUM(ts.score),0) AS total
    FROM teams t LEFT JOIN team_stations ts ON ts.team_id = t.id
    WHERE t.game_id = ?
    GROUP BY t.id
    ORDER BY total DESC, t.name ASC
  `).all(game.id);
  res.json({ leaderboard: rows.map((r, i) => ({ rank: i + 1, ...r })) });
});

// ---- Kết quả 1 đội: điểm từng trạm public + tổng (kể cả private) ----
router.get('/teams/:id/result', (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id=?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Không tìm thấy đội' });
  // Xác thực: hoặc là admin, hoặc là chính đội đó (token)
  const tokenTeam = getTeamByToken(req.get('x-session-token') || req.query.token);
  const isOwner = tokenTeam && tokenTeam.id === team.id;
  const isAdminReq = req.session && req.session.adminId;
  if (!isOwner && !isAdminReq) return res.status(403).json({ error: 'Không có quyền' });

  const publicStations = db.prepare(`
    SELECT s.id, s.name, s.unit, ts.score, ts.status, ts.score_updated_by
    FROM stations s
    LEFT JOIN team_stations ts ON ts.station_id = s.id AND ts.team_id = ?
    WHERE s.game_id = ? AND s.is_private = 0
    ORDER BY s.display_order, s.id
  `).all(team.id, team.game_id);

  res.json({
    team: { id: team.id, name: team.name, slot_number: team.slot_number },
    stations: publicStations,          // chỉ trạm public
    total_score: teamTotalScore(team.id), // gồm cả private
    game_id: team.game_id,
  });
});

// ---- Monitor theo trạm ----
router.get('/games/:id/monitor/stations', isAdmin, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  const stations = db.prepare('SELECT * FROM stations WHERE game_id=? ORDER BY display_order, id').all(game.id);
  const result = stations.map((s) => {
    const teams = db.prepare(`
      SELECT t.id AS team_id, t.name AS team_name, ts.status, ts.score, ts.answer, ts.score_updated_by, ts.visit_order
      FROM team_stations ts JOIN teams t ON t.id = ts.team_id
      WHERE ts.station_id = ?
      ORDER BY ts.status DESC, t.name
    `).all(s.id);
    return { station: { id: s.id, name: s.name, is_private: s.is_private, max_teams: s.max_teams, challenge_type: s.challenge_type }, teams };
  });
  res.json({ stations: result });
});

// ---- Monitor theo đội ----
router.get('/games/:id/monitor/teams', isAdmin, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Không tìm thấy game' });
  const totalPublic = db.prepare('SELECT COUNT(*) AS c FROM stations WHERE game_id=? AND is_private=0').get(game.id).c;
  const teams = db.prepare('SELECT * FROM teams WHERE game_id=? ORDER BY slot_number').all(game.id);
  const result = teams.map((t) => {
    const history = db.prepare(`
      SELECT s.name AS station_name, s.is_private, ts.status, ts.started_at, ts.completed_at, ts.score, ts.visit_order
      FROM team_stations ts JOIN stations s ON s.id = ts.station_id
      WHERE ts.team_id = ?
      ORDER BY ts.visit_order, ts.started_at
    `).all(t.id);
    const donePublic = history.filter((h) => !h.is_private && h.status === 'completed').length;
    const current = t.current_station_id
      ? db.prepare('SELECT name FROM stations WHERE id=?').get(t.current_station_id)
      : null;
    return {
      team: { id: t.id, name: t.name, slot_number: t.slot_number, status: t.status },
      history, total_score: teamTotalScore(t.id),
      done_public: donePublic, total_public: totalPublic,
      current_station: current ? current.name : null,
    };
  });
  res.json({ teams: result });
});

module.exports = router;
