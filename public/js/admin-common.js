// Helpers dùng chung cho các trang admin
async function requireAdmin() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (!data.loggedIn) {
    location.href = '/admin/login.html';
    return null;
  }
  return data.username;
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const msg = (data && data.error) || `Lỗi ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/admin/login.html';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

// Các trang quản lý của 1 game, dùng để dựng menu điều hướng game-scoped
const GAME_NAV_ITEMS = [
  { key: 'setup', href: 'game-setup.html', param: 'id', label: 'Sửa game' },
  { key: 'stations', href: 'station-setup.html', param: 'game_id', label: 'Trạm' },
  { key: 'questions', href: 'questions.html', param: 'game_id', label: 'Câu hỏi' },
  { key: 'control', href: 'game-control.html', param: 'game_id', label: 'Điều khiển' },
  { key: 'monitor-station', href: 'monitor-station.html', param: 'game_id', label: 'Monitor trạm' },
  { key: 'monitor-team', href: 'monitor-team.html', param: 'game_id', label: 'Monitor đội' },
];

// Topbar chuẩn cho admin. Truyền gameId để hiện thêm menu điều hướng giữa
// các trang quản lý của game đó (activeNav khớp với key trong GAME_NAV_ITEMS).
function renderTopbar(title, activeNav, gameId) {
  const gameNav = gameId ? `
    <div class="nav game-nav">
      ${GAME_NAV_ITEMS.map((item) => (
        item.key === activeNav
          ? `<span class="btn btn-sm active">${esc(item.label)}</span>`
          : `<a class="btn btn-sm btn-ghost" href="/admin/${item.href}?${item.param}=${gameId}">${esc(item.label)}</a>`
      )).join('')}
    </div>` : '';
  return `
    <div class="topbar">
      <div class="topbar-row">
        <h1>🏁 ${esc(title)}</h1>
        <div class="nav">
          <a class="btn btn-sm btn-ghost" href="/admin/dashboard.html">← Dashboard</a>
          <button class="btn btn-sm btn-danger" onclick="logout()">Đăng xuất</button>
        </div>
      </div>
      ${gameNav}
    </div>`;
}
