// Logic dùng chung giữa routes và socket handlers
const db = require('../db/database');

function getTeamByToken(token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM teams WHERE session_token = ?').get(token);
}

function teamTotalScore(teamId) {
  const row = db.prepare('SELECT COALESCE(SUM(score),0) AS total FROM team_stations WHERE team_id=?').get(teamId);
  return row.total;
}

// Số đội đang 'active' tại 1 trạm
function activeCountAt(stationId) {
  return db.prepare("SELECT COUNT(*) AS c FROM team_stations WHERE station_id=? AND status='active'").get(stationId).c;
}

// Chọn trạm public tiếp theo cho đội: chưa đến & còn chỗ (active < max_teams),
// ưu tiên rải đều — random trong nhóm trạm có số đội active THẤP NHẤT (least-loaded).
function pickNextStation(team) {
  const stations = db.prepare(
    "SELECT * FROM stations WHERE game_id=? AND is_private=0 ORDER BY display_order, id"
  ).all(team.game_id);
  const visited = new Set(
    db.prepare('SELECT station_id FROM team_stations WHERE team_id=?').all(team.id).map((r) => r.station_id)
  );
  // Ứng viên hợp lệ + tải hiện tại (số đội đang active)
  const candidates = [];
  for (const s of stations) {
    if (visited.has(s.id)) continue;
    const load = activeCountAt(s.id);
    if (load < s.max_teams) candidates.push({ s, load });
  }
  if (candidates.length === 0) return null;
  // Rải đều: chỉ giữ các trạm ở mức tải thấp nhất rồi random trong nhóm đó
  const minLoad = Math.min(...candidates.map((c) => c.load));
  const leastLoaded = candidates.filter((c) => c.load === minLoad);
  return leastLoaded[Math.floor(Math.random() * leastLoaded.length)].s;
}

// Còn trạm public nào đội chưa đến không (kể cả đang đầy)?
function hasUnvisitedPublicStation(team) {
  const total = db.prepare('SELECT COUNT(*) AS c FROM stations WHERE game_id=? AND is_private=0').get(team.game_id).c;
  const visited = db.prepare(
    "SELECT COUNT(DISTINCT ts.station_id) AS c FROM team_stations ts JOIN stations s ON s.id=ts.station_id WHERE ts.team_id=? AND s.is_private=0"
  ).get(team.id).c;
  return visited < total;
}

// Lấy 1 câu hỏi ngẫu nhiên trong ngân hàng của game (không kèm đáp án đúng)
function randomQuestion(gameId, excludeId) {
  const rows = db.prepare('SELECT * FROM question_bank WHERE game_id=?').all(gameId);
  const pool = excludeId ? rows.filter((q) => q.id !== Number(excludeId)) : rows;
  const list = pool.length ? pool : rows;
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function publicQuestion(q) {
  if (!q) return null;
  return {
    id: q.id, question_text: q.question_text,
    option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
  };
}

// Thông tin trạm hiển thị cho player
function stationForPlayer(s) {
  if (!s) return null;
  return {
    id: s.id, name: s.name, description: s.description,
    map_link: s.map_link, map_text: s.map_text, hint: s.hint,
    duration_seconds: s.duration_seconds, unit: s.unit, challenge_type: s.challenge_type,
    question: s.challenge_type === 'mcq' && s.question_id
      ? publicQuestion(db.prepare('SELECT * FROM question_bank WHERE id=?').get(s.question_id))
      : null,
  };
}

module.exports = {
  db, getTeamByToken, teamTotalScore, activeCountAt, pickNextStation,
  hasUnvisitedPublicStation, randomQuestion, publicQuestion, stationForPlayer,
};
