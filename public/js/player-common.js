// Helpers dùng chung cho các trang player
const TOKEN_KEY = 'htrace2_token';
const GAME_KEY = 'htrace2_game';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setSession(token, gameId) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(GAME_KEY, String(gameId));
}
function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(GAME_KEY); }
function getGameId() { return localStorage.getItem(GAME_KEY); }

async function papi(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['x-session-token'] = token;
  const res = await fetch(url, { headers, ...opts });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.error) || `Lỗi ${res.status}`);
  return data;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function qs(name) { return new URLSearchParams(location.search).get(name); }

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Điều hướng player về đúng màn hình theo trạng thái đội
async function routePlayer() {
  const token = getToken();
  if (!token) return null;
  let me;
  try { me = await papi('/api/teams/me'); }
  catch { clearSession(); return null; }
  return me;
}
