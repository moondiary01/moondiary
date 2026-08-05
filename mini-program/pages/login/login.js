// pages/login/login.js
const app = getApp()
const store = require('../../utils/store.js')
const config = require('../../utils/config.js')

Page({
  data: {
    showSplash: true,
    mode: 'user',
    keyPhone: '',
    keyCode: '',
    adminPhone: '',
    adminPassword: ''
  },

  onLoad: function () {
    var self = this
    // Splash 动画 2.8s 后显示登录页
    setTimeout(function () {
      self.setData({ showSplash: false })
    }, 2800)

    // 检查是否已登录，如果已登录直接跳转首页
    var loginType = store.getLocal('loginType')
    var userKey = store.getLocal('userKey')
    if (loginType && userKey) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  // ===== 模式切换 =====
  switchMode: function (e) {
    var mode = e.currentTarget.dataset.mode
    this.setData({ mode: mode })
  },

  // ===== 密钥登录 =====
  onKeyPhoneInput: function (e) {
    this.setData({ keyPhone: e.detail.value })
  },
  onKeyCodeInput: function (e) {
    this.setData({ keyCode: e.detail.value })
  },
  onKeyLogin: function () {
    var self = this
    var phone = this.data.keyPhone
    var key = this.data.keyCode

    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!key || key.length !== 6) {
      wx.showToast({ title: '请输入6位密钥', icon: 'none' })
      return
    }

    // 验证密钥是否在 PRESET_KEYS 里
    if (!store.isPresetKey(key)) {
      wx.showToast({ title: '密钥无效', icon: 'none' })
      return
    }

    wx.showLoading({ title: '验证中...' })

    // 先检查密钥是否已被停用
    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}
      var keyInfo = presetInfo[key]
      if (keyInfo && keyInfo.revoked) {
        wx.hideLoading()
        wx.showToast({ title: '该密钥已被停用，请联系管理员', icon: 'none', duration: 2000 })
        setTimeout(function () {
          wx.navigateTo({ url: '/pages/pay/pay' })
        }, 2000)
        return
      }

      // 验证手机号绑定
      store.loadPhoneBindings(function (bindings) {
      bindings = bindings || {}

      // 网页版结构: {phone: key}
      if (bindings[phone]) {
        // 该手机号已绑定密钥
        if (bindings[phone] !== key) {
          wx.hideLoading()
          wx.showToast({ title: '该手机号已绑定其他密钥', icon: 'none' })
          return
        }
      } else {
        // 未绑定，绑定当前手机号到密钥
        bindings[phone] = key
        store.savePhoneBindings(bindings)
      }

      var userKey = key

      // 保存登录态
      app.globalData.loginType = 'key'
      app.globalData.userKey = userKey
      app.globalData.isPaid = true
      app.globalData.isTrial = false
      app.globalData.trialExpired = false
      app.globalData.statusReady = true

      store.setLocal('loginType', 'key')
      store.setLocal('userKey', userKey)

      // 初始化密钥用户 state（如果不存在）
      var localState = store.getLocal(store.userStorageKey(userKey))
      if (!localState) {
        var initState = {
          version: 3,
          name: '',
          gender: '',
          age: null,
          height: null,
          startDate: '',
          targetDate: '',
          startWeight: null,
          targetWeight: null,
          startFat: null,
          bust: null,
          waist: null,
          hip: null,
          unit: '斤',
          calGoal: 1400,
          waterGoal: 2000,
          days: [],
          weeklyReview: [],
          periods: [],
          avatar: ''
        }
        store.saveState(userKey, initState)
      }

      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(function () {
        self.goHome()
      }, 1000)
      }) // loadPhoneBindings
    }) // loadPresetInfo
  },

  // ===== 管理员登录 =====
  onAdminPhoneInput: function (e) {
    this.setData({ adminPhone: e.detail.value })
  },
  onAdminPasswordInput: function (e) {
    this.setData({ adminPassword: e.detail.value })
  },
  onAdminLogin: function () {
    var self = this
    var phone = this.data.adminPhone
    var password = this.data.adminPassword

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    // 验证手机号
    if (phone !== config.ADMIN_PHONE) {
      wx.showToast({ title: '管理员手机号错误', icon: 'none' })
      return
    }

    // 验证密码
    if (password !== config.DEFAULT_ADMIN_PW) {
      wx.showToast({ title: '密码错误', icon: 'none' })
      return
    }

    // 保存登录态
    app.globalData.loginType = 'admin'
    app.globalData.userKey = 'admin'
    app.globalData.isPaid = true
    app.globalData.isTrial = false
    app.globalData.trialExpired = false
    app.globalData.statusReady = true
    app.globalData.canUseUpgrade = true

    store.setLocal('loginType', 'admin')
    store.setLocal('userKey', 'admin')

    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(function () {
      self.goHome()
    }, 1000)
  },

  // ===== 跳转首页 =====
  goHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})
