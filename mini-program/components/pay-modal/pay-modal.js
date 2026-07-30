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
      wx.navigateTo({
        url: '/pages/pay/pay'
      })
    },

    onClose: function () {
      // 只通知父组件关闭，不自行修改 property
      this.triggerEvent('close')
    }
  }
})
