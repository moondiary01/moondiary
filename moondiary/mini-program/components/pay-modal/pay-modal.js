// components/pay-modal/pay-modal.js
var store = require('../../utils/store.js')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    // 弹窗模式：'expired' 试用到期 | 'unlock' 主动购买
    mode: {
      type: String,
      value: 'expired'
    },
    // 是否管理员预览模式（显示返回按钮）
    isAdminPreview: {
      type: Boolean,
      value: false
    }
  },

  data: {
    activationCode: '',
    activationMsg: '',
    titleText: '试用已到期',
    subText: '7天免费试用结束，购买后继续使用',
    isWxUser: false,
    wxPhone: '',
    agreeChecked: false
  },

  observers: {
    'mode': function (mode) {
      if (mode === 'unlock') {
        this.setData({
          titleText: '解锁该版本权限',
          subText: '您目前为试用期（试用期为7天），也可点击下方直接购买，解锁此权限'
        })
      } else {
        this.setData({
          titleText: '试用已到期',
          subText: '7天免费试用结束，购买后继续使用'
        })
      }
    },
    'show': function (show) {
      if (show) {
        this._initWxStatus()
        this.setData({ agreeChecked: false, _scrollTop: 0 })
      }
    }
  },

  methods: {
    // ===== 初始化微信用户状态 =====
    _initWxStatus: function () {
      var userKey = store.getLocal('userKey') || ''
      this.setData({ isWxUser: userKey.indexOf('wx_') === 0 })
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
    },

    // ===== 勾选协议 =====
    toggleAgree: function () {
      this.setData({ agreeChecked: !this.data.agreeChecked })
    },

    onPay: function () {
      if (!this.data.agreeChecked) {
        wx.showToast({ title: '请先勾选同意购买须知和隐私协议', icon: 'none' })
        return
      }
      wx.navigateTo({
        url: '/pages/pay/pay'
      })
    },

    onClose: function () {
      this.triggerEvent('close')
    },

    // 管理员预览模式：返回管理员后台
    onBackToAdmin: function () {
      this.triggerEvent('close')
    },

    onActivationCodeInput: function (e) {
      this.setData({ activationCode: e.detail.value, activationMsg: '' })
    },

    onWxPhoneInput: function (e) {
      this.setData({ wxPhone: e.detail.value })
    },

    onVerifyActivation: function () {
      var self = this
      var code = (this.data.activationCode || '').trim()
      var userKey = store.getLocal('userKey') || ''
      var isWx = userKey.indexOf('wx_') === 0
      var wxPhone = (this.data.wxPhone || '').trim()

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

      var realPhone = isWx ? wxPhone : userKey

      /* 激活码 151601 仅管理员可用 */
      var config = require('../../utils/config.js')
      var ADMIN_ACTIVATION_CODE = '151601'
      if (code === ADMIN_ACTIVATION_CODE) {
        if (config.ADMIN_PHONES.indexOf(realPhone) === -1 && config.ADMIN_PHONES.indexOf(userKey) === -1) {
          this.setData({ activationMsg: '该激活码仅管理员可用' })
          return
        }
      }

      // 检查是否是预设密钥
      if (!store.isPresetKey(code)) {
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
          if (pi[code].phone !== realPhone) {
            self.setData({ activationMsg: '该激活码已被其他用户使用' })
            return
          }
        }

        if (!userKey) {
          self.setData({ activationMsg: '请先登录' })
          return
        }

        // 绑定微信→手机号（如有）
        if (isWx) {
          store.loadWxPhoneBindings(function (bindings) {
            bindings = bindings || {}
            bindings[userKey] = realPhone
            store.saveWxPhoneBindings(bindings)
            // 缓存到本地，供 saveState/loadState 同步读取
            store.setLocal('wx_bound_phone', realPhone)
            // 更新全局 realPhone
            var app = getApp()
            if (app && app.globalData) {
              app.globalData.realPhone = realPhone
            }
            self._doActivate(code, realPhone, pi, userKey)
          })
        } else {
          self._doActivate(code, realPhone, pi, userKey)
        }
      })
    },

    // ===== 实际开通普通版 =====
    _doActivate: function (code, realPhone, pi, userKey) {
      var self = this

      // 标记密钥为已激活
      if (!pi[code]) pi[code] = {}
      pi[code].activated = true
      pi[code].phone = realPhone
      store.savePresetInfo(pi)

      // 授予基础版权限
      store.loadPayments(function (payments) {
        payments = payments || {}

        // 新数据写到 realPhone，旧 wx_ID 数据保留不动（不做迁移）
        if (!payments[realPhone]) payments[realPhone] = {}
        payments[realPhone].storagePaid = true
        payments[realPhone].storagePaidAt = Date.now()
        payments[realPhone].storagePaidBy = 'activation_code'
        store.savePayments(payments)

        self.setData({ activationMsg: '激活成功！已获得普通版权限', activationCode: '', wxPhone: '' })
        wx.showToast({ title: '激活成功', icon: 'success' })

        setTimeout(function () {
          self.triggerEvent('close')
        }, 1500)
      })
    }
  }
})
