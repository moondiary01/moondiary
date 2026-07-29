// pages/pay/pay.js
Page({
  onPay: function () {
    wx.showToast({
      title: '支付功能即将开通，请联系客服',
      icon: 'none',
      duration: 2500
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
