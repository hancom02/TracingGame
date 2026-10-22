// Socket.io — real-time: timer, confirm start, score, next station
const {
  db, getTeamByToken, teamTotalScore, pickNextStation,
  hasUnvisitedPublicStation, stationForPlayer,
} = require('../lib/gameLogic');

// Timer đang chạy: key = `${teamId}:${stationId}` → { interval }
const timers = new Map();
const timerKey = (t, s) => `${t}:${s}`;

// Yêu cầu bắt đầu ('requested') hết hiệu lực sau 60s nếu admin chưa xác nhận
const REQUEST_TTL_SECONDS = parseInt(process.env.REQUEST_TTL_SECONDS, 10) || 60;
const requestExpirySql = `datetime('now','-${REQUEST_TTL_SECONDS} seconds')`;

module.exports = function (io) {
  // Báo cho tất cả monitor của game refresh
  function notifyMonitors(gameId) {
    io.to(`game:${gameId}`).emit('monitor:refresh', { game_id: Number(gameId) });
  }

  // Dừng & xoá timer
  function stopTimer(teamId, stationId) {
    const key = timerKey(teamId, stationId);
    const t = timers.get(key);
    if (t) { clearInterval(t.interval); timers.delete(key); }
  }

  // Khởi động timer server-side cho (team, station)
  function startTimer(team, station) {
    stopTimer(team.id, station.id);
    const key = timerKey(team.id, station.id);
    const interval = setInterval(() => {
      const ts = db.prepare('SELECT * FROM team_stations WHERE team_id=? AND station_id=?').get(team.id, station.id);
      if (!ts || ts.status !== 'active' || !ts.started_at) { stopTimer(team.id, station.id); return; }
      const elapsed = Math.floor((Date.now() - Date.parse(ts.started_at + 'Z')) / 1000);
      const remaining = station.duration_seconds - elapsed;
      if (remaining <= 0) {
        // Hết giờ: khoá không cho player nhập nữa (chỉ admin), giữ điểm đã nhập
        db.prepare("UPDATE team_stations SET status='timeup' WHERE team_id=? AND station_id=? AND status='active'")
          .run(team.id, station.id);
        io.to(`team:${team.id}`).emit('timer:tick', { team_id: team.id, station_id: station.id, remaining: 0 });
        io.to(`team:${team.id}`).emit('timer:expired', { team_id: team.id, station_id: station.id });
        stopTimer(team.id, station.id);
        notifyMonitors(team.game_id);
      } else {
        io.to(`team:${team.id}`).emit('timer:tick', { team_id: team.id, station_id: station.id, remaining });
      }
    }, 1000);
    timers.set(key, { interval });
  }

  io.on('connection', (socket) => {
    // ---- Join rooms ----
    socket.on('player:join', ({ token }) => {
      const team = getTeamByToken(token);
      if (!team) return;
      socket.data.teamId = team.id;
      socket.data.gameId = team.game_id;
      socket.join(`game:${team.game_id}`);
      socket.join(`team:${team.id}`);
    });

    socket.on('admin:join_station', ({ station_id }) => {
      const st = db.prepare('SELECT * FROM stations WHERE id=?').get(station_id);
      if (!st) return;
      socket.join(`station:${station_id}`);
      socket.join(`game:${st.game_id}`);
      // Hydrate lại danh sách yêu cầu đang chờ (chưa hết hạn) — admin vừa vào trang hoặc vừa reload
      const pending = db.prepare(`
        SELECT ts.team_id AS team_id, t.name AS team_name
        FROM team_stations ts JOIN teams t ON t.id = ts.team_id
        WHERE ts.station_id=? AND ts.status='requested' AND ts.requested_at >= ${requestExpirySql}
      `).all(station_id);
      socket.emit('admin:pending_requests_snapshot', {
        station_id: Number(station_id),
        requests: pending.map(r => ({ team_id: Number(r.team_id), team_name: r.team_name })),
      });
    });

    socket.on('admin:join_game', ({ game_id }) => {
      socket.join(`game:${game_id}`);
    });

    // ---- Player yêu cầu bắt đầu trạm ----
    socket.on('team:request_start', ({ team_id, station_id }) => {
      const team = db.prepare('SELECT * FROM teams WHERE id=?').get(team_id);
      if (!team) return;
      const ts = db.prepare('SELECT * FROM team_stations WHERE team_id=? AND station_id=?').get(team_id, station_id);
      // Đã đang chơi/hết giờ/xong rồi thì không cho yêu cầu lại
      if (ts && ts.status !== 'pending' && ts.status !== 'requested') return;
      // Yêu cầu trước đó còn hiệu lực (< 60s) → bỏ qua, tránh spam-click tạo nhiều yêu cầu trùng
      const stillPending = db.prepare(`
        SELECT 1 FROM team_stations
        WHERE team_id=? AND station_id=? AND status='requested' AND requested_at >= ${requestExpirySql}
      `).get(team_id, station_id);
      if (stillPending) return;
      if (ts) {
        db.prepare("UPDATE team_stations SET status='requested', requested_at=datetime('now') WHERE team_id=? AND station_id=?")
          .run(team_id, station_id);
      } else {
        db.prepare("INSERT INTO team_stations (team_id, station_id, status, requested_at) VALUES (?,?, 'requested', datetime('now'))")
          .run(team_id, station_id);
      }
      io.to(`station:${station_id}`).emit('admin:start_requested', {
        team_id: Number(team_id), team_name: team.name, station_id: Number(station_id),
      });
      notifyMonitors(team.game_id);
    });

    // ---- Admin xác nhận bắt đầu → chạy timer ----
    socket.on('admin:confirm_start', ({ team_id, station_id }) => {
      const team = db.prepare('SELECT * FROM teams WHERE id=?').get(team_id);
      const station = db.prepare('SELECT * FROM stations WHERE id=?').get(station_id);
      if (!team || !station) return;
      let ts = db.prepare('SELECT * FROM team_stations WHERE team_id=? AND station_id=?').get(team_id, station_id);
      if (!ts) {
        db.prepare("INSERT INTO team_stations (team_id, station_id, status) VALUES (?,?, 'pending')").run(team_id, station_id);
      }
      db.prepare("UPDATE team_stations SET status='active', started_at=datetime('now') WHERE team_id=? AND station_id=?")
        .run(team_id, station_id);
      io.to(`team:${team_id}`).emit('start:confirmed', {
        team_id: Number(team_id), station_id: Number(station_id), duration: station.duration_seconds,
      });
      startTimer(team, station);
      io.to(`station:${station_id}`).emit('admin:team_started', { team_id: Number(team_id), station_id: Number(station_id) });
      notifyMonitors(team.game_id);
    });

    // ---- Player nộp điểm (chỉ khi timer còn chạy) ----
    socket.on('team:submit_score', ({ team_id, station_id, score }) => {
      const ts = db.prepare('SELECT * FROM team_stations WHERE team_id=? AND station_id=?').get(team_id, station_id);
      const team = db.prepare('SELECT * FROM teams WHERE id=?').get(team_id);
      const st = db.prepare('SELECT * FROM stations WHERE id=?').get(station_id);
      if (!ts || !team || !st) return;
      const elapsed = ts.started_at ? Math.floor((Date.now() - Date.parse(ts.started_at + 'Z')) / 1000) : 1e9;
      if (ts.status !== 'active' || elapsed >= st.duration_seconds) {
        io.to(`team:${team_id}`).emit('score:rejected', { team_id: Number(team_id), station_id: Number(station_id), reason: 'Hết thời gian, chỉ admin có thể nhập điểm' });
        return;
      }
      const val = parseInt(score, 10) || 0;
      db.prepare("UPDATE team_stations SET score=?, score_updated_by='team' WHERE team_id=? AND station_id=?")
        .run(val, team_id, station_id);
      io.to(`team:${team_id}`).emit('score:accepted', { team_id: Number(team_id), station_id: Number(station_id), score: val });
      io.to(`station:${station_id}`).emit('admin:score_submitted', { team_id: Number(team_id), team_name: team.name, station_id: Number(station_id), score: val });
      notifyMonitors(team.game_id);
    });

    // ---- Player trả lời câu hỏi MCQ tại trạm ----
    socket.on('team:answer_question', ({ team_id, station_id, answer }) => {
      const team = db.prepare('SELECT * FROM teams WHERE id=?').get(team_id);
      if (!team) return;
      db.prepare('UPDATE team_stations SET answer=? WHERE team_id=? AND station_id=?').run(answer, team_id, station_id);
      const station = db.prepare('SELECT * FROM stations WHERE id=?').get(station_id);
      let correct = null;
      if (station && station.question_id) {
        const q = db.prepare('SELECT correct_answer FROM question_bank WHERE id=?').get(station.question_id);
        if (q) correct = (q.correct_answer === answer);
      }
      io.to(`station:${station_id}`).emit('admin:answer_submitted', {
        team_id: Number(team_id), team_name: team.name, station_id: Number(station_id), answer, correct,
      });
      notifyMonitors(team.game_id);
    });

    // ---- Admin override điểm ----
    socket.on('admin:override_score', ({ team_id, station_id, score }) => {
      const team = db.prepare('SELECT * FROM teams WHERE id=?').get(team_id);
      const station = db.prepare('SELECT * FROM stations WHERE id=?').get(station_id);
      if (!team || !station) return;
      const val = parseInt(score, 10) || 0;
      db.prepare(`
        INSERT INTO team_stations (team_id, station_id, status, score, score_updated_by)
        VALUES (?,?, 'completed', ?, 'admin')
        ON CONFLICT(team_id, station_id) DO UPDATE SET score=excluded.score, score_updated_by='admin'
      `).run(team_id, station_id, val);
      io.to(`team:${team_id}`).emit('score:accepted', { team_id: Number(team_id), station_id: Number(station_id), score: val, by: 'admin' });
      io.to(`station:${station_id}`).emit('admin:score_submitted', { team_id: Number(team_id), team_name: team.name, station_id: Number(station_id), score: val, by: 'admin' });
      notifyMonitors(team.game_id);
    });

    // ---- Player xin sang trạm tiếp theo ----
    socket.on('team:request_next', ({ team_id }) => {
      const team = db.prepare('SELECT * FROM teams WHERE id=?').get(team_id);
      if (!team || !team.current_station_id) return;
      // Đánh dấu trạm hiện tại completed
      db.prepare("UPDATE team_stations SET status='completed', completed_at=datetime('now') WHERE team_id=? AND station_id=?")
        .run(team_id, team.current_station_id);
      stopTimer(team_id, team.current_station_id);

      if (!hasUnvisitedPublicStation(team)) {
        db.prepare("UPDATE teams SET status='finished', current_station_id=NULL WHERE id=?").run(team_id);
        io.to(`team:${team_id}`).emit('player:finished', { team_id: Number(team_id) });
        notifyMonitors(team.game_id);
        return;
      }
      const next = pickNextStation(team);
      if (!next) {
        // Còn trạm chưa đến nhưng đều đầy → chờ
        db.prepare("UPDATE teams SET current_station_id=NULL WHERE id=?").run(team_id);
        io.to(`team:${team_id}`).emit('next:waiting', { team_id: Number(team_id) });
        notifyMonitors(team.game_id);
        return;
      }
      const visitOrder = db.prepare('SELECT COUNT(*) AS c FROM team_stations WHERE team_id=?').get(team_id).c + 1;
      db.prepare("INSERT OR IGNORE INTO team_stations (team_id, station_id, status, visit_order) VALUES (?,?, 'pending', ?)")
        .run(team_id, next.id, visitOrder);
      db.prepare("UPDATE teams SET current_station_id=? WHERE id=?").run(next.id, team_id);
      io.to(`team:${team_id}`).emit('next:station', { team_id: Number(team_id), station: stationForPlayer(next) });
      notifyMonitors(team.game_id);
    });

    // ---- Admin end / reset game ----
    socket.on('admin:end_game', ({ game_id }) => {
      db.prepare("UPDATE games SET status='ended' WHERE id=?").run(game_id);
      db.prepare("UPDATE teams SET status='finished' WHERE game_id=?").run(game_id);
      io.to(`game:${game_id}`).emit('game:ended', { game_id: Number(game_id) });
    });

    socket.on('admin:reset_game', ({ game_id }) => {
      io.to(`game:${game_id}`).emit('game:reset', { game_id: Number(game_id) });
    });
  });

  // Quét định kỳ: yêu cầu 'requested' quá 60s admin chưa xác nhận → trả về 'pending' để player yêu cầu lại
  setInterval(() => {
    const expired = db.prepare(`
      SELECT team_id, station_id FROM team_stations
      WHERE status='requested' AND requested_at < ${requestExpirySql}
    `).all();
    for (const row of expired) {
      db.prepare("UPDATE team_stations SET status='pending' WHERE team_id=? AND station_id=? AND status='requested'")
        .run(row.team_id, row.station_id);
      io.to(`team:${row.team_id}`).emit('start:request_expired', { team_id: Number(row.team_id), station_id: Number(row.station_id) });
      io.to(`station:${row.station_id}`).emit('admin:request_expired', { team_id: Number(row.team_id), station_id: Number(row.station_id) });
    }
  }, 5000);
};
