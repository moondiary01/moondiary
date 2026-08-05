// pages/pay/pay.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    currentTab: 0,
    showNoticeModal: false,
    showPrivacyModal: false
  },

  onLoad: function () {
    // 检查是否已付费
    if (app.globalData.isPaid) {
      wx.showToast({ title: '您已是付费用户', icon: 'none' })
    }
  },

  switchPayTab: function (e) {
    var tab = parseInt(e.currentTarget.dataset.tab)
    this.setData({ currentTab: tab })
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
    var phone = app.globalData.userKey || ''
    // 获取当前用户的手机号
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      // 查找当前密钥对应的手机号
      var userPhone = ''
      var configKeys = store.getPresetKeys()
      configKeys.forEach(function(k) {
        var info = pi[k] || {}
        if (k === app.globalData.userKey && info.phone) {
          userPhone = info.phone
        }
      })
      if (!userPhone) {
        wx.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }

      // 模拟支付成功
      store.loadPayments(function(payments) {
        payments = payments || {}
        if (!payments[userPhone]) payments[userPhone] = {}
        payments[userPhone].storagePaid = true
        payments[userPhone].storagePaidAt = Date.now()
        store.savePayments(payments)

        // 更新全局状态
        app.globalData.isPaid = true
        app.globalData.statusReady = true

        wx.showToast({ title: '开通成功！永久云端存储已激活', icon: 'success', duration: 2000 })
        setTimeout(function() {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      })
    })
  },

  // ===== 升级版支付 =====
  onBeautyPay: function () {
    var self = this
    wx.showModal({
      title: '确认开通',
      content: '29.9元开通永久升级版（含云端存储+变美计划），确认开通？',
      success: function (res) {
        if (res.confirm) {
          self.processBeautyPayment()
        }
      }
    })
  },

  processBeautyPayment: function () {
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      var userPhone = ''
      var configKeys = store.getPresetKeys()
      configKeys.forEach(function(k) {
        var info = pi[k] || {}
        if (k === app.globalData.userKey && info.phone) {
          userPhone = info.phone
        }
      })
      if (!userPhone) {
        wx.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }

      store.loadPayments(function(payments) {
        payments = payments || {}
        if (!payments[userPhone]) payments[userPhone] = {}
        payments[userPhone].beautyPaid = true
        payments[userPhone].beautyPaidAt = Date.now()
        payments[userPhone].storagePaid = true
        payments[userPhone].storagePaidAt = Date.now()
        store.savePayments(payments)

        app.globalData.isPaid = true
        app.globalData.canUseUpgrade = true
        app.globalData.statusReady = true

        wx.showToast({ title: '开通成功！变美计划已激活', icon: 'success', duration: 2000 })
        setTimeout(function() {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      })
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
    // 根据当前 tab 执行对应购买
    if (this.data.currentTab === 0) {
      this.onBasicPay()
    } else {
      this.onBeautyPay()
    }
  },

  showPrivacyNotice: function () {
    this.setData({ showPrivacyModal: true })
  },

  closePrivacyModal: function () {
    this.setData({ showPrivacyModal: false })
  }
})
