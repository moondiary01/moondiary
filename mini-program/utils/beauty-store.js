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

// ===== 升级版状态检查 =====
function checkUpgradeStatus(wxUserInfo, loginType) {
  if (loginType === 'key' || loginType === 'admin') {
    return { canUseUpgrade: true, upgradeExpired: false }
  }
  if (!wxUserInfo) return { canUseUpgrade: false, upgradeExpired: true }
  var now = Date.now()
  var upgradePaidUntil = wxUserInfo.upgradePaidUntil || null
  if (upgradePaidUntil && upgradePaidUntil > now) {
    return { canUseUpgrade: true, upgradeExpired: false }
  }
  return { canUseUpgrade: false, upgradeExpired: true }
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
