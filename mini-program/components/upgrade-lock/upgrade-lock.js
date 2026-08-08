// components/upgrade-lock/upgrade-lock.js
// 29.9升级版购买弹窗 — 与 HTML beautyHomeModal 锁定状态一致
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')
var audio = require('../../utils/audio.js')

Component({
  properties: {
    show: { type: Boolean, value: false }
  },

  data: {
    showActivation: false,      // 激活码输入区展开
    activationCode: '',          // 激活码
    activationMsg: '',           // 激活码提示
    showNotice: false,           // 用户协议弹窗
    showPrivacy: false,         // 隐私说明弹窗
    isWxUser: false,            // 是否微信用户
    wxPhone: '',                // 微信用户输入的手机号
    realPhone: '',               // 绑定的真实手机号
    agreeChecked: false          // 协议勾选状态
  },

  lifetimes: {
    attached: function () {
      this._initWxStatus()
    }
  },

  methods: {
    // ===== 初始化微信用户状态 =====
    _initWxStatus: function () {
      var userKey = app.globalData.userKey || ''
      var isWx = userKey.indexOf('wx_') === 0
      this.setData({
        isWxUser: isWx,
        realPhone: app.getRealPhone()
      })
    },

    // ===== 阻止滑动穿透 =====
    preventMove: function () {},

    // ===== 勾选协议 =====
    toggleAgree: function () {
      audio.playClick()
      this.setData({ agreeChecked: !this.data.agreeChecked })
    },

    // ===== 购买按钮 → 弹出用户协议 =====
    onPay: function () {
      if (!this.data.agreeChecked) {
        wx.showToast({ title: '请先勾选同意购买须知和隐私协议', icon: 'none' })
        return
      }
      audio.playClick()
      this.setData({ showNotice: true })
    },

    // ===== 确认购买（用户协议确认后） =====
    confirmPurchase: function () {
      this.setData({ showNotice: false })
      this.processBeautyPayment()
    },

    // ===== 处理升级版购买（模拟支付） =====
    processBeautyPayment: function () {
      var self = this
      var realPhone = app.getRealPhone()

      if (!realPhone) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      store.loadPayments(function (payments) {
        payments = payments || {}
        if (!payments[realPhone]) payments[realPhone] = {}
        payments[realPhone].beautyPaid = true
        payments[realPhone].beautyPaidAt = Date.now()
        payments[realPhone].beautyPaidBy = 'self'
        payments[realPhone].storagePaid = true
        payments[realPhone].storagePaidAt = Date.now()
        store.savePayments(payments)

        app.globalData.canUseUpgrade = true

        wx.showToast({ title: '升级版已开通，永久有效', icon: 'success', duration: 2000 })

        self.triggerEvent('upgraded', {})

        setTimeout(function () {
          var pages = getCurrentPages()
          var curPage = pages[pages.length - 1]
          if (curPage && curPage.setData) {
            curPage.setData({ canUseUpgrade: true })
          }
        }, 1500)
      })
    },

    // ===== 激活码输入区展开/收起 =====
    showActivationInput: function () {
      audio.playClick()
      this._initWxStatus()
      this.setData({
        showActivation: !this.data.showActivation,
        activationMsg: ''
      })
    },

    onActivationInput: function (e) {
      this.setData({ activationCode: e.detail.value })
    },

    onWxPhoneInput: function (e) {
      this.setData({ wxPhone: e.detail.value })
    },

    // ===== 激活码验证 =====
    verifyActivationCode: function () {
      var self = this
      var userKey = app.globalData.userKey || ''
      var code = (this.data.activationCode || '').trim()
      var wxPhone = (this.data.wxPhone || '').trim()

      if (!userKey) {
        this.setData({ activationMsg: '请先登录' })
        return
      }
      if (!wxPhone || !/^1\d{10}$/.test(wxPhone)) {
        this.setData({ activationMsg: '请输入正确的11位手机号' })
        return
      }
      if (!code) {
        this.setData({ activationMsg: '请输入激活码' })
        return
      }
      if (code.length !== 6) {
        this.setData({ activationMsg: '激活码为6位数字' })
        return
      }

      // 使用输入框的手机号
      var realPhone = wxPhone

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

        // 验证通过 — 绑定手机号
        var isWx = userKey.indexOf('wx_') === 0
        if (isWx) {
          store.loadWxPhoneBindings(function (bindings) {
            bindings = bindings || {}
            bindings[userKey] = realPhone
            store.saveWxPhoneBindings(bindings)
            // 缓存到本地，供 saveState/loadState 同步读取
            store.setLocal('wx_bound_phone', realPhone)
            app.globalData.realPhone = realPhone
            self.setData({ realPhone: realPhone })
            self._doActivateUpgrade(code, realPhone, pi, userKey)
          })
        } else {
          self._doActivateUpgrade(code, realPhone, pi, userKey)
        }
      })
    },

    // ===== 实际开通升级版 =====
    _doActivateUpgrade: function (code, realPhone, pi, userKey) {
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
        payments[realPhone].beautyPaid = true
        payments[realPhone].beautyPaidAt = Date.now()
        payments[realPhone].beautyPaidBy = 'activation_code'
        payments[realPhone].storagePaid = true
        payments[realPhone].storagePaidAt = Date.now()
        payments[realPhone].storagePaidBy = 'activation_code'
        store.savePayments(payments)

        app.globalData.canUseUpgrade = true

        self.setData({
          activationMsg: '',
          showActivation: false,
          activationCode: '',
          wxPhone: ''
        })

        wx.showToast({ title: '激活成功！升级版已开通', icon: 'success', duration: 2000 })
        self.triggerEvent('upgraded', {})

        setTimeout(function () {
          var pages = getCurrentPages()
          var curPage = pages[pages.length - 1]
          if (curPage && curPage.setData) {
            curPage.setData({ canUseUpgrade: true })
          }
        }, 1500)
      })
    },

    // ===== 用户协议 =====
    showPurchaseNotice: function () {
      audio.playClick()
      this.setData({ showNotice: true })
    },

    closeNotice: function () {
      this.setData({ showNotice: false })
    },

    // ===== 隐私说明 =====
    showPrivacyNotice: function () {
      audio.playClick()
      this.setData({ showPrivacy: true })
    },

    closePrivacy: function () {
      this.setData({ showPrivacy: false })
    },

    // ===== 关闭弹窗 =====
    onClose: function () {
      audio.playClick()
      this.triggerEvent('close', {})
      wx.navigateBack()
    }
  }
})
