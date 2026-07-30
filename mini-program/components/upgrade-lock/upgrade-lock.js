Component({
  properties: {
    show: { type: Boolean, value: false }
  },
  methods: {
    onPay: function () {
      wx.navigateTo({ url: '/pages/pay/pay?tab=upgrade' })
    },
    onClose: function () {
      wx.navigateBack()
    }
  }
})
