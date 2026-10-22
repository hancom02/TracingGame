// htrace2 — Entry point: Express + Socket.io + session + static files
const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');

require('./db/database');            // khởi tạo DB + schema
const seedAdmin = require('./db/seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'htrace2-demo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 }, // 12h — đủ cho demo
});
app.use(sessionMiddleware);

// Cho phép socket handlers truy cập io & session
app.set('io', io);
io.engine.use(sessionMiddleware);

// ---- Static files ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- API routes ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/games'));
app.use('/api', require('./routes/stations'));
app.use('/api', require('./routes/questions'));
app.use('/api', require('./routes/teams'));
app.use('/api', require('./routes/results'));

// ---- Root → admin login ----
app.get('/', (req, res) => res.redirect('/admin/login.html'));

// ---- Socket.io ----
require('./socket/handlers')(io);

// ---- Start ----
const PORT = process.env.PORT || 3000;
seedAdmin(); // đảm bảo có admin mặc định
server.listen(PORT, () => {
  console.log(`\n🏁 htrace2 chạy tại http://localhost:${PORT}`);
  console.log(`   Admin login: http://localhost:${PORT}/admin/login.html  (admin / admin123)\n`);
});

module.exports = { app, server, io };
