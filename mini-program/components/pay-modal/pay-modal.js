// components/pay-modal/pay-modal.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onNotice: function () {
      // 打开购买须知页面
      wx.navigateTo({
        url: '/pages/notice/notice'
      })
    },

    onPrivacy: function () {
      // 打开隐私协议页面
      wx.navigateTo({
        url: '/pages/privacy/privacy'
      })
    },

    onPay: function () {
      // 跳转到支付页面
      wx.navigateTo({
        url: '/pages/pay/pay'
      })
    },

    onClose: function () {
      this.triggerEvent('close')
    }
  }
})
