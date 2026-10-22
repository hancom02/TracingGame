// Seed tài khoản admin mặc định (admin / admin123)
// Chạy: npm run seed  (hoặc tự chạy khi server khởi động nếu chưa có admin)
const bcrypt = require('bcryptjs');
const db = require('./database');

function seedAdmin() {
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASS || 'admin123';

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) {
    return { created: false, username };
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, 'admin');
  return { created: true, username };
}

module.exports = seedAdmin;

// Cho phép chạy trực tiếp: node db/seed.js
if (require.main === module) {
  const res = seedAdmin();
  if (res.created) {
    console.log(`✔ Đã tạo admin mặc định: ${res.username} / admin123`);
  } else {
    console.log(`ℹ Admin "${res.username}" đã tồn tại, bỏ qua.`);
  }
  process.exit(0);
}
