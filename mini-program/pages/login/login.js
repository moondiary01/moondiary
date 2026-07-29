// pages/login/login.js
const app = getApp()
const store = require('../../utils/store.js')
const config = require('../../utils/config.js')

Page({
  data: {
    currentTab: 0,
    keyPhone: '',
    keyCode: '',
    adminPhone: '',
    adminPassword: ''
  },

  // ===== Tab 切换 =====
  switchTab: function (e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: Number(tab) })
  },

  // ===== 微信登录 =====
  onWxLogin: function () {
    var self = this
    wx.showLoading({ title: '登录中...' })

    wx.login({
      success: function (res) {
        if (!res.code) {
          wx.hideLoading()
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          return
        }

        // 临时方案：用 code 生成临时 openid（等后端部署后替换）
        var tempOpenid = res.code.substring(0, 16)
        var userKey = 'wx_' + tempOpenid

        // 查询 _wx_users.json 看是否已注册
        store.loadWxUsers(function (wxUsers) {
          wxUsers = wxUsers || {}
          var userInfo = wxUsers[userKey]

          if (userInfo) {
            // 已注册用户
            var status = store.checkUserStatus(userInfo)
            app.globalData.loginType = 'wx'
            app.globalData.userKey = userKey
            app.globalData.isPaid = status.isPaid
            app.globalData.isTrial = status.isTrial
            app.globalData.trialExpired = status.trialExpired || false
            app.globalData.wxUserInfo = userInfo

            store.setLocal('loginType', 'wx')
            store.setLocal('userKey', userKey)

            wx.hideLoading()
            self.goHome()
          } else {
            // 未注册，创建记录
            var now = Date.now()
            var newUserInfo = {
              openid: tempOpenid,
              firstLoginTime: now,
              paidUntil: null,
              createdAt: now
            }
            wxUsers[userKey] = newUserInfo
            store.saveWxUsers(wxUsers)

            app.globalData.loginType = 'wx'
            app.globalData.userKey = userKey
            app.globalData.isPaid = false
            app.globalData.isTrial = true
            app.globalData.trialExpired = false
            app.globalData.wxUserInfo = newUserInfo

            store.setLocal('loginType', 'wx')
            store.setLocal('userKey', userKey)

            wx.hideLoading()
            wx.showToast({ title: '欢迎！24小时免费试用', icon: 'none', duration: 2000 })
            setTimeout(function () {
              self.goHome()
            }, 1500)
          }
        })
      },
      fail: function () {
        wx.hideLoading()
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    })
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

    // 验证手机号绑定
    store.loadPhoneBindings(function (bindings) {
      bindings = bindings || {}

      if (bindings[key]) {
        // 密钥已绑定手机号
        if (bindings[key] !== phone) {
          wx.hideLoading()
          wx.showToast({ title: '该密钥已绑定其他手机号', icon: 'none' })
          return
        }
      } else {
        // 未绑定，绑定当前手机号
        bindings[key] = phone
        store.savePhoneBindings(bindings)
      }

      var userKey = key

      // 保存登录态
      app.globalData.loginType = 'key'
      app.globalData.userKey = userKey
      app.globalData.isPaid = true
      app.globalData.isTrial = false
      app.globalData.trialExpired = false

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
    })
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
