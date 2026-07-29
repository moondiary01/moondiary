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
      wx.navigateTo({
        url: '/pages/notice/notice'
      })
    },

    onPrivacy: function () {
      wx.navigateTo({
        url: '/pages/privacy/privacy'
      })
    },

    onPay: function () {
      wx.showToast({
        title: '支付功能即将开通，请联系客服',
        icon: 'none',
        duration: 2500
      })
    },

    onClose: function () {
      this.setData({ show: false })
      this.triggerEvent('close')
    }
  }
})
