// pages/pay/pay.js
// 19.9元普通版购买页面（唯一购买入口，无29.9升级版tab）
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    showNoticeModal: false,
    showPrivacyModal: false,
    showActivation: false,       // 激活码输入区展开
    activationCode: '',          // 激活码
    activationMsg: '',           // 激活码提示
    isWxUser: false,            // 是否微信用户
    wxPhone: '',                // 微信用户输入的手机号
    realPhone: ''               // 绑定的真实手机号
  },

  onLoad: function () {
    // 检查是否已付费
    if (app.globalData.isPaid) {
      wx.showToast({ title: '您已是付费用户', icon: 'none' })
    }
    this._initWxStatus()
  },

  // ===== 初始化微信用户状态 =====
  _initWxStatus: function () {
    var userKey = app.globalData.userKey || ''
    this.setData({
      isWxUser: userKey.indexOf('wx_') === 0,
      realPhone: app.getRealPhone()
    })
  },

  // ===== 基础版支付 =====
  onBasicPay: function () {
    var self = this
    wx.showModal({
      title: '确认开通',
      content: '19.9元开通永久云端存储，确认开通？',
      success: function (res) {
        if (res.confirm) {
          self.processBasicPayment()
        }
      }
    })
  },

  processBasicPayment: function () {
    var self = this
    var realPhone = app.getRealPhone()
    if (!realPhone) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    // 模拟支付成功
    store.loadPayments(function (payments) {
      payments = payments || {}
      if (!payments[realPhone]) payments[realPhone] = {}
      payments[realPhone].storagePaid = true
      payments[realPhone].storagePaidAt = Date.now()
      payments[realPhone].storagePaidBy = 'self'
      store.savePayments(payments)

      app.globalData.isPaid = true
      app.globalData.statusReady = true

      wx.showToast({ title: '开通成功！永久云端存储已激活', icon: 'success', duration: 2000 })
      setTimeout(function () {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)
    })
  },

  // ===== 购买须知 / 隐私说明 =====
  showPurchaseNotice: function () {
    this.setData({ showNoticeModal: true })
  },

  closeNoticeModal: function () {
    this.setData({ showNoticeModal: false })
  },

  confirmPurchase: function () {
    this.setData({ showNoticeModal: false })
    this.onBasicPay()
  },

  showPrivacyNotice: function () {
    this.setData({ showPrivacyModal: true })
  },

  closePrivacyModal: function () {
    this.setData({ showPrivacyModal: false })
  },

  // ===== 19.9普通版激活码 =====
  showActivationInput: function () {
    this._initWxStatus()
    this.setData({ showActivation: !this.data.showActivation, activationMsg: '' })
  },

  onActivationInput: function (e) {
    this.setData({ activationCode: e.detail.value })
  },

  onWxPhoneInput: function (e) {
    this.setData({ wxPhone: e.detail.value })
  },

  verifyActivationCode: function () {
    var self = this
    var userKey = app.globalData.userKey || ''
    var code = (this.data.activationCode || '').trim()
    var isWx = userKey.indexOf('wx_') === 0
    var wxPhone = (this.data.wxPhone || '').trim()

    if (!userKey) { this.setData({ activationMsg: '请先登录' }); return }
    if (!code) { this.setData({ activationMsg: '请输入激活码' }); return }
    if (code.length !== 6) { this.setData({ activationMsg: '激活码为6位数字' }); return }

    // 微信用户必须填写手机号
    if (isWx && !wxPhone) {
      this.setData({ activationMsg: '请填写手机号以绑定账号' })
      return
    }
    if (isWx && wxPhone.length < 11) {
      this.setData({ activationMsg: '请输入11位手机号' })
      return
    }

    // 绑定手机号
    var realPhone = isWx ? wxPhone : userKey

    // 管理员专属激活码
    var ADMIN_ACTIVATION_CODE = '151601'
    if (code === ADMIN_ACTIVATION_CODE) {
      if (config.ADMIN_PHONES.indexOf(realPhone) === -1 && config.ADMIN_PHONES.indexOf(userKey) === -1) {
        this.setData({ activationMsg: '该激活码仅管理员可用' })
        return
      }
    }

    // 检查是否是预设密钥
    if (!store.isPresetKey(code)) {
      this.setData({ activationMsg: '激活码无效，请联系管理员' })
      return
    }

    // 检查激活码状态
    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      if (pi[code] && pi[code].revoked) {
        self.setData({ activationMsg: '该激活码已被停用' })
        return
      }
      if (pi[code] && pi[code].activated && pi[code].phone && pi[code].phone !== realPhone) {
        self.setData({ activationMsg: '该激活码已被其他用户使用' })
        return
      }

      // 验证通过 — 绑定微信→手机号（如有）
      if (isWx) {
        store.loadWxPhoneBindings(function (bindings) {
          bindings = bindings || {}
          bindings[userKey] = realPhone
          store.saveWxPhoneBindings(bindings)
          // 缓存到本地，供 saveState/loadState 同步读取
          store.setLocal('wx_bound_phone', realPhone)
          app.globalData.realPhone = realPhone
          self.setData({ realPhone: realPhone })
          self._doActivateBasic(code, realPhone, pi, userKey)
        })
      } else {
        self._doActivateBasic(code, realPhone, pi, userKey)
      }
    })
  },

  // ===== 实际开通普通版 =====
  _doActivateBasic: function (code, realPhone, pi, userKey) {
    var self = this

    // 绑定激活码到真实手机号
    if (!pi[code]) pi[code] = {}
    pi[code].activated = true
    pi[code].phone = realPhone
    pi[code].activatedAt = new Date().toISOString()
    store.savePresetInfo(pi)

    store.loadPayments(function (payments) {
      payments = payments || {}

      // 新数据写到 realPhone，旧 wx_ID 数据保留不动（不做迁移）
      if (!payments[realPhone]) payments[realPhone] = {}
      payments[realPhone].storagePaid = true
      payments[realPhone].storagePaidAt = Date.now()
      payments[realPhone].storagePaidBy = 'activation_code'
      store.savePayments(payments)

      app.globalData.isPaid = true
      app.globalData.statusReady = true

      self.setData({ activationMsg: '', showActivation: false, activationCode: '', wxPhone: '' })
      wx.showToast({ title: '激活成功！普通版已开通', icon: 'success' })

      setTimeout(function () {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)
    })
  }
})
