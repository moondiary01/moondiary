var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    canUseUpgrade: false,
    currentTab: 'feed', // feed / post / mine
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
    editingProfile: false
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
    this.loadPosts()
    this.loadMyProfile()
  },

  onShow: function () {
    this.setData({ canUseUpgrade: app.globalData.canUseUpgrade || false })
  },

  onPullDownRefresh: function () {
    if (this.data.currentTab === 'feed') {
      this.loadPosts(function () { wx.stopPullDownRefresh() })
    } else {
      wx.stopPullDownRefresh()
    }
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
    }
  },

  // ===== 加载帖子 =====
  loadPosts: function (callback) {
    var self = this
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) {
        data = { version: 1, posts: [] }
      }
      var posts = data.posts.slice()
      posts.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })
      for (var i = 0; i < posts.length; i++) {
        posts[i].timeText = self.formatTime(posts[i].createdAt)
        var likedBy = posts[i].likedBy || []
        posts[i].isLiked = likedBy.indexOf(app.globalData.userKey) > -1
      }
      self.setData({ posts: posts, loading: false })
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
      }
      self.setData({ myPosts: myPosts })
    })
  },

  // ===== 加载我的资料 =====
  loadMyProfile: function () {
    var self = this
    var userKey = app.globalData.userKey
    var store = require('../../../utils/store.js')
    store.loadFromCloud('beauty/community/profiles', function (data) {
      if (data && data[userKey]) {
        self.setData({
          myProfile: data[userKey]
        })
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
    beautyStore.loadPosts(function (data) {
      if (!data || !data.posts) {
        data = { version: 1, posts: [] }
      }

      var postId = beautyStore.generatePostId()
      var now = Date.now()
      var profile = self.data.myProfile

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
        likeCount: 0,
        commentCount: 0,
        likedBy: [],
        createdAt: now,
        version: 1
      }

      data.posts.unshift(newPost)

      beautyStore.savePosts(data, function (success) {
        wx.hideLoading()
        if (success) {
          self.setData({ postContent: '', postImages: [], currentTab: 'feed' })
          wx.showToast({ title: '发布成功', icon: 'success' })
          self.loadPosts()
        } else {
          wx.showToast({ title: '发布失败', icon: 'none' })
        }
      })
    })
  },

  // ===== 点赞 =====
  onLikePost: function (e) {
    audio.playClick()
    var self = this
    var postId = e.currentTarget.dataset.id
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
        if (success) { self.loadPosts() }
      })
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
