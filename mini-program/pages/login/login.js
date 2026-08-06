// pages/login/login.js
const app = getApp()
const store = require('../../utils/store.js')
const config = require('../../utils/config.js')

const ADMIN_ACTIVATION_CODE = '151601'

Page({
  data: {
    showSplash: true,
    mode: 'user',
    // 用户登录
    loginTab: 'sms',
    loginPhone: '',
    smsCode: '',
    smsCooldown: 0,
    smsBtnText: '获取验证码',
    gateError: '',
    wxError: '',
    // 管理员验证码登录
    adminLoginTab: 'sms',
    adminPhone: '',
    adminSmsCode: '',
    adminSmsCooldown: 0,
    adminSmsBtnText: '获取验证码',
    adminError: '',
    // 管理员激活码登录
    adminCodePhone: '',
    adminActivationCode: '',
    adminCodeError: ''
  },

  _smsCodes: {},
  _smsTimer: null,
  _adminSmsTimer: null,

  onLoad: function () {
    var self = this
    // 从云端同步管理员密码
    store.loadFromCloud('_admin_pw', function(cloudData) {
      if (cloudData && cloudData.password) {
        wx.setStorageSync('admin_pw', cloudData.password)
        config.DEFAULT_ADMIN_PW = cloudData.password
      }
    })
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

  onUnload: function () {
    if (this._smsTimer) clearInterval(this._smsTimer)
    if (this._adminSmsTimer) clearInterval(this._adminSmsTimer)
  },

  // ===== 模式切换 =====
  switchMode: function (e) {
    var mode = e.currentTarget.dataset.mode
    this.setData({
      mode: mode,
      gateError: '',
      adminError: '',
      adminCodeError: ''
    })
  },

  // ===== 用户登录 Tab 切换 =====
  switchLoginTab: function (e) {
    this.setData({ loginTab: e.currentTarget.dataset.tab, gateError: '', wxError: '' })
  },

  // ===== 管理员登录 Tab 切换 =====
  switchAdminLoginTab: function (e) {
    this.setData({ adminLoginTab: e.currentTarget.dataset.tab, adminError: '', adminCodeError: '' })
  },

  // ===== 用户手机号输入 =====
  onLoginPhoneInput: function (e) { this.setData({ loginPhone: e.detail.value }) },
  onSmsCodeInput: function (e) { this.setData({ smsCode: e.detail.value }) },

  // ===== 发送验证码 =====
  sendSmsCode: function () {
    var phone = this.data.loginPhone.trim()
    if (!phone) { this.setData({ gateError: '请输入手机号' }); return }
    if (!/^1\d{10}$/.test(phone)) { this.setData({ gateError: '手机号格式不正确' }); return }

    this._smsCodes[phone] = '888888'
    wx.showToast({ title: '验证码已发送（演示：888888）', icon: 'none', duration: 2000 })

    var self = this
    var cooldown = 60
    this.setData({ smsCooldown: cooldown, smsBtnText: cooldown + 's', gateError: '' })
    if (this._smsTimer) clearInterval(this._smsTimer)
    this._smsTimer = setInterval(function () {
      cooldown--
      if (cooldown <= 0) {
        clearInterval(self._smsTimer)
        self.setData({ smsCooldown: 0, smsBtnText: '获取验证码' })
      } else {
        self.setData({ smsCooldown: cooldown, smsBtnText: cooldown + 's' })
      }
    }, 1000)
  },

  // ===== 用户手机验证码登录 =====
  smsLogin: function () {
    var phone = this.data.loginPhone.trim()
    var code = this.data.smsCode.trim()

    if (!phone) { this.setData({ gateError: '请输入手机号' }); return }
    if (!/^1\d{10}$/.test(phone)) { this.setData({ gateError: '手机号格式不正确' }); return }
    if (!code) { this.setData({ gateError: '请输入验证码' }); return }
    if (this._smsCodes[phone] !== code) { this.setData({ gateError: '验证码不正确' }); return }

    this.setData({ gateError: '' })
    this.doPhoneLogin(phone, 'sms')
  },

  // ===== 微信登录（模拟） =====
  wxLogin: function () {
    var phone = 'wx_' + String(Math.floor(100000 + Math.random() * 900000))
    this.doPhoneLogin(phone, 'wx')
  },

  // ===== 统一手机号登录处理 =====
  doPhoneLogin: function (phone, loginType) {
    var self = this

    wx.showLoading({ title: '登录中...' })

    // 绑定手机号
    store.loadPhoneBindings(function (bindings) {
      bindings = bindings || {}
      if (!bindings[phone]) {
        bindings[phone] = phone
        store.savePhoneBindings(bindings)
      }

      // 确保7天试用权限
      store.loadPayments(function (payments) {
        payments = payments || {}
        if (!payments[phone]) payments[phone] = {}
        if (!payments[phone].storagePaid && !payments[phone].beautyPaid && !payments[phone].trialStart) {
          payments[phone].trialStart = Date.now()
          payments[phone].trialExpires = Date.now() + 7 * 24 * 3600 * 1000
          store.savePayments(payments)
        }
      })

      // 保存登录态
      app.globalData.loginType = loginType
      app.globalData.userKey = phone
      app.globalData.isPaid = false
      app.globalData.isTrial = true
      app.globalData.trialExpired = false
      app.globalData.statusReady = true

      store.setLocal('loginType', loginType)
      store.setLocal('userKey', phone)

      // 初始化用户 state（如果不存在）
      var localState = store.getLocal(store.userStorageKey(phone))
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
        store.saveState(phone, initState)
      }

      // 同步微信用户信息（如果是微信登录）
      if (loginType === 'wx') {
        store.loadWxUsers(function (wxUsers) {
          wxUsers = wxUsers || {}
          if (!wxUsers[phone]) {
            wxUsers[phone] = {
              phone: phone,
              nickname: '',
              gender: '',
              age: '',
              firstLoginTime: Date.now(),
              version: '8.0'
            }
            store.saveWxUsers(wxUsers)
          }
        })
      }

      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(function () {
        self.goHome()
      }, 1000)
    })
  },

  // ===== 管理员手机号输入 =====
  onAdminPhoneInput: function (e) { this.setData({ adminPhone: e.detail.value }) },
  onAdminSmsCodeInput: function (e) { this.setData({ adminSmsCode: e.detail.value }) },
  onAdminCodePhoneInput: function (e) { this.setData({ adminCodePhone: e.detail.value }) },
  onAdminActivationCodeInput: function (e) { this.setData({ adminActivationCode: e.detail.value }) },

  // ===== 管理员发送验证码 =====
  sendAdminSmsCode: function () {
    var phone = this.data.adminPhone.trim()
    if (!phone) { this.setData({ adminError: '请输入手机号' }); return }
    if (phone !== config.ADMIN_PHONE) { this.setData({ adminError: '该手机号无管理员权限' }); return }

    this._smsCodes['admin_' + phone] = '888888'
    wx.showToast({ title: '验证码已发送（演示：888888）', icon: 'none', duration: 2000 })

    var self = this
    var cooldown = 60
    this.setData({ adminSmsCooldown: cooldown, adminSmsBtnText: cooldown + 's', adminError: '' })
    if (this._adminSmsTimer) clearInterval(this._adminSmsTimer)
    this._adminSmsTimer = setInterval(function () {
      cooldown--
      if (cooldown <= 0) {
        clearInterval(self._adminSmsTimer)
        self.setData({ adminSmsCooldown: 0, adminSmsBtnText: '获取验证码' })
      } else {
        self.setData({ adminSmsCooldown: cooldown, adminSmsBtnText: cooldown + 's' })
      }
    }, 1000)
  },

  // ===== 管理员验证码登录 =====
  adminSmsLogin: function () {
    var phone = this.data.adminPhone.trim()
    var code = this.data.adminSmsCode.trim()

    if (!phone) { this.setData({ adminError: '请输入手机号' }); return }
    if (phone !== config.ADMIN_PHONE) { this.setData({ adminError: '该手机号无管理员权限' }); return }
    if (!code) { this.setData({ adminError: '请输入验证码' }); return }
    if (this._smsCodes['admin_' + phone] !== code) { this.setData({ adminError: '验证码不正确' }); return }

    this.setData({ adminError: '' })
    this.doAdminLogin()
  },

  // ===== 管理员激活码登录 =====
  adminCodeLogin: function () {
    var phone = this.data.adminCodePhone.trim()
    var code = this.data.adminActivationCode.trim()

    if (!phone) { this.setData({ adminCodeError: '请输入手机号' }); return }
    if (phone !== config.ADMIN_PHONE) { this.setData({ adminCodeError: '该手机号无管理员权限' }); return }
    if (!code) { this.setData({ adminCodeError: '请输入激活码' }); return }
    if (code !== ADMIN_ACTIVATION_CODE) { this.setData({ adminCodeError: '激活码不正确' }); return }

    this.setData({ adminCodeError: '' })
    this.doAdminLogin()
  },

  // ===== 管理员登录处理 =====
  doAdminLogin: function () {
    app.globalData.loginType = 'admin'
    app.globalData.userKey = 'admin'
    app.globalData.isPaid = true
    app.globalData.isTrial = false
    app.globalData.trialExpired = false
    app.globalData.statusReady = true
    app.globalData.canUseUpgrade = true

    store.setLocal('loginType', 'admin')
    store.setLocal('userKey', 'admin')

    wx.showToast({ title: '管理员登录成功', icon: 'success' })
    var self = this
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
