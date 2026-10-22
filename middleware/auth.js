// Middleware kiểm tra admin đã đăng nhập (dựa trên session)

function isAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  // API request → 401 JSON; page request → redirect login
  if (req.path.startsWith('/api/') || req.xhr || req.accepts(['html', 'json']) === 'json') {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  return res.redirect('/admin/login.html');
}

module.exports = { isAdmin };
