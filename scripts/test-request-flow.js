// Test kịch bản bugfix mục 14 (tasks.md): yêu cầu bắt đầu trạm không đồng bộ khi
// reload / admin vắng mặt. Yêu cầu server đang chạy ở BASE với REQUEST_TTL_SECONDS nhỏ
// (vd. `REQUEST_TTL_SECONDS=8 PORT=3556 node server.js`) để test được luồng hết hạn nhanh.
const { io } = require('socket.io-client');

const BASE = process.env.BASE || 'http://localhost:3556';
let cookie = '';
let pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✔', msg); }
  else { fail++; console.error('  ✘ FAIL:', msg); }
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
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
  console.log('\n=== SETUP ===');
  let r = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert(r.status === 200, 'admin login');

  r = await req('POST', '/api/games', { name: 'Test Request Flow', total_slots: 4 });
  const gameId = r.data.game.id;
  const q1 = (await req('POST', '/api/questions', { game_id: gameId, question_text: '1+1=?', option_a: '1', option_b: '2', option_c: '3', option_d: '4', correct_answer: 'b' })).data.question;
  const st1 = (await req('POST', '/api/stations', { game_id: gameId, name: 'Trạm A', duration_seconds: 30, max_teams: 2, challenge_type: 'none' })).data.station;
  await req('POST', '/api/games/' + gameId + '/start');

  r = await preq('POST', '/api/teams/join', { game_id: gameId, slot_number: 1, name: 'Đội Test Request' });
  const t1 = r.data.team; const tok1 = r.data.session_token;
  r = await preq('POST', '/api/teams/' + t1.id + '/verify-answer', { question_id: q1.id, answer: 'b' }, tok1);
  assert(r.data.correct === true, 'intro đúng → nhận trạm đầu');

  console.log('\n=== Bug #1: admin KHÔNG ở station room lúc player request ===');
  const pSock = await connectSocket();
  pSock.emit('player:join', { token: tok1 });
  await wait(150);

  // Player request start TRƯỚC KHI có admin nào join room station:X
  pSock.emit('team:request_start', { team_id: t1.id, station_id: st1.id });
  await wait(200);

  // Admin vào trang trực trạm SAU đó — phải thấy được yêu cầu qua snapshot, không bị mất
  const aSock = await connectSocket();
  const snapP = once(aSock, 'admin:pending_requests_snapshot');
  aSock.emit('admin:join_station', { station_id: st1.id });
  const snap1 = await snapP;
  assert(snap1.requests.some(x => x.team_id === t1.id), 'admin join TRỄ vẫn thấy yêu cầu đã gửi trước đó (hydrate từ DB)');

  console.log('\n=== Bug #2: admin reload station-view (mất Map JS phía client) ===');
  aSock.disconnect();
  await wait(100);
  const aSock2 = await connectSocket(); // giả lập reload = kết nối socket mới, Map JS trống
  const snapP2 = once(aSock2, 'admin:pending_requests_snapshot');
  aSock2.emit('admin:join_station', { station_id: st1.id });
  const snap2 = await snapP2;
  assert(snap2.requests.some(x => x.team_id === t1.id), 'admin reload vẫn thấy lại đúng yêu cầu đang chờ (không bị mất)');

  console.log('\n=== Bug player: reload trong lúc chờ xác nhận ===');
  r = await preq('GET', '/api/teams/' + t1.id + '/current-station', null, tok1);
  assert(r.data.team_station && r.data.team_station.status === 'requested', 'current-station trả về status=requested sau khi player "reload"');
  assert(!!r.data.team_station.requested_at, 'current-station có requested_at để front-end tính tuổi yêu cầu');

  console.log('\n=== Chặn spam-click trong lúc yêu cầu còn hiệu lực ===');
  const beforeCount = (await preq('GET', '/api/teams/' + t1.id + '/current-station', null, tok1)).data.team_station.requested_at;
  pSock.emit('team:request_start', { team_id: t1.id, station_id: st1.id }); // request lại ngay lập tức
  await wait(150);
  const afterCount = (await preq('GET', '/api/teams/' + t1.id + '/current-station', null, tok1)).data.team_station.requested_at;
  assert(beforeCount === afterCount, 'request lặp lại trong lúc còn hiệu lực KHÔNG tạo yêu cầu mới (requested_at không đổi)');

  console.log('\n=== Hết hạn 1 phút (dùng REQUEST_TTL_SECONDS ngắn để test) ===');
  const expiredPlayerP = once(pSock, 'start:request_expired', 20000);
  const expiredAdminP = once(aSock2, 'admin:request_expired', 20000);
  const [expP, expA] = await Promise.all([expiredPlayerP, expiredAdminP]);
  assert(expP.station_id === st1.id, 'player nhận start:request_expired sau khi quá hạn');
  assert(expA.team_id === t1.id, 'admin nhận admin:request_expired, có thể xoá khỏi danh sách chờ');

  r = await preq('GET', '/api/teams/' + t1.id + '/current-station', null, tok1);
  assert(r.data.team_station.status === 'pending', 'sau hết hạn, team_stations quay về pending → player được bấm Bắt đầu lại');

  pSock.close(); aSock2.close();
  console.log(`\n=== KẾT QUẢ: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('LỖI TEST:', e); process.exit(1); });
