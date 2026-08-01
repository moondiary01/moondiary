var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    unreadNotices: [],
    visibleRead: [],
    hiddenCount: 0,
    hiddenExpanded: false,
    totalUnread: 0,
    hasAny: false,
    loading: true
  },

  onLoad: function () {
    audio.playEnter()
    this.renderNoticePage()
    this.startPolling()
  },

  onUnload: function () {
    this.stopPolling()
    this.markAllNoticesAsRead()
  },

  // ===== 轮询 =====
  _pollTimer: null,
  startPolling: function () {
    var self = this
    if (self._pollTimer) clearInterval(self._pollTimer)
    self._pollTimer = setInterval(function () {
      self.renderNoticePage()
    }, 2000)
  },
  stopPolling: function () {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
  },

  // ===== 渲染通知页 =====
  renderNoticePage: function () {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      var allNotices = self.collectNotices(data.posts)
      allNotices.sort(function (a, b) { return b.timestamp - a.timestamp })

      var unread = allNotices.filter(function (n) { return n.unread })
      var read = allNotices.filter(function (n) { return !n.unread })
      var MAX_VISIBLE = 10
      var visibleRead = read.slice(0, MAX_VISIBLE)
      var hiddenCount = Math.max(0, read.length - MAX_VISIBLE)

      self.setData({
        unreadNotices: unread,
        visibleRead: visibleRead,
        hiddenCount: hiddenCount,
        totalUnread: unread.length,
        hasAny: allNotices.length > 0,
        loading: false
      })
    })
  },

  // ===== 收集所有通知 =====
  collectNotices: function (posts) {
    var me = app.globalData.userKey
    if (!me || me === 'local') return []
    var allNotices = []

    // 全局收集我的评论ID
    var myCommentIds = new Set()
    posts.forEach(function (p) {
      if (p.comments) {
        p.comments.forEach(function (c) {
          if (c.userKey === me) myCommentIds.add(c.id)
        })
      }
    })

    posts.forEach(function (p) {
      // 类型A：我的帖子被评论
      if (p.userKey === me && p.comments && p.comments.length > 0) {
        var lastView = getCommentViewTime(me, p.id)
        p.comments.forEach(function (c) {
          if (c.userKey === me) return
          if (c.replyTo && myCommentIds.has(c.replyTo)) return
          allNotices.push({
            type: 'comment',
            comment: c,
            post: p,
            timestamp: c.createdAt || 0,
            unread: (c.createdAt || 0) > lastView
          })
        })
      }
      // 类型B：在别人帖子里被回复
      if (p.userKey !== me && p.comments && p.comments.length > 0) {
        p.comments.forEach(function (parentC) {
          if (parentC.userKey !== me) return
          p.comments.forEach(function (childC) {
            if (childC.replyTo !== parentC.id || childC.userKey === me) return
            var rlv = getCommentReplyViewTime(me, parentC.id)
            allNotices.push({
              type: 'reply',
              comment: childC,
              post: p,
              parentComment: parentC,
              timestamp: childC.createdAt || 0,
              unread: (childC.createdAt || 0) > rlv
            })
          })
        })
      }
      // 类型C：我的帖子被点赞
      if (p.userKey === me && p.likedBy && p.likedBy.length > 0) {
        var likeLastView = getLikeViewTime(me, p.id)
        var lastLikeAt = p.lastLikeAt || p.createdAt || 0
        var likeUnread = lastLikeAt > likeLastView
        p.likedBy.forEach(function (phone) {
          if (phone === me) return
          allNotices.push({
            type: 'like',
            likerPhone: phone,
            post: p,
            timestamp: lastLikeAt,
            unread: likeUnread
          })
        })
      }
    })

    return allNotices
  },

  // ===== 标记已读 =====
  markAllNoticesAsRead: function () {
    var me = app.globalData.userKey
    if (!me || me === 'local') return
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      data.posts.forEach(function (p) {
        if (p.userKey === me) {
          markCommentViewed(me, p.id)
          markLikeViewed(me, p.id)
        }
        if (p.comments) {
          p.comments.forEach(function (c) {
            if (c.userKey === me) markCommentReplyViewed(me, c.id)
          })
        }
      })
    })
  },

  // ===== 点击通知 =====
  onTapNotice: function (e) {
    audio.playClick()
    var postId = e.currentTarget.dataset.pid
    var commentId = e.currentTarget.dataset.cid
    var type = e.currentTarget.dataset.type

    // 标记已读
    var me = app.globalData.userKey
    if (postId && (type === 'comment' || type === 'reply')) {
      markCommentViewed(me, postId)
    }
    if (commentId) {
      markCommentReplyViewed(me, commentId)
    }

    wx.navigateTo({
      url: '/subpkg-beauty/pages/community-detail/community-detail?id=' + postId
    })
  },

  // ===== 折叠/展开历史消息 =====
  onToggleHidden: function () {
    audio.playClick()
    this.setData({ hiddenExpanded: !this.data.hiddenExpanded })
  },

  // ===== 格式化时间 =====
  formatTime: function (ts) {
    if (!ts) return ''
    var now = Date.now()
    var diff = now - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前'
    var d = new Date(ts)
    return (d.getMonth() + 1) + '月' + d.getDate() + '日'
  }
})

// ===== 已读时间工具 =====
function getCommentViewTime(userKey, postId) {
  try {
    var raw = wx.getStorageSync('moondiary_comment_view_' + userKey)
    if (!raw) return 0
    var obj = JSON.parse(raw)
    return obj[postId] || obj._initialized || 0
  } catch (e) { return 0 }
}
function markCommentViewed(userKey, postId) {
  try {
    var key = 'moondiary_comment_view_' + userKey
    var raw = wx.getStorageSync(key)
    var obj = raw ? JSON.parse(raw) : {}
    obj[postId] = Date.now()
    wx.setStorageSync(key, JSON.stringify(obj))
  } catch (e) { }
}
function getCommentReplyViewTime(userKey, commentId) {
  try {
    var raw = wx.getStorageSync('moondiary_reply_view_' + userKey)
    if (!raw) return 0
    var obj = JSON.parse(raw)
    return obj[commentId] || obj._initialized || 0
  } catch (e) { return 0 }
}
function markCommentReplyViewed(userKey, commentId) {
  try {
    var key = 'moondiary_reply_view_' + userKey
    var raw = wx.getStorageSync(key)
    var obj = raw ? JSON.parse(raw) : {}
    obj[commentId] = Date.now()
    wx.setStorageSync(key, JSON.stringify(obj))
  } catch (e) { }
}
function getLikeViewTime(userKey, postId) {
  try {
    var raw = wx.getStorageSync('moondiary_like_view_' + userKey)
    if (!raw) return 0
    var obj = JSON.parse(raw)
    return obj[postId] || obj._initialized || 0
  } catch (e) { return 0 }
}
function markLikeViewed(userKey, postId) {
  try {
    var key = 'moondiary_like_view_' + userKey
    var raw = wx.getStorageSync(key)
    var obj = raw ? JSON.parse(raw) : {}
    obj[postId] = Date.now()
    wx.setStorageSync(key, JSON.stringify(obj))
  } catch (e) { }
}
