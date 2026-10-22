// Integration test — chạy full flow admin + player + trạm private (tasks 12.4/12.5/12.6)
// Yêu cầu server đang chạy ở BASE (mặc định http://localhost:3555)
const { io } = require('socket.io-client');

const BASE = process.env.BASE || 'http://localhost:3555';
let cookie = '';
let pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✔', msg); }
  else { fail++; console.error('  ✘ FAIL:', msg); }
}

async function req(method, path, body, useCookie = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useCookie && cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setC = res.headers.get('set-cookie');
  if (setC) cookie = setC.split(';')[0];
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function preq(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['x-session-token'] = token;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function connectSocket() {
  return new Promise((resolve) => {
    const s = io(BASE, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting ' + ev)), timeout);
    sock.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });
}

(async () => {
  console.log('\n=== ADMIN FLOW (12.5) ===');
  let r = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert(r.status === 200, 'admin login');

  r = await req('POST', '/api/games', { name: 'Test Game', total_slots: 4 });
  const gameId = r.data.game.id;
  assert(!!gameId, 'tạo game #' + gameId);

  // 2 câu hỏi
  const q1 = (await req('POST', '/api/questions', { game_id: gameId, question_text: '1+1=?', option_a: '1', option_b: '2', option_c: '3', option_d: '4', correct_answer: 'b' })).data.question;
  await req('POST', '/api/questions', { game_id: gameId, question_text: 'Thủ đô VN?', option_a: 'HCM', option_b: 'Huế', option_c: 'Hà Nội', option_d: 'Đà Nẵng', correct_answer: 'c' });
  assert(!!q1.id, 'tạo câu hỏi intro');

  // 2 trạm public + 1 private
  const st1 = (await req('POST', '/api/stations', { game_id: gameId, name: 'Trạm A', duration_seconds: 10, max_teams: 2, unit: 'điểm', challenge_type: 'none' })).data.station;
  const st2 = (await req('POST', '/api/stations', { game_id: gameId, name: 'Trạm B', duration_seconds: 10, max_teams: 2, challenge_type: 'mcq', question_id: q1.id })).data.station;
  const stP = (await req('POST', '/api/stations', { game_id: gameId, name: 'Trạm Bí Mật', is_private: true, challenge_type: 'none' })).data.station;
  assert(st1 && st2 && stP, 'tạo 2 trạm public + 1 private');

  r = await req('GET', '/api/games/' + gameId + '/qr');
  assert(r.data.qr && r.data.qr.startsWith('data:image/png'), 'QR code base64');

  r = await req('POST', '/api/games/' + gameId + '/start');
  assert(r.data.status === 'active', 'start game');

  console.log('\n=== PLAYER FLOW (12.4) ===');
  // Team 1 join → tự động nhận slot trống nhỏ nhất (1)
  r = await preq('POST', '/api/teams/join', { game_id: gameId, name: 'Đội Sấm Sét' });
  const t1 = r.data.team; const tok1 = r.data.session_token;
  assert(!!tok1 && t1.slot_number === 1, 'team1 join → tự động gán slot 1');

  // tên trùng bị chặn
  r = await preq('POST', '/api/teams/join', { game_id: gameId, name: 'Đội Sấm Sét' });
  assert(r.status === 409, 'chặn tên đội trùng');

  // team2 join → tự động nhận slot trống nhỏ nhất tiếp theo (2), không cần chọn
  r = await preq('POST', '/api/teams/join', { game_id: gameId, name: 'Đội Khác' });
  assert(r.data.team && r.data.team.slot_number === 2, 'team2 join → tự động gán slot 2');

  // intro question sai → có câu mới
  r = await preq('POST', '/api/teams/' + t1.id + '/verify-answer', { question_id: q1.id, answer: 'a' }, tok1);
  assert(r.data.correct === false && r.data.next_question, 'trả lời sai → hỏi lại');

  // intro đúng → nhận trạm đầu
  r = await preq('POST', '/api/teams/' + t1.id + '/verify-answer', { question_id: q1.id, answer: 'b' }, tok1);
  assert(r.data.correct === true && r.data.station, 'trả lời đúng → nhận trạm đầu: ' + (r.data.station && r.data.station.name));
  let curStation = r.data.station;

  // Socket: player + admin trực trạm
  const pSock = await connectSocket();
  pSock.emit('player:join', { token: tok1 });
  const aSock = await connectSocket();
  aSock.emit('admin:join_station', { station_id: curStation.id });
  await wait(200);

  // request start → admin nhận
  const reqStartP = once(aSock, 'admin:start_requested');
  pSock.emit('team:request_start', { team_id: t1.id, station_id: curStation.id });
  const rs = await reqStartP;
  assert(rs.team_id === t1.id, 'admin nhận yêu cầu bắt đầu');

  // admin confirm → player nhận start:confirmed + timer
  const confP = once(pSock, 'start:confirmed');
  aSock.emit('admin:confirm_start', { team_id: t1.id, station_id: curStation.id });
  const conf = await confP;
  assert(conf.duration === curStation.duration_seconds, 'start:confirmed + duration');

  const tick = await once(pSock, 'timer:tick');
  assert(typeof tick.remaining === 'number', 'timer:tick nhận được (remaining=' + tick.remaining + ')');

  // player nộp điểm trong giờ
  const scoreP = once(pSock, 'score:accepted');
  pSock.emit('team:submit_score', { team_id: t1.id, station_id: curStation.id, score: 80 });
  const sc = await scoreP;
  assert(sc.score === 80, 'player nộp điểm 80 trong giờ');

  // chờ timer hết (theo duration thực tế của trạm)
  const expP = once(pSock, 'timer:expired', (curStation.duration_seconds + 4) * 1000);
  await expP;
  assert(true, 'timer:expired sau khi hết giờ');

  // nộp điểm sau giờ → bị từ chối
  const rejP = once(pSock, 'score:rejected');
  pSock.emit('team:submit_score', { team_id: t1.id, station_id: curStation.id, score: 999 });
  const rej = await rejP;
  assert(!!rej.reason, 'từ chối nộp điểm sau giờ');

  // sang trạm tiếp
  const nextP = once(pSock, 'next:station');
  pSock.emit('team:request_next', { team_id: t1.id });
  const nx = await nextP;
  assert(!!nx.station && nx.station.id !== curStation.id, 'nhận trạm tiếp theo: ' + nx.station.name);
  curStation = nx.station;

  // hoàn thành trạm 2 nhanh (admin confirm rồi next → finished)
  aSock.emit('admin:join_station', { station_id: curStation.id });
  await wait(150);
  const conf2P = once(pSock, 'start:confirmed');
  aSock.emit('admin:confirm_start', { team_id: t1.id, station_id: curStation.id });
  await conf2P;
  pSock.emit('team:submit_score', { team_id: t1.id, station_id: curStation.id, score: 90 });
  await wait(200);
  const finP = once(pSock, 'player:finished', 8000);
  pSock.emit('team:request_next', { team_id: t1.id });
  await finP;
  assert(true, 'player hoàn thành tất cả trạm public → finished');

  console.log('\n=== PRIVATE STATION SCORING (12.6) ===');
  // admin trừ điểm qua trạm private
  aSock.emit('admin:join_station', { station_id: stP.id });
  await wait(150);
  aSock.emit('admin:override_score', { team_id: t1.id, station_id: stP.id, score: -20 });
  await wait(300);

  r = await req('GET', '/api/teams/' + t1.id + '/result');
  assert(r.data.total_score === 80 + 90 - 20, `tổng điểm = 150 (80+90-20), thực tế=${r.data.total_score}`);
  assert(r.data.stations.every(s => s.name !== 'Trạm Bí Mật'), 'trạm private KHÔNG hiện trong kết quả player');

  r = await req('GET', '/api/games/' + gameId + '/leaderboard');
  const me = r.data.leaderboard.find(x => x.id === t1.id);
  assert(me && me.total === 150, 'bảng XH phản ánh điểm private (150)');

  console.log('\n=== END GAME ===');
  r = await req('POST', '/api/games/' + gameId + '/end');
  assert(r.data.status === 'ended', 'end game');

  pSock.close(); aSock.close();

  console.log(`\n=== KẾT QUẢ: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('LỖI TEST:', e); process.exit(1); });
