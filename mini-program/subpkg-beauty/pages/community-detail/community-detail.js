var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    postId: '',
    post: null,
    comments: [],
    commentText: '',
    loading: true,
    canUseUpgrade: false,
    replyingTo: null,
    replyPlaceholder: '写评论...',
    // 用户主页模式
    viewMode: 'detail', // detail / profile
    profileUserKey: '',
    profileData: null,
    profilePosts: []
  },

  onLoad: function (options) {
    audio.playEnter()

    if (options.view === 'profile' && options.userKey) {
      // 用户主页模式
      this.setData({
        viewMode: 'profile',
        profileUserKey: options.userKey,
        canUseUpgrade: app.globalData.canUseUpgrade || false
      })
      this.loadUserProfile(options.userKey)
      this.loadUserPosts(options.userKey)
    } else {
      // 帖子详情模式
      this.setData({
        postId: options.id,
        canUseUpgrade: app.globalData.canUseUpgrade || false
      })
      this.loadPostDetail()
    }
  },

  // ===== 帖子详情 =====
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
        if (data.posts[i].id === postId) {
          post = data.posts[i]
          break
        }
      }
      if (post) {
        post.timeText = self.formatTime(post.createdAt)
        var userKey = app.globalData.userKey
        post.isLiked = post.likedBy && post.likedBy.indexOf(userKey) > -1
        self.setData({ post: post, loading: false })
      } else {
        self.setData({ loading: false })
        wx.showToast({ title: '帖子不存在', icon: 'none' })
      }
      self.loadComments()
    })
  },

  loadComments: function () {
    var self = this
    var postId = this.data.postId
    beautyStore.loadComments(postId, function (data) {
      if (!data || !data.comments) {
        data = { version: 1, comments: [] }
      }
      var comments = data.comments.slice()
      comments.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0) })
      for (var i = 0; i < comments.length; i++) {
        comments[i].timeText = self.formatTime(comments[i].createdAt)
      }
      self.setData({ comments: comments })
    })
  },

  onLikePost: function () {
    audio.playClick()
    var self = this
    var postId = this.data.postId
    var userKey = app.globalData.userKey

    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      for (var i = 0; i < data.posts.length; i++) {
        if (data.posts[i].id === postId) {
          var likedBy = data.posts[i].likedBy || []
          var idx = likedBy.indexOf(userKey)
          if (idx > -1) {
            likedBy.splice(idx, 1)
            data.posts[i].likeCount = Math.max(0, (data.posts[i].likeCount || 0) - 1)
          } else {
            likedBy.push(userKey)
            data.posts[i].likeCount = (data.posts[i].likeCount || 0) + 1
          }
          data.posts[i].likedBy = likedBy
          break
        }
      }
      beautyStore.savePosts(data, function (success) {
        if (success) { self.loadPostDetail() }
      })
    })
  },

  onCommentInput: function (e) {
    this.setData({ commentText: e.detail.value })
  },

  onFocusComment: function () {
    this.setData({ replyingTo: null, replyPlaceholder: '写评论...' })
  },

  onReplyComment: function (e) {
    audio.playClick()
    var nickname = e.currentTarget.dataset.nickname
    var cid = e.currentTarget.dataset.cid
    this.setData({
      replyingTo: cid,
      replyPlaceholder: '回复 ' + nickname + '...'
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
    var userInfo = app.globalData.wxUserInfo || {}

    wx.showLoading({ title: '发送中...' })
    beautyStore.loadComments(postId, function (data) {
      if (!data || !data.comments) {
        data = { version: 1, comments: [] }
      }

      var newComment = {
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userKey: app.globalData.userKey,
        nickname: userInfo.nickname || '月友',
        avatar: userInfo.avatarUrl || '',
        content: content,
        replyTo: self.data.replyingTo || null,
        createdAt: Date.now()
      }

      data.comments.push(newComment)
      beautyStore.saveComments(postId, data, function (success) {
        wx.hideLoading()
        if (success) {
          self.setData({ commentText: '', replyingTo: null, replyPlaceholder: '写评论...' })
          self.loadComments()
          self.updateCommentCount()
        } else {
          wx.showToast({ title: '发送失败', icon: 'none' })
        }
      })
    })
  },

  updateCommentCount: function () {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      for (var i = 0; i < data.posts.length; i++) {
        if (data.posts[i].id === self.data.postId) {
          data.posts[i].commentCount = (data.posts[i].commentCount || 0) + 1
          break
        }
      }
      beautyStore.savePosts(data, function () { self.loadPostDetail() })
    })
  },

  onPreviewImage: function (e) {
    var urls = this.data.post.images
    var current = e.currentTarget.dataset.src
    wx.previewImage({ current: current, urls: urls })
  },

  // ===== 用户主页 =====
  loadUserProfile: function (userKey) {
    var self = this
    var store = require('../../../utils/store.js')
    store.loadFromCloud('beauty/community/profiles', function (data) {
      if (data && data[userKey]) {
        self.setData({ profileData: data[userKey], loading: false })
      } else {
        // 从帖子中获取基本信息
        beautyStore.loadPosts(function (postData) {
          if (postData && postData.posts) {
            for (var i = 0; i < postData.posts.length; i++) {
              if (postData.posts[i].userKey === userKey) {
                self.setData({
                  profileData: {
                    nickname: postData.posts[i].nickname || '月友',
                    avatar: postData.posts[i].avatar || '',
                    gender: postData.posts[i].gender || '',
                    age: postData.posts[i].age || '',
                    signature: postData.posts[i].signature || ''
                  },
                  loading: false
                })
                return
              }
            }
          }
          self.setData({ profileData: { nickname: '月友' }, loading: false })
        })
      }
    })
  },

  loadUserPosts: function (userKey) {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) return
      var posts = data.posts.filter(function (p) { return p.userKey === userKey })
      posts.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })
      for (var i = 0; i < posts.length; i++) {
        posts[i].timeText = self.formatTime(posts[i].createdAt)
      }
      self.setData({ profilePosts: posts })
    })
  },

  onTapPost: function (e) {
    audio.playPageFlip()
    var postId = e.currentTarget.dataset.id
    wx.redirectTo({
      url: '/subpkg-beauty/pages/community-detail/community-detail?id=' + postId
    })
  },

  onPreviewImageInProfile: function (e) {
    var urls = e.currentTarget.dataset.urls
    var current = e.currentTarget.dataset.src
    wx.previewImage({ current: current, urls: urls })
  },

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
