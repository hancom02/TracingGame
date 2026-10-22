// Unit test cho pickNextStation — tránh trạm đầy + rải đều (least-loaded)
// Dùng DB tạm riêng để không đụng dữ liệu thật.
const path = require('path');
const fs = require('fs');
const os = require('os');

const TMP = path.join(os.tmpdir(), 'htrace2-test-pick-' + process.pid + '.db');
process.env.DB_PATH = TMP;

const db = require('../db/database');
const { pickNextStation } = require('../lib/gameLogic');

let pass = 0, fail = 0;
const assert = (c, m) => c ? (pass++, console.log('  ✔', m)) : (fail++, console.error('  ✘ FAIL:', m));

function reset() {
  db.exec('DELETE FROM team_stations; DELETE FROM teams; DELETE FROM stations; DELETE FROM games;');
}
function mkGame() { return db.prepare("INSERT INTO games (name, total_slots, status) VALUES ('G', 10, 'active')").run().lastInsertRowid; }
function mkStation(gid, name, maxTeams, order) {
  return db.prepare("INSERT INTO stations (game_id, name, max_teams, is_private, challenge_type, display_order) VALUES (?,?,?,0,'none',?)")
    .run(gid, name, maxTeams, order).lastInsertRowid;
}
function mkTeam(gid, name, slot) {
  return db.prepare("INSERT INTO teams (game_id, name, slot_number, session_token, status) VALUES (?,?,?,?, 'playing')")
    .run(gid, name, slot, 'tok-' + name).lastInsertRowid;
}
function setActive(teamId, stationId) {
  db.prepare("INSERT INTO team_stations (team_id, station_id, status) VALUES (?,?, 'active')").run(teamId, stationId);
}

// --- Test 1: tránh trạm đầy, chọn trạm có chỗ ---
reset();
let gid = mkGame();
const sFull = mkStation(gid, 'Full', 1, 1);     // max 1
const sFree = mkStation(gid, 'Free', 2, 2);     // max 2
const target = mkTeam(gid, 'Target', 1);
const other = mkTeam(gid, 'Other', 2);
setActive(other, sFull);                         // Full đã đủ 1/1
let picks = new Set();
for (let i = 0; i < 20; i++) { const p = pickNextStation(db.prepare('SELECT * FROM teams WHERE id=?').get(target)); if (p) picks.add(p.name); }
assert(picks.size === 1 && picks.has('Free'), 'Bỏ qua trạm đầy, luôn chọn trạm còn chỗ (Free)');

// --- Test 2: least-loaded — ưu tiên trạm ít đội active nhất ---
reset();
gid = mkGame();
const a = mkStation(gid, 'A', 3, 1);
const b = mkStation(gid, 'B', 3, 2);
const c = mkStation(gid, 'C', 3, 3);
const t = mkTeam(gid, 'T', 1);
// A có 2 đội active, B có 1, C có 0 → phải chọn C
setActive(mkTeam(gid, 'x1', 2), a); setActive(mkTeam(gid, 'x2', 3), a);
setActive(mkTeam(gid, 'x3', 4), b);
picks = new Set();
for (let i = 0; i < 30; i++) { const p = pickNextStation(db.prepare('SELECT * FROM teams WHERE id=?').get(t)); if (p) picks.add(p.name); }
assert(picks.size === 1 && picks.has('C'), 'Ưu tiên trạm tải thấp nhất (C: 0 đội)');

// --- Test 3: nhiều trạm cùng mức thấp nhất → random trong số đó ---
reset();
gid = mkGame();
const p1 = mkStation(gid, 'P1', 3, 1);
const p2 = mkStation(gid, 'P2', 3, 2);
const p3 = mkStation(gid, 'P3', 3, 3);
const t3 = mkTeam(gid, 'T3', 1);
setActive(mkTeam(gid, 'y1', 2), p1);   // P1 tải 1, P2 & P3 tải 0
picks = new Set();
for (let i = 0; i < 60; i++) { const p = pickNextStation(db.prepare('SELECT * FROM teams WHERE id=?').get(t3)); if (p) picks.add(p.name); }
assert(!picks.has('P1') && picks.has('P2') && picks.has('P3'), 'Bỏ P1 (tải cao), random đều giữa P2 & P3 (cùng tải 0)');

// --- Test 4: đội đã đến trạm rồi thì không chọn lại ---
reset();
gid = mkGame();
const only = mkStation(gid, 'Only', 3, 1);
const t4 = mkTeam(gid, 'T4', 1);
db.prepare("INSERT INTO team_stations (team_id, station_id, status) VALUES (?,?, 'completed')").run(t4, only);
const res = pickNextStation(db.prepare('SELECT * FROM teams WHERE id=?').get(t4));
assert(res === null, 'Không còn trạm chưa đến → trả về null');

console.log(`\n=== PICK TEST: ${pass} passed, ${fail} failed ===`);
try { fs.unlinkSync(TMP); fs.unlinkSync(TMP + '-shm'); fs.unlinkSync(TMP + '-wal'); } catch {}
process.exit(fail ? 1 : 0);
