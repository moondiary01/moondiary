// pages/admin/admin.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    adminStats: { free: 0, trial: 0, vipBasic: 0, vipUpgrade: 0, total: 0 },
    appVersion: '7.1',
    noticeContent: '',
    noticeSent: false,
    keyList: [],
    keySearchPhone: '',
    paymentPhone: '',
    paymentStatus: '',
    oldPw: '',
    newPw: '',
    newPw2: '',
    newDynamicKey: '',
    // 弹窗
    showAllUsersModal: false,
    allUsersList: [],
    showKeyEditModal: false,
    editingKey: '',
    editingKeyTitle: '',
    editingKeyPhone: '',
    editingKeyGender: '',
    editingKeyAge: '',
    editingKeyNickname: '',
    editingKeyNote: ''
  },

  onLoad: function () {
    this.loadAll()
  },

  onShow: function () {
    this.loadAll()
  },

  loadAll: function () {
    this.loadAdminStats()
    this.loadKeyList()
    this.loadVersionInfo()
  },

  // ===== 用户统计 =====
  loadAdminStats: function () {
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      var stats = { free: 0, trial: 0, vipBasic: 0, vipUpgrade: 0, total: 0 }
      var configKeys = store.getPresetKeys()
      var payments = store.loadPayments()

      configKeys.forEach(function(k) {
        var info = pi[k] || {}
        if (info.phone) {
          var p = payments[info.phone] || {}
          if (p.beautyPaid || p.beautyTrial) stats.vipUpgrade++
          else if (p.storagePaid) stats.vipBasic++
          else stats.free++
        }
      })
      stats.total = configKeys.length
      self.setData({ adminStats: stats })
    })
  },

  // ===== 版本通知 =====
  loadVersionInfo: function () {
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      var noticeInfo = pi._notice || {}
      var noticeSent = !!(noticeInfo.sentAt && noticeInfo.version === '7.1')
      this.setData({
        noticeContent: noticeInfo.content || '',
        noticeSent: noticeSent
      })
    }.bind(this))
  },

  onNoticeInput: function (e) {
    this.setData({ noticeContent: e.detail.value })
  },

  sendVersionNotice: function () {
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      pi._notice = {
        version: '7.1',
        content: self.data.noticeContent,
        sentAt: Date.now()
      }
      store.savePresetInfo(pi)
      self.setData({ noticeSent: true })
      wx.showToast({ title: '通知已发送', icon: 'success' })
    })
  },

  // ===== 付费管理 =====
  onPaymentPhoneInput: function (e) {
    this.setData({ paymentPhone: e.detail.value })
  },

  adminGrantPayment: function (e) {
    var type = e.currentTarget.dataset.type
    var phone = this.data.paymentPhone.trim()
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }

    var self = this
    store.loadPayments(function(payments) {
      payments = payments || {}
      if (!payments[phone]) payments[phone] = { storagePaid: false, beautyPaid: false, storagePaidAt: null, beautyPaidAt: null }
      var label = ''
      if (type === 'storage') {
        payments[phone].storagePaid = true
        payments[phone].storagePaidAt = Date.now()
        label = '19.9元云端存储'
      } else if (type === 'beauty') {
        payments[phone].beautyPaid = true
        payments[phone].beautyPaidAt = Date.now()
        payments[phone].storagePaid = true
        payments[phone].storagePaidAt = Date.now()
        label = '29.9元变美计划'
      }
      store.savePayments(payments)
      self.setData({ paymentStatus: '手机号 ' + phone + ' 已开通 ' + label })
      self.loadAll()
      wx.showToast({ title: '已开通 ' + label, icon: 'success' })
    })
  },

  // ===== 密钥管理 =====
  loadKeyList: function () {
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      store.loadPayments(function(payments) {
        payments = payments || {}
        var configKeys = store.getPresetKeys()
        var keyList = []

        configKeys.forEach(function(k) {
          var info = pi[k] || {}
          var phone = info.phone || ''
          var activated = !!info.activated
          var revoked = !!info.revoked
          var p = payments[phone] || {}

          // 搜索过滤
          if (self.data.keySearchPhone && phone.indexOf(self.data.keySearchPhone) === -1) return

          // 用户类型
          var userType = 'free'
          var userTypeLabel = '免费用户'
          if (phone && (p.beautyPaid || p.beautyTrial)) {
            userType = 'vip'
            userTypeLabel = '升级版'
          } else if (phone && p.storagePaid) {
            userType = 'vip'
            userTypeLabel = '普通版'
          }

          // 版本标签
          var versionLabel = ''
          var versionBadgeStyle = ''
          if (phone && (p.beautyPaid || p.beautyTrial)) {
            versionLabel = '升级版'
            versionBadgeStyle = 'background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff'
          } else if (phone && p.storagePaid) {
            versionLabel = '普通版'
            versionBadgeStyle = 'background:#10b981;color:#fff'
          }

          // 登录状态
          var loginLabel = '未登录'
          var loginBadgeStyle = 'background:#e5e7eb;color:#6b7280'
          if (activated || info.activated) {
            loginLabel = '已启用'
            loginBadgeStyle = 'background:#dcfce7;color:#16a34a'
          }

          // 切换按钮
          var toggleClass = 'key-toggle-off'
          var toggleLabel = '未启用'
          if (revoked) {
            toggleClass = 'key-toggle-revoked'
            toggleLabel = '已停用'
          } else if (activated) {
            toggleClass = 'key-toggle-on'
            toggleLabel = '已启用 · 点击停用'
          }

          // 升级版开关
          var showTrialBtn = !!(phone && !p.beautyPaid)
          var trialActive = !!(phone && p.beautyTrial)
          var trialLabel = trialActive ? '升级版·关闭' : '开通升级版'

          // 用户信息文本
          var infoText = (phone || '未填写') + (info.gender ? ' · ' + info.gender : '') + (info.age ? ' · ' + info.age + '岁' : '') + (info.note ? ' · ' + info.note : '')

          keyList.push({
            code: k,
            phone: phone,
            userType: userType,
            userTypeLabel: userTypeLabel,
            versionLabel: versionLabel,
            versionBadge: !!versionLabel,
            versionBadgeStyle: versionBadgeStyle,
            loginLabel: loginLabel,
            loginBadgeStyle: loginBadgeStyle,
            toggleClass: toggleClass,
            toggleLabel: toggleLabel,
            showTrialBtn: showTrialBtn,
            trialActive: trialActive,
            trialLabel: trialLabel,
            infoText: infoText
          })
        })

        self.setData({ keyList: keyList })
      })
    })
  },

  onKeySearchInput: function (e) {
    this.setData({ keySearchPhone: e.detail.value })
    this.loadKeyList()
  },

  toggleKey: function (e) {
    var key = e.currentTarget.dataset.key
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      if (!pi[key]) pi[key] = {}
      var info = pi[key]
      if (info.revoked) {
        info.revoked = false
        wx.showToast({ title: '密钥 ' + key + ' 已恢复', icon: 'success' })
      } else if (info.activated) {
        info.revoked = true
        wx.showToast({ title: '密钥 ' + key + ' 已停用', icon: 'success' })
      } else {
        info.activated = true
        wx.showToast({ title: '密钥 ' + key + ' 已启用', icon: 'success' })
      }
      store.savePresetInfo(pi)
      self.loadKeyList()
    })
  },

  // ===== 升级版试用开关 =====
  toggleBeautyTrial: function (e) {
    var phone = e.currentTarget.dataset.phone
    if (!phone) {
      wx.showToast({ title: '该用户未绑定手机号', icon: 'none' })
      return
    }
    var self = this
    store.loadPayments(function(payments) {
      payments = payments || {}
      if (!payments[phone]) payments[phone] = { storagePaid: false, beautyPaid: false, beautyTrial: false }
      if (payments[phone].beautyPaid) {
        wx.showToast({ title: '该用户已付费29.9元升级版', icon: 'none' })
        return
      }
      payments[phone].beautyTrial = !payments[phone].beautyTrial
      store.savePayments(payments)
      var msg = payments[phone].beautyTrial ? '已为 ' + phone + ' 开通升级版' : '已关闭 ' + phone + ' 的升级版'
      wx.showToast({ title: msg, icon: 'success' })
      self.loadKeyList()
    })
  },

  // ===== 密钥备注编辑 =====
  editKeyNote: function (e) {
    var key = e.currentTarget.dataset.key
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      var info = pi[key] || {}
      self.setData({
        showKeyEditModal: true,
        editingKey: key,
        editingKeyTitle: '用户信息 · ' + key,
        editingKeyPhone: info.phone || '',
        editingKeyGender: info.gender || '',
        editingKeyAge: info.age || '',
        editingKeyNickname: info.nickname || '',
        editingKeyNote: info.note || ''
      })
    })
  },

  closeKeyEditModal: function () {
    this.setData({ showKeyEditModal: false })
  },

  onEditKeyPhoneInput: function(e) { this.setData({ editingKeyPhone: e.detail.value }) },
  onEditKeyGenderInput: function(e) { this.setData({ editingKeyGender: e.detail.value }) },
  onEditKeyAgeInput: function(e) { this.setData({ editingKeyAge: e.detail.value }) },
  onEditKeyNicknameInput: function(e) { this.setData({ editingKeyNickname: e.detail.value }) },
  onEditKeyNoteInput: function(e) { this.setData({ editingKeyNote: e.detail.value }) },

  saveKeyNote: function () {
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      if (!pi[self.data.editingKey]) pi[self.data.editingKey] = {}
      pi[self.data.editingKey].phone = self.data.editingKeyPhone
      pi[self.data.editingKey].gender = self.data.editingKeyGender
      pi[self.data.editingKey].age = self.data.editingKeyAge
      pi[self.data.editingKey].nickname = self.data.editingKeyNickname
      pi[self.data.editingKey].note = self.data.editingKeyNote
      store.savePresetInfo(pi)
      self.setData({ showKeyEditModal: false })
      self.loadKeyList()
      wx.showToast({ title: '已保存', icon: 'success' })
    })
  },

  // ===== 动态密钥 =====
  generateDynamicKey: function () {
    var key = ''
    for (var i = 0; i < 6; i++) {
      key += Math.floor(Math.random() * 10)
    }
    this.setData({ newDynamicKey: key })
    // 保存到 store
    store.addDynamicKey(key)
    this.loadKeyList()
    wx.showToast({ title: '密钥 ' + key + ' 已生成', icon: 'success' })
  },

  // ===== 管理员密码修改 =====
  onOldPwInput: function(e) { this.setData({ oldPw: e.detail.value }) },
  onNewPwInput: function(e) { this.setData({ newPw: e.detail.value }) },
  onNewPw2Input: function(e) { this.setData({ newPw2: e.detail.value }) },

  changeAdminPw: function () {
    var oldPw = this.data.oldPw
    var newPw = this.data.newPw
    var newPw2 = this.data.newPw2

    var storedPw = wx.getStorageSync('admin_pw') || config.DEFAULT_ADMIN_PW
    if (!oldPw) { wx.showToast({ title: '请输入当前密码', icon: 'none' }); return }
    if (oldPw !== storedPw) {
      wx.showToast({ title: '当前密码不正确', icon: 'none' })
      return
    }
    if (!newPw) { wx.showToast({ title: '请输入新密码', icon: 'none' }); return }
    if (newPw.length < 6) { wx.showToast({ title: '新密码至少6位', icon: 'none' }); return }
    if (newPw === oldPw) { wx.showToast({ title: '新密码不能与当前密码相同', icon: 'none' }); return }
    if (newPw !== newPw2) { wx.showToast({ title: '两次密码输入不一致', icon: 'none' }); return }

    // 更新密码（本地存储 + 云端同步）
    config.DEFAULT_ADMIN_PW = newPw
    wx.setStorageSync('admin_pw', newPw)
    var store = require('../../utils/store.js')
    store.saveToCloud('_admin_pw', { password: newPw, updatedAt: Date.now() })
    wx.showToast({ title: '密码修改成功，已同步云端', icon: 'success' })
    this.setData({ oldPw: '', newPw: '', newPw2: '' })
  },

  // ===== 用户弹窗 =====
  showAllUsers: function () {
    var self = this
    store.loadPresetInfo(function(pi) {
      pi = pi || {}
      var configKeys = store.getPresetKeys()
      var list = []
      configKeys.forEach(function(k) {
        var info = pi[k] || {}
        if (info.phone) {
          var status = info.activated ? '已启用' : '未启用'
          list.push({
            phone: info.phone,
            meta: (info.gender || '') + (info.age ? ' · ' + info.age + '岁' : '') + (info.note ? ' · ' + info.note : '') + ' · 密钥' + k,
            status: status,
            statusClass: info.activated ? 'key-badge-on' : 'key-badge-off'
          })
        }
      })
      self.setData({
        showAllUsersModal: true,
        allUsersList: list
      })
    })
  },

  closeAllUsersModal: function () {
    this.setData({ showAllUsersModal: false })
  },

  showUsersByType: function (e) {
    wx.showToast({ title: '点击查看详情', icon: 'none' })
    // 触发显示所有用户（简化实现）
    this.showAllUsers()
  }
})
