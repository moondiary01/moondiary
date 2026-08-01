var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    viewMode: 'detail', // detail / profile
    loading: true,
    post: null,
    postId: '',
    profileUserKey: '',
    // 评论
    comments: [],
    commentText: '',
    replyingTo: null,
    replyPlaceholder: '写评论...',
    replyToNickname: '',
    // 用户主页
    profilePosts: [],
    profileInfo: null
  },

  onLoad: function (options) {
    audio.playEnter()
    if (options.view === 'profile' && options.userKey) {
      this.setData({ viewMode: 'profile', profileUserKey: options.userKey })
      this.loadProfile()
    } else if (options.id) {
      this.setData({ viewMode: 'detail', postId: options.id })
      this.loadPostDetail()
    }
  },

  onUnload: function () {
    if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null }
  },

  // ===== 加载帖子详情 =====
  loadPostDetail: function () {
    var self = this
    var postId = this.data.postId
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) {
        self.setData({ loading: false })
        return
      }
      var post = null
      for (var i = 0; i < data.posts.length; i++) {
        if (data.posts[i].id === postId) { post = data.posts[i]; break }
      }
      if (!post) {
        self.setData({ loading: false })
        wx.showToast({ title: '帖子不存在', icon: 'none' })
        return
      }
      var userKey = app.globalData.userKey
      post.isLiked = post.likedBy && post.likedBy.indexOf(userKey) > -1
      post.commentCount = (post.comments && post.comments.length) || 0

      // 处理评论：构建嵌套树
      var comments = (post.comments || []).slice()
      comments.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0) })
      comments.forEach(function (c) {
        c.timeText = self.formatTime(c.createdAt)
      })

      self.setData({ post: post, comments: comments, loading: false })
    })
  },

  // ===== 加载用户主页 =====
  loadProfile: function () {
    var self = this
    var userKey = this.data.profileUserKey
    var store = require('../../../utils/store.js')
    // 加载资料
    store.loadFromCloud('beauty/community/profiles', function (profData) {
      var profile = (profData && profData[userKey]) || { nickname: '月友', avatar: '' }
      self.setData({ profileInfo: profile })
    })
    // 加载帖子
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      var posts = data.posts.filter(function (p) { return p.userKey === userKey })
      posts.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })
      posts.forEach(function (p) {
        p.timeText = self.formatTime(p.createdAt)
        p.commentCount = (p.comments && p.comments.length) || 0
        p.isLiked = p.likedBy && p.likedBy.indexOf(app.globalData.userKey) > -1
      })
      self.setData({ profilePosts: posts, loading: false })
    })
  },

  // ===== 点赞 =====
  onLikePost: function (e) {
    audio.playClick()
    var self = this
    var postId = e.currentTarget.dataset.id || this.data.postId
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
        if (self.data.viewMode === 'detail') {
          self.loadPostDetail()
        } else {
          self.loadProfile()
        }
      }
    })
  },

  // ===== 评论 =====
  onCommentInput: function (e) {
    this.setData({ commentText: e.detail.value })
  },

  onFocusComment: function () {
    this.setData({ replyingTo: null, replyPlaceholder: '写评论...', replyToNickname: '' })
  },

  onReplyComment: function (e) {
    audio.playClick()
    var nickname = e.currentTarget.dataset.nickname
    var cid = e.currentTarget.dataset.cid
    this.setData({
      replyingTo: cid,
      replyPlaceholder: '回复 ' + nickname + '...',
      replyToNickname: nickname
    })
  },

  onSendComment: function () {
    var self = this
    var content = this.data.commentText.trim()
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }
    var postId = this.data.postId
    var wxUserInfo = app.globalData.wxUserInfo || {}

    wx.showLoading({ title: '发送中...' })

    var newComment = {
      id: beautyStore.generateCommentId(),
      userKey: app.globalData.userKey,
      nickname: wxUserInfo.nickname || '月友',
      avatar: wxUserInfo.avatarUrl || '',
      content: content,
      createdAt: Date.now()
    }
    if (self.data.replyingTo) {
      newComment.replyTo = self.data.replyingTo
      newComment.replyToNickname = self.data.replyToNickname
      // replyToUserKey 需要从目标评论中获取
      var targetComment = findCommentById(self.data.comments, self.data.replyingTo)
      if (targetComment) newComment.replyToUserKey = targetComment.userKey || ''
    }

    // 乐观更新本地
    var post = self.data.post
    if (post) {
      if (!post.comments) post.comments = []
      post.comments.push(newComment)
      post.commentCount = post.comments.length
      var comments = post.comments.slice()
      comments.forEach(function (c) { c.timeText = self.formatTime(c.createdAt) })
      self.setData({ post: post, comments: comments, commentText: '', replyingTo: null, replyPlaceholder: '写评论...', replyToNickname: '' })
    }

    // safeMergeAndSave 写入云端
    beautyStore.safeMergeAndSave(function (cloudData) {
      if (!cloudData.posts) cloudData.posts = []
      // 找到目标帖子，合并评论
      for (var i = 0; i < cloudData.posts.length; i++) {
        if (cloudData.posts[i].id === postId) {
          if (!cloudData.posts[i].comments) cloudData.posts[i].comments = []
          var exists = false
          for (var j = 0; j < cloudData.posts[i].comments.length; j++) {
            if (cloudData.posts[i].comments[j].id === newComment.id) { exists = true; break }
          }
          if (!exists) cloudData.posts[i].comments.push(newComment)
          cloudData.posts[i].commentCount = cloudData.posts[i].comments.length
          break
        }
      }
      return cloudData
    }, function (success) {
      wx.hideLoading()
      if (success) {
        self.loadPostDetail()
      } else {
        wx.showToast({ title: '发送失败', icon: 'none' })
        self.loadPostDetail()
      }
    })
  },

  // ===== 查看帖子详情 =====
  onTapPost: function (e) {
    audio.playPageFlip()
    var postId = e.currentTarget.dataset.id
    wx.redirectTo({
      url: '/subpkg-beauty/pages/community-detail/community-detail?id=' + postId
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

// 辅助函数：在评论数组中查找指定ID的评论
function findCommentById(comments, id) {
  if (!comments) return null
  for (var i = 0; i < comments.length; i++) {
    if (comments[i].id === id) return comments[i]
  }
  return null
}
