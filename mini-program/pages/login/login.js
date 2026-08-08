// pages/login/login.js
const app = getApp()
const store = require('../../utils/store.js')
const config = require('../../utils/config.js')

Page({
  data: {
    showSplash: true,
    // 用户登录
    loginTab: 'sms',
    loginPhone: '',
    smsCode: '',
    smsCooldown: 0,
    smsBtnText: '获取验证码',
    gateError: '',
    wxError: '',
    // 协议勾选
    agreeChecked: false
  },

  _smsCodes: {},
  _smsTimer: null,

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
  },

  // ===== 用户登录 Tab 切换 =====
  switchLoginTab: function (e) {
    this.setData({ loginTab: e.currentTarget.dataset.tab, gateError: '', wxError: '' })
  },

  // ===== 协议勾选 =====
  toggleAgree: function () {
    this.setData({ agreeChecked: !this.data.agreeChecked })
  },

  // ===== 用户手机号输入 =====
  onLoginPhoneInput: function (e) { this.setData({ loginPhone: e.detail.value }) },
  onSmsCodeInput: function (e) { this.setData({ smsCode: e.detail.value }) },

  // ===== 发送验证码 =====
  sendSmsCode: function () {
    var phone = this.data.loginPhone.trim()
    if (!phone) { this.setData({ gateError: '请输入手机号' }); return }
    if (!/^1\d{10}$/.test(phone)) { this.setData({ gateError: '手机号格式不正确' }); return }

    this._smsCodes[phone] = '1'
    wx.showToast({ title: '验证码已发送（任意6位数字）', icon: 'none', duration: 2000 })

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
    // 协议勾选校验
    if (!this.data.agreeChecked) {
      wx.showModal({
        title: '提示',
        content: '请先勾选"我已阅读及同意用户协议及隐私政策"后再登录',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#8b5cf6'
      })
      return
    }

    var phone = this.data.loginPhone.trim()
    var code = this.data.smsCode.trim()

    if (!phone) { this.setData({ gateError: '请输入手机号' }); return }
    if (!/^1\d{10}$/.test(phone)) { this.setData({ gateError: '手机号格式不正确' }); return }
    if (!code || code.length < 6) { this.setData({ gateError: '请输入6位验证码' }); return }
    /* 任意6位数字即可通过（模拟验证） */

    this.setData({ gateError: '' })
    this.doPhoneLogin(phone, 'sms')
  },

  // ===== 微信登录（模拟） =====
  wxLogin: function () {
    // 协议勾选校验
    if (!this.data.agreeChecked) {
      wx.showModal({
        title: '提示',
        content: '请先勾选"我已阅读及同意用户协议及隐私政策"后再登录',
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#8b5cf6'
      })
      return
    }

    var phone = 'wx_' + String(Math.floor(100000 + Math.random() * 900000))
    this.doPhoneLogin(phone, 'wx')
  },

  // ===== 统一手机号登录处理（含管理员识别） =====
  doPhoneLogin: function (phone, loginType) {
    var self = this

    wx.showLoading({ title: '登录中...' })

    // 检查是否是管理员手机号
    var isAdmin = config.ADMIN_PHONES.indexOf(phone) !== -1

    // 绑定手机号
    store.loadPhoneBindings(function (bindings) {
      bindings = bindings || {}
      if (!bindings[phone]) {
        bindings[phone] = phone
        store.savePhoneBindings(bindings)
      }

      // 确保7天试用权限（管理员不需要试用）
      if (!isAdmin) {
        store.loadPayments(function (payments) {
          payments = payments || {}
          if (!payments[phone]) payments[phone] = {}
          if (!payments[phone].storagePaid && !payments[phone].beautyPaid && !payments[phone].trialStart) {
            payments[phone].trialStart = Date.now()
            payments[phone].trialExpires = Date.now() + 7 * 24 * 3600 * 1000
            store.savePayments(payments)
          }
        })
      }

      // 保存登录态 —— 管理员也用手机号作为 userKey，数据各自独立
      app.globalData.loginType = isAdmin ? 'admin' : loginType
      app.globalData.userKey = phone
      app.globalData.isPaid = isAdmin ? true : false
      app.globalData.isTrial = isAdmin ? false : true
      app.globalData.trialExpired = false
      app.globalData.statusReady = true
      // 管理员身份标签
      if (isAdmin) {
        app.globalData.adminRole = config.ADMIN_ROLES[phone] || '管理员'
        store.setLocal('adminRole', app.globalData.adminRole)
      }
      // 升级版状态：管理员直接 true；其他用户从 payments 检查 beautyPaid
      app.globalData.canUseUpgrade = isAdmin ? true : false
      if (!isAdmin) {
        store.loadPayments(function (payments) {
          payments = payments || {}
          var p = payments[phone] || {}
          app.globalData.canUseUpgrade = !!p.beautyPaid
        })
      }

      store.setLocal('loginType', app.globalData.loginType)
      store.setLocal('userKey', phone)

      // 初始化真实手机号（微信用户可能已绑定手机号）
      app.initRealPhone()

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

      // 同步手机用户信息到云端（管理员也同步，便于后台统计）
      store.loadFromCloud('_phone_users', function(phoneUsers) {
        phoneUsers = phoneUsers || {}
        var today = store.localDateStr(new Date())
        phoneUsers[phone] = {
          phone: phone,
          nickname: '',
          gender: '',
          age: '',
          firstLogin: phoneUsers[phone] ? phoneUsers[phone].firstLogin : Date.now(),
          lastLoginDate: today,
          isAdmin: isAdmin
        }
        store.saveToCloud('_phone_users', phoneUsers)
      })

      wx.hideLoading()

      var successMsg = isAdmin ? '管理员登录成功' : '登录成功'
      wx.showToast({ title: successMsg, icon: 'success' })
      setTimeout(function () {
        self.goHome()
      }, 1000)
    })
  },

  // ===== 跳转首页 =====
  goHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})
