const passport = require('../config/passport') // 引入 passport
// 傳入自訂 callback，驗證失敗時回傳 401 JSON（而非 passport 預設的純文字 Unauthorized）
const authenticated = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err || !user) return res.status(401).json({ status: 'error', message: 'unauthorized' })
    req.user = user // 有自訂 callback 時 passport 不會自動設定 req.user，要自己放
    next()
  })(req, res, next)
}
const authenticatedAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) return next()
  return res.status(403).json({ status: 'error', message: 'permission denied' })
}
module.exports = {
  authenticated,
  authenticatedAdmin
}
