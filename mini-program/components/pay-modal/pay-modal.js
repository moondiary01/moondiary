// components/pay-modal/pay-modal.js
var store = require('../../utils/store.js')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    showActivation: false,
    activationCode: '',
    activationMsg: ''
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
      this.triggerEvent('close')
    },

    // 激活码切换
    onToggleActivation: function () {
      this.setData({
        showActivation: !this.data.showActivation,
        activationMsg: ''
      })
    },

    onActivationCodeInput: function (e) {
      this.setData({ activationCode: e.detail.value, activationMsg: '' })
    },

    onVerifyActivation: function () {
      var self = this
      var code = this.data.activationCode.trim()

      if (!code) { this.setData({ activationMsg: '请输入激活码' }); return }
      if (code.length !== 6) { this.setData({ activationMsg: '激活码为6位数字' }); return }

      /* 激活码 151601 仅管理员可用 */
      var config = require('../../utils/config.js')
      var ADMIN_ACTIVATION_CODE = '151601'
      if (code === ADMIN_ACTIVATION_CODE) {
        var cp = store.getLocal('userKey')
        if (config.ADMIN_PHONES.indexOf(cp) === -1) {
          this.setData({ activationMsg: '该激活码仅管理员可用' })
          return
        }
      }

      // 检查是否是预设密钥
      if (!store.isPresetKey(code)) {
        // 也检查动态密钥
        var dynamicKeys = store.getLocal('_dynamic_keys')
        try { dynamicKeys = dynamicKeys ? JSON.parse(dynamicKeys) : {}; } catch (e) { dynamicKeys = {}; }
        if (!dynamicKeys[code]) {
          this.setData({ activationMsg: '激活码无效，请联系管理员' })
          return
        }
      }

      // 检查是否被停用
      store.loadPresetInfo(function (pi) {
        pi = pi || {}
        if (pi[code] && pi[code].revoked) {
          self.setData({ activationMsg: '该激活码已被停用' })
          return
        }

        // 检查是否已被其他用户激活
        if (pi[code] && pi[code].activated && pi[code].phone) {
          var currentPhone = store.getLocal('userKey')
          if (pi[code].phone !== currentPhone) {
            self.setData({ activationMsg: '该激活码已被其他用户使用' })
            return
          }
        }

        // 激活成功 — 授予基础版权限
        var currentPhone = store.getLocal('userKey')
        if (!currentPhone) {
          self.setData({ activationMsg: '请先登录' })
          return
        }

        // 标记密钥为已激活
        if (!pi[code]) pi[code] = {}
        pi[code].activated = true
        pi[code].phone = currentPhone
        store.savePresetInfo(pi)

        // 授予基础版权限
        store.loadPayments(function (payments) {
          payments = payments || {}
          if (!payments[currentPhone]) payments[currentPhone] = {}
          payments[currentPhone].storagePaid = true
          payments[currentPhone].storagePaidAt = Date.now()
          store.savePayments(payments)

          self.setData({ activationMsg: '激活成功！已获得普通版权限' })
          wx.showToast({ title: '激活成功', icon: 'success' })

          setTimeout(function () {
            self.triggerEvent('close')
          }, 1500)
        })
      })
    }
  }
})
