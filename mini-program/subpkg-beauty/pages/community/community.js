var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    canUseUpgrade: false,
    currentTab: 'feed', // feed / post / notice / mine
    posts: [],
    loading: true,
    userInfo: null,
    // 发布
    postContent: '',
    postImages: [],
    // 我的
    myPosts: [],
    myProfile: {
      nickname: '月友',
      avatar: '',
      gender: '',
      age: '',
      signature: ''
    },
    editingProfile: false,
    // 通知
    noticeUnread: 0,
    _lastCloudVersion: 0
  },

  onLoad: function () {
    audio.playEnter()
    var wxUserInfo = app.globalData.wxUserInfo || {}
    this.setData({
      canUseUpgrade: app.globalData.canUseUpgrade || false,
      userInfo: {
        userKey: app.globalData.userKey,
        nickname: wxUserInfo.nickname || '月友',
        avatar: wxUserInfo.avatarUrl || ''
      },
      'myProfile.nickname': wxUserInfo.nickname || '月友',
      'myProfile.avatar': wxUserInfo.avatarUrl || ''
    })
    this.initReadTimestamps()
    this.loadPosts()
    this.loadMyProfile()
    this.startAutoRefresh()
  },

  onShow: function () {
    this.setData({ canUseUpgrade: app.globalData.canUseUpgrade || false })
    this.updateNoticeBadge()
  },

  onHide: function () {
    this.stopAutoRefresh()
  },

  onUnload: function () {
    this.stopAutoRefresh()
  },

  onPullDownRefresh: function () {
    if (this.data.currentTab === 'feed') {
      this.loadPosts(function () { wx.stopPullDownRefresh() })
    } else {
      wx.stopPullDownRefresh()
    }
  },

  // ===== 自动刷新 =====
  _refreshTimer: null,
  startAutoRefresh: function () {
    var self = this
    if (self._refreshTimer) clearInterval(self._refreshTimer)
    self._refreshTimer = setInterval(function () {
      self.loadPosts()
      self.updateNoticeBadge()
    }, 2000)
  },
  stopAutoRefresh: function () {
    if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null }
  },

  // ===== 已读时间初始化 =====
  initReadTimestamps: function () {
    var userKey = app.globalData.userKey
    if (!userKey || userKey === 'local') return
    var now = Date.now()
    try {
      var ck = 'moondiary_comment_view_' + userKey
      var cRaw = wx.getStorageSync(ck)
      var cObj = cRaw ? JSON.parse(cRaw) : {}
      if (!cObj._initialized) {
        cObj._initialized = now
        wx.setStorageSync(ck, JSON.stringify(cObj))
      }
    } catch (e) { }
    try {
      var rk = 'moondiary_reply_view_' + userKey
      var rRaw = wx.getStorageSync(rk)
      var rObj = rRaw ? JSON.parse(rRaw) : {}
      if (!rObj._initialized) {
        rObj._initialized = now
        wx.setStorageSync(rk, JSON.stringify(rObj))
      }
    } catch (e) { }
    try {
      var lk = 'moondiary_like_view_' + userKey
      var lRaw = wx.getStorageSync(lk)
      var lObj = lRaw ? JSON.parse(lRaw) : {}
      if (!lObj._initialized) {
        lObj._initialized = now
        wx.setStorageSync(lk, JSON.stringify(lObj))
      }
    } catch (e) { }
  },

  // ===== 更新通知徽章 =====
  updateNoticeBadge: function () {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      var totalUnread = self.countUnread(data.posts)
      if (totalUnread !== self.data.noticeUnread) {
        self.setData({ noticeUnread: totalUnread })
      }
    })
  },

  countUnread: function (posts) {
    var me = app.globalData.userKey
    if (!me || me === 'local') return 0
    var totalUnread = 0
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
      // 类型1：我的帖子被评论（排除回复我的评论）
      if (p.userKey === me && p.comments && p.comments.length > 0) {
        var lastView = getCommentViewTime(me, p.id)
        p.comments.forEach(function (c) {
          if (c.userKey === me) return
          if (c.replyTo && myCommentIds.has(c.replyTo)) return
          if ((c.createdAt || 0) > lastView) totalUnread++
        })
      }
      // 类型2：我的评论被回复（只在别人帖子里）
      if (p.userKey !== me && p.comments && p.comments.length > 0) {
        p.comments.forEach(function (parentC) {
          if (parentC.userKey !== me) return
          p.comments.forEach(function (childC) {
            if (childC.replyTo !== parentC.id || childC.userKey === me) return
            var rlv = getCommentReplyViewTime(me, parentC.id)
            if ((childC.createdAt || 0) > rlv) totalUnread++
          })
        })
      }
      // 类型3：我的帖子被点赞
      if (p.userKey === me && p.likedBy && p.likedBy.length > 0) {
        var likeLastView = getLikeViewTime(me, p.id)
        var lastLikeAt = p.lastLikeAt || p.createdAt || 0
        if (lastLikeAt > likeLastView) {
          p.likedBy.forEach(function (phone) {
            if (phone !== me) totalUnread++
          })
        }
      }
    })
    return totalUnread
  },

  // ===== Tab切换 =====
  onTabChange: function (e) {
    audio.playClick()
    var tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    if (tab === 'feed') {
      this.loadPosts()
    } else if (tab === 'mine') {
      this.loadMyPosts()
      this.loadMyProfile()
    } else if (tab === 'notice') {
      wx.navigateTo({
        url: '/subpkg-beauty/pages/notice/notice'
      })
    }
  },

  // ===== 加载帖子 =====
  loadPosts: function (callback) {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) {
        data = { version: 2, posts: [] }
      }
      // 版本检测
      var cloudVer = data._v || 0
      if (self.data._lastCloudVersion && cloudVer === self.data._lastCloudVersion) {
        self.updateNoticeBadge()
        if (callback) callback()
        return
      }
      self.setData({ _lastCloudVersion: cloudVer })
      var posts = data.posts.slice()
      posts.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })
      for (var i = 0; i < posts.length; i++) {
        posts[i].timeText = self.formatTime(posts[i].createdAt)
        var likedBy = posts[i].likedBy || []
        posts[i].isLiked = likedBy.indexOf(app.globalData.userKey) > -1
        posts[i].commentCount = (posts[i].comments && posts[i].comments.length) || 0
      }
      self.setData({ posts: posts, loading: false })
      self.updateNoticeBadge()
      if (callback) callback()
    })
  },

  // ===== 加载我的帖子 =====
  loadMyPosts: function () {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      var userKey = app.globalData.userKey
      var myPosts = data.posts.filter(function (p) { return p.userKey === userKey })
      myPosts.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })
      for (var i = 0; i < myPosts.length; i++) {
        myPosts[i].timeText = self.formatTime(myPosts[i].createdAt)
        myPosts[i].commentCount = (myPosts[i].comments && myPosts[i].comments.length) || 0
      }
      self.setData({ myPosts: myPosts })
    })
  },

  // ===== 加载我的资料 =====
  loadMyProfile: function () {
    var self = this
    var userKey = app.globalData.userKey
    store = require('../../../utils/store.js')
    store.loadFromCloud('beauty/community/profiles', function (data) {
      if (data && data[userKey]) {
        self.setData({ myProfile: data[userKey] })
      }
    })
  },

  // ===== 保存资料 =====
  saveMyProfile: function () {
    var self = this
    audio.playClick()
    var userKey = app.globalData.userKey
    var store = require('../../../utils/store.js')
    store.loadFromCloud('beauty/community/profiles', function (data) {
      if (!data) data = {}
      data[userKey] = self.data.myProfile
      store.saveToCloud('beauty/community/profiles', data, function (success) {
        if (success) {
          wx.showToast({ title: '保存成功', icon: 'success' })
          self.setData({ editingProfile: false })
        }
      })
    })
  },

  onEditProfile: function () {
    audio.playClick()
    this.setData({ editingProfile: true })
  },
  onCancelEditProfile: function () {
    this.setData({ editingProfile: false })
  },
  onProfileInput: function (e) {
    var field = e.currentTarget.dataset.field
    var update = {}
    update['myProfile.' + field] = e.detail.value
    this.setData(update)
  },
  onProfileGender: function (e) {
    audio.playClick()
    this.setData({ 'myProfile.gender': e.currentTarget.dataset.value })
  },
  onChangeAvatar: function () {
    var self = this
    audio.playClick()
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        self.setData({ 'myProfile.avatar': res.tempFiles[0].tempFilePath })
      }
    })
  },

  // ===== 发布帖子 =====
  onPostContentInput: function (e) {
    this.setData({ postContent: e.detail.value })
  },
  onAddImage: function () {
    audio.playClick()
    var self = this
    wx.chooseMedia({
      count: 9 - this.data.postImages.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var imgs = self.data.postImages.slice()
        for (var i = 0; i < res.tempFiles.length; i++) {
          imgs.push(res.tempFiles[i].tempFilePath)
        }
        self.setData({ postImages: imgs })
      }
    })
  },
  onDeleteImage: function (e) {
    audio.playClick()
    var idx = e.currentTarget.dataset.index
    var imgs = this.data.postImages.slice()
    imgs.splice(idx, 1)
    this.setData({ postImages: imgs })
  },

  onPublishPost: function () {
    var self = this
    var content = this.data.postContent.trim()
    if (!content && this.data.postImages.length === 0) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    wx.showLoading({ title: '发布中...' })
    var postId = beautyStore.generatePostId()
    var now = Date.now()
    var profile = this.data.myProfile
    var newPost = {
      id: postId,
      userKey: app.globalData.userKey,
      nickname: profile.nickname || '月友',
      avatar: profile.avatar || '',
      gender: profile.gender || '',
      age: profile.age || '',
      signature: profile.signature || '',
      content: content,
      images: self.data.postImages,
      comments: [],
      likeCount: 0,
      commentCount: 0,
      likedBy: [],
      createdAt: now,
      lastLikeAt: now,
      version: 1
    }

    beautyStore.safeMergeAndSave(function (cloudData) {
      if (!cloudData.posts) cloudData.posts = []
      cloudData.posts.unshift(newPost)
      return cloudData
    }, function (success) {
      wx.hideLoading()
      if (success) {
        self.setData({ postContent: '', postImages: [], currentTab: 'feed' })
        wx.showToast({ title: '发布成功', icon: 'success' })
        self.setData({ _lastCloudVersion: 0 })
        self.loadPosts()
      } else {
        wx.showToast({ title: '发布失败', icon: 'none' })
      }
    })
  },

  // ===== 点赞 =====
  onLikePost: function (e) {
    audio.playClick()
    var self = this
    var postId = e.currentTarget.dataset.id
    var userKey = app.globalData.userKey

    beautyStore.safeMergeAndSave(function (cloudData) {
      if (!cloudData.posts) return null
      for (var i = 0; i < cloudData.posts.length; i++) {
        if (cloudData.posts[i].id === postId) {
          var likedBy = cloudData.posts[i].likedBy || []
          var idx = likedBy.indexOf(userKey)
          if (idx > -1) {
            likedBy.splice(idx, 1)
          } else {
            likedBy.push(userKey)
          }
          cloudData.posts[i].likedBy = likedBy
          cloudData.posts[i].likeCount = likedBy.length
          cloudData.posts[i].lastLikeAt = Date.now()
          break
        }
      }
      return cloudData
    }, function (success) {
      if (success) {
        self.setData({ _lastCloudVersion: 0 })
        self.loadPosts()
      }
    })
  },

  // ===== 查看详情 =====
  onTapPost: function (e) {
    audio.playPageFlip()
    var postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/subpkg-beauty/pages/community-detail/community-detail?id=' + postId
    })
  },

  // ===== 查看用户主页 =====
  onTapUser: function (e) {
    audio.playClick()
    var userKey = e.currentTarget.dataset.userkey
    if (userKey === app.globalData.userKey) {
      this.setData({ currentTab: 'mine' })
      this.loadMyPosts()
      return
    }
    wx.navigateTo({
      url: '/subpkg-beauty/pages/community-detail/community-detail?userKey=' + userKey + '&view=profile'
    })
  },

  // ===== 预览图片 =====
  onPreviewImage: function (e) {
    var urls = e.currentTarget.dataset.urls
    var current = e.currentTarget.dataset.src
    wx.previewImage({ current: current, urls: urls })
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

// ===== 已读时间工具函数 =====
function getCommentViewTime(userKey, postId) {
  try {
    var raw = wx.getStorageSync('moondiary_comment_view_' + userKey)
    if (!raw) return 0
    var obj = JSON.parse(raw)
    return obj[postId] || obj._initialized || 0
  } catch (e) { return 0 }
}
function getCommentReplyViewTime(userKey, commentId) {
  try {
    var raw = wx.getStorageSync('moondiary_reply_view_' + userKey)
    if (!raw) return 0
    var obj = JSON.parse(raw)
    return obj[commentId] || obj._initialized || 0
  } catch (e) { return 0 }
}
function getLikeViewTime(userKey, postId) {
  try {
    var raw = wx.getStorageSync('moondiary_like_view_' + userKey)
    if (!raw) return 0
    var obj = JSON.parse(raw)
    return obj[postId] || obj._initialized || 0
  } catch (e) { return 0 }
}
