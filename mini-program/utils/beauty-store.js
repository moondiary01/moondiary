// utils/beauty-store.js — 升级版COS数据存取
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

// ===== 月友圈 =====
function loadPosts(callback) {
  store.loadFromCloud('beauty/community/posts', callback)
}
function savePosts(data, callback) {
  store.saveToCloud('beauty/community/posts', data, callback)
}
function loadPostDetail(postId, callback) {
  store.loadFromCloud('beauty/community/posts/' + postId, callback)
}
function savePostDetail(postId, data, callback) {
  store.saveToCloud('beauty/community/posts/' + postId, data, callback)
}
function loadLikes(postId, callback) {
  store.loadFromCloud('beauty/community/likes/' + postId, callback)
}
function saveLikes(postId, data, callback) {
  store.saveToCloud('beauty/community/likes/' + postId, data, callback)
}
function loadComments(postId, callback) {
  store.loadFromCloud('beauty/community/comments/' + postId, callback)
}
function saveComments(postId, data, callback) {
  store.saveToCloud('beauty/community/comments/' + postId, data, callback)
}

// ===== 升级版状态检查 =====
function checkUpgradeStatus(wxUserInfo, loginType) {
  // 密钥用户和管理员免费使用升级版
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

module.exports = {
  loadSkincare: loadSkincare,
  saveSkincare: saveSkincare,
  loadMood: loadMood,
  saveMood: saveMood,
  loadMeditationMusic: loadMeditationMusic,
  loadPosts: loadPosts,
  savePosts: savePosts,
  loadPostDetail: loadPostDetail,
  savePostDetail: savePostDetail,
  loadLikes: loadLikes,
  saveLikes: saveLikes,
  loadComments: loadComments,
  saveComments: saveComments,
  checkUpgradeStatus: checkUpgradeStatus,
  localDateStr: localDateStr,
  generatePostId: generatePostId
}
