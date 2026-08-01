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

// ===== 月友圈 (v8.0: 数据结构与HTML版统一，评论/点赞内嵌在帖子中) =====

/* 加载帖子列表 */
function loadPosts(callback) {
  store.loadFromCloud('beauty/community/posts', callback)
}

/* 保存帖子列表（直接覆盖，仅用于初始化） */
function savePosts(data, callback) {
  store.saveToCloud('beauty/community/posts', data, callback)
}

/* 安全合并保存：先读云端 → 合并本地修改 → 写回，防止并发覆盖 */
function safeMergeAndSave(mergeFn, callback) {
  loadPosts(function (data) {
    if (!data || !data.posts || !data.posts.length) {
      data = data || { version: 2, posts: [] };
      if (!data.posts) data.posts = [];
    }
    var merged = mergeFn(data);
    if (!merged) merged = data;
    merged._v = (merged._v || 0) + 1;
    savePosts(merged, function (success) {
      if (callback) callback(success, merged);
    });
  });
}

/* 合并单个帖子到云端帖子列表：以云端为主，补充本地新增的评论/点赞 */
function mergePostIntoList(cloudPosts, localPost) {
  if (!cloudPosts) cloudPosts = [];
  for (var i = 0; i < cloudPosts.length; i++) {
    if (cloudPosts[i].id === localPost.id) {
      // 合并评论：补充本地新增的评论
      if (localPost.comments && localPost.comments.length > 0) {
        if (!cloudPosts[i].comments) cloudPosts[i].comments = [];
        localPost.comments.forEach(function (lc) {
          var exists = false;
          for (var j = 0; j < cloudPosts[i].comments.length; j++) {
            if (cloudPosts[i].comments[j].id === lc.id) { exists = true; break; }
          }
          if (!exists) cloudPosts[i].comments.push(lc);
        });
        cloudPosts[i].commentCount = cloudPosts[i].comments.length;
      }
      // 合并点赞
      if (localPost.likedBy && localPost.likedBy.length > 0) {
        if (!cloudPosts[i].likedBy) cloudPosts[i].likedBy = [];
        localPost.likedBy.forEach(function (phone) {
          if (cloudPosts[i].likedBy.indexOf(phone) < 0) cloudPosts[i].likedBy.push(phone);
        });
        cloudPosts[i].likeCount = cloudPosts[i].likedBy.length;
      }
      // 合并 lastLikeAt
      if (localPost.lastLikeAt && (!cloudPosts[i].lastLikeAt || localPost.lastLikeAt > cloudPosts[i].lastLikeAt)) {
        cloudPosts[i].lastLikeAt = localPost.lastLikeAt;
      }
      return cloudPosts[i];
    }
  }
  // 云端没有这个帖子，添加到末尾
  cloudPosts.push(localPost);
  return localPost;
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
  loadPosts: loadPosts,
  savePosts: savePosts,
  safeMergeAndSave: safeMergeAndSave,
  mergePostIntoList: mergePostIntoList,
  checkUpgradeStatus: checkUpgradeStatus,
  localDateStr: localDateStr,
  generatePostId: generatePostId,
  generateCommentId: generateCommentId
}
