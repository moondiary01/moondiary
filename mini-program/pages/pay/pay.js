// pages/pay/pay.js
var app = getApp()

Page({
  data: {
    currentTab: 'basic', // basic / upgrade
    basicPrice: '19.9',
    upgradePrice: '29.9'
  },

  onLoad: function (options) {
    if (options && options.tab === 'upgrade') {
      this.setData({ currentTab: 'upgrade' })
    }
  },

  onTabChange: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
  },

  onPay: function () {
    var tab = this.data.currentTab
    if (tab === 'basic') {
      wx.showToast({
        title: '基础版支付功能即将开通，请联系客服',
        icon: 'none',
        duration: 2500
      })
    } else {
      // 升级版支付
      this.onPayUpgrade()
    }
  },

  onPayUpgrade: function () {
    var self = this
    var userKey = app.globalData.userKey
    var loginType = app.globalData.loginType

    // 密钥用户和管理员免费使用
    if (loginType === 'key' || loginType === 'admin') {
      wx.showToast({
        title: '您可免费使用升级版',
        icon: 'success',
        duration: 2000
      })
      return
    }

    wx.showModal({
      title: '升级版会员',
      content: '29.9元永久使用，是否立即开通升级版？',
      confirmText: '立即开通',
      confirmColor: '#8b5cf6',
      success: function (res) {
        if (res.confirm) {
          // 模拟支付成功（实际应调用微信支付）
          self.processUpgradePayment()
        }
      }
    })
  },

  processUpgradePayment: function () {
    var self = this
    wx.showLoading({ title: '支付中...' })

    var store = require('../../utils/store.js')
    var userKey = app.globalData.userKey

    // 读取用户信息
    store.loadFromCloud('_wx_users', function (data) {
      if (!data) data = {}
      if (!data[userKey]) data[userKey] = {}

      var now = Date.now()
      // 永久使用 - 设置100年后过期
      data[userKey].upgradePaidUntil = now + 36500 * 24 * 60 * 60 * 1000

      store.saveToCloud('_wx_users', data, function (success) {
        wx.hideLoading()
        if (success) {
          // 更新全局状态
          app.globalData.canUseUpgrade = true
          app.globalData.upgradeExpired = false
          wx.showToast({
            title: '开通成功！',
            icon: 'success',
            duration: 2000
          })
          setTimeout(function () {
            wx.navigateBack()
          }, 1500)
        } else {
          wx.showToast({
            title: '支付失败，请重试',
            icon: 'none'
          })
        }
      })
    })
  },

  onNotice: function () {
    wx.navigateTo({
      url: '/pages/notice/notice'
    })
  },

  onPrivacy: function () {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    })
  }
})
