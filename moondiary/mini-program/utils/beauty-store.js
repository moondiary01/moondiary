// utils/beauty-store.js — 升级版COS数据存取 (v8.0 与HTML版数据结构统一)
var store = require('./store.js')

// ===== 护肤日记 =====
function loadSkincare(userKey, callback) {
  store.loadFromCloud('beauty/skincare/' + userKey, callback)
}
function saveSkincare(userKey, data, callback) {
  store.saveToCloud('beauty/skincare/' + userKey, data, callback)
}

// ===== 心情日记 =====
function loadMood(userKey, callback) {
  store.loadFromCloud('beauty/mood/' + userKey, callback)
}
function saveMood(userKey, data, callback) {
  store.saveToCloud('beauty/mood/' + userKey, data, callback)
}

// ===== 冥想音乐列表 =====
function loadMeditationMusic(callback) {
  store.loadFromCloud('beauty/music/meditation', callback)
}

// ===== 升级版状态检查（从 payments 读取，三端统一） =====
// 参数：userKey (手机号/openid), loginType, callback
function checkUpgradeStatus(userKey, loginType, callback) {
  // 管理员直接返回 true
  if (loginType === 'admin') {
    callback({ canUseUpgrade: true, upgradeExpired: false })
    return
  }
  // key / wx / sms 用户：统一从 payments 读取 beautyPaid
  if (!userKey) {
    callback({ canUseUpgrade: false, upgradeExpired: true })
    return
  }
  store.loadPayments(function (payments) {
    payments = payments || {}
    var p = payments[userKey] || {}
    var canUse = !!p.beautyPaid
    callback({ canUseUpgrade: canUse, upgradeExpired: !canUse })
  })
}

// ===== 工具 =====
function localDateStr(d) {
  var year = d.getFullYear()
  var month = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function generatePostId() {
  return 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
}

/* 生成评论ID */
function generateCommentId() {
  return 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
}

module.exports = {
  loadSkincare: loadSkincare,
  saveSkincare: saveSkincare,
  loadMood: loadMood,
  saveMood: saveMood,
  loadMeditationMusic: loadMeditationMusic,
  checkUpgradeStatus: checkUpgradeStatus,
  localDateStr: localDateStr,
  generatePostId: generatePostId,
  generateCommentId: generateCommentId
}
