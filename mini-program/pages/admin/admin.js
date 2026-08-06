// pages/admin/admin.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    adminStats: { trial: 0, basic: 0, upgrade: 0, keyUser: 0, total: 0 },
    appVersion: '8.0',
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
    showUsersModal: false,
    usersModalTitle: '',
    usersModalList: [],
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

  // ===== 用户统计（试用期/普通版/升级版/密钥用户） =====
  loadAdminStats: function () {
    var self = this
    var now = Date.now()
    var trialMs = 24 * 60 * 60 * 1000
    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      store.loadPayments(function (payments) {
        payments = payments || {}
        var configKeys = store.getPresetKeys()
        var trialCount = 0, basicCount = 0, upgradeCount = 0, keyUserCount = 0

        configKeys.forEach(function (k) {
          var info = pi[k] || {}
          var phone = info.phone || ''
          var p = payments[phone] || {}

          if (p.beautyPaid || p.beautyTrial) {
            upgradeCount++
          } else if (p.storagePaid) {
            basicCount++
          } else if (phone && p.trialStart) {
            var trialExpires = p.trialExpires || 0
            if (now < trialExpires) {
              trialCount++
            } else {
              keyUserCount++
            }
          } else {
            keyUserCount++
          }
        })

        /* 加上微信用户和手机用户统计 */
        store.loadFromCloud('_wx_users', function(wxUsers) {
          wxUsers = wxUsers || {}
          store.loadFromCloud('_phone_users', function(phoneUsers) {
            phoneUsers = phoneUsers || {}
            var allUsers = []
            Object.keys(wxUsers).forEach(function(uk) {
              var u = wxUsers[uk]
              if (u) allUsers.push({ phone: u.phone || '', firstLogin: u.firstLoginTime || now, source: 'wx' })
            })
            Object.keys(phoneUsers).forEach(function(pk) {
              var pu = phoneUsers[pk]
              if (pu) allUsers.push({ phone: pu.phone || '', firstLogin: pu.firstLogin || now, source: 'phone' })
            })
            allUsers.forEach(function(u) {
              var p = payments[u.phone] || {}
              if (p.beautyPaid || p.beautyTrial) upgradeCount++
              else if (p.storagePaid) basicCount++
              else if (now - u.firstLogin < trialMs) trialCount++
              else keyUserCount++
            })

            self.setData({
              adminStats: {
                trial: trialCount,
                basic: basicCount,
                upgrade: upgradeCount,
                keyUser: keyUserCount,
                total: configKeys.length + allUsers.length
              }
            })
          })
        })
      })
    })
  },

  // ===== 版本通知 =====
  loadVersionInfo: function () {
    var self = this
    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      var noticeInfo = pi._notice || {}
      var noticeSent = !!(noticeInfo.sentAt && noticeInfo.version === '8.0')
      self.setData({
        noticeContent: noticeInfo.content || '',
        noticeSent: noticeSent
      })
    })
  },

  onNoticeInput: function (e) {
    this.setData({ noticeContent: e.detail.value })
  },

  sendVersionNotice: function () {
    var self = this
    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      pi._notice = {
        version: '8.0',
        content: self.data.noticeContent,
        sentAt: Date.now()
      }
      store.savePresetInfo(pi)
      self.setData({ noticeSent: true })
      wx.showToast({ title: '通知已发送', icon: 'success' })
    })
  },

  // ===== 预览试用弹窗 =====
  previewTrialPopup: function () {
    wx.showToast({ title: '请在主页查看试用弹窗', icon: 'none' })
    // 设置标记让主页显示弹窗
    wx.setStorageSync('preview_trial_popup', true)
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
    store.loadPayments(function (payments) {
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
    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      store.loadPayments(function (payments) {
        payments = payments || {}
        var configKeys = store.getPresetKeys()
        var keyList = []

        configKeys.forEach(function (k) {
          var info = pi[k] || {}
          var phone = info.phone || ''
          var activated = !!info.activated
          var revoked = !!info.revoked
          var p = payments[phone] || {}

          // 搜索过滤
          if (self.data.keySearchPhone && phone.indexOf(self.data.keySearchPhone) === -1) return

          // 用户类型
          var userType = 'free'
          var userTypeLabel = '试用期'
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
    store.loadPresetInfo(function (pi) {
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
    store.loadPayments(function (payments) {
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
    store.loadPresetInfo(function (pi) {
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

  onEditKeyPhoneInput: function (e) { this.setData({ editingKeyPhone: e.detail.value }) },
  onEditKeyGenderInput: function (e) { this.setData({ editingKeyGender: e.detail.value }) },
  onEditKeyAgeInput: function (e) { this.setData({ editingKeyAge: e.detail.value }) },
  onEditKeyNicknameInput: function (e) { this.setData({ editingKeyNickname: e.detail.value }) },
  onEditKeyNoteInput: function (e) { this.setData({ editingKeyNote: e.detail.value }) },

  saveKeyNote: function () {
    var self = this
    store.loadPresetInfo(function (pi) {
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
    store.addDynamicKey(key)
    this.loadKeyList()
    wx.showToast({ title: '密钥 ' + key + ' 已生成', icon: 'success' })
  },

  // ===== 管理员密码修改 =====
  onOldPwInput: function (e) { this.setData({ oldPw: e.detail.value }) },
  onNewPwInput: function (e) { this.setData({ newPw: e.detail.value }) },
  onNewPw2Input: function (e) { this.setData({ newPw2: e.detail.value }) },

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

    config.DEFAULT_ADMIN_PW = newPw
    wx.setStorageSync('admin_pw', newPw)
    store.saveToCloud('_admin_pw', { password: newPw, updatedAt: Date.now() })
    wx.showToast({ title: '密码修改成功，已同步云端', icon: 'success' })
    this.setData({ oldPw: '', newPw: '', newPw2: '' })
  },

  // ===== 用户分类弹窗 =====
  showAllUsers: function () {
    var self = this
    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      store.loadPayments(function (payments) {
        payments = payments || {}
        var configKeys = store.getPresetKeys()
        var list = []
        var now = Date.now()
        var todayStr = new Date().toISOString().slice(0, 10)

        configKeys.forEach(function (k) {
          var info = pi[k] || {}
          if (info.phone) {
            var p = payments[info.phone] || {}
            /* 用户类型标签 */
            var userType = '免费用户'
            var userTypeClass = 'key-badge-free'
            if (p.beautyPaid || p.beautyTrial) {
              userType = '升级版'
              userTypeClass = 'key-badge-on'
            } else if (p.storagePaid && p.storagePaidBy !== 'activation_code') {
              userType = '普通版'
              userTypeClass = 'key-badge-on'
            } else if (p.trialStart && now < (p.trialExpires || 0)) {
              userType = '试用期'
              userTypeClass = 'key-badge-trial'
            }
            /* 当日登录 */
            var loginToday = !!(info.lastLoginDate && info.lastLoginDate === todayStr)
            var loginBadge = loginToday ? '登录中' : '未登录'
            var loginBadgeClass = loginToday ? 'login-badge-on' : 'login-badge-off'

            list.push({
              phone: info.phone,
              meta: (info.gender || '') + (info.age ? ' · ' + info.age + '岁' : '') + (info.nickname ? ' · ' + info.nickname : '') + ' · 密钥' + k,
              userType: userType,
              userTypeClass: userTypeClass,
              loginBadge: loginBadge,
              loginBadgeClass: loginBadgeClass
            })
          }
        })

        /* 读取微信用户和手机用户 */
        store.loadFromCloud('_wx_users', function(wxUsers) {
          wxUsers = wxUsers || {}
          store.loadFromCloud('_phone_users', function(phoneUsers) {
            phoneUsers = phoneUsers || {}
            Object.keys(wxUsers).forEach(function(uk) {
              var u = wxUsers[uk]
              if (!u) return
              var p = payments[u.phone] || {}
              var userType = '免费用户'
              var userTypeClass = 'key-badge-free'
              if (p.beautyPaid || p.beautyTrial) {
                userType = '升级版'
                userTypeClass = 'key-badge-on'
              } else if (p.storagePaid && p.storagePaidBy !== 'activation_code') {
                userType = '普通版'
                userTypeClass = 'key-badge-on'
              } else if (p.trialStart && now < (p.trialExpires || 0)) {
                userType = '试用期'
                userTypeClass = 'key-badge-trial'
              }
              /* 微信用户登录状态：通过 _wx_users 中的 lastLoginDate 判断 */
              var wxLoginToday = !!(u.lastLoginDate && u.lastLoginDate === todayStr)
              var loginBadge = wxLoginToday ? '登录中' : '未登录'
              var loginBadgeClass = wxLoginToday ? 'login-badge-on' : 'login-badge-off'
              list.push({
                phone: u.phone || '未绑定',
                meta: (u.nickname || u.name || '未设置') + (u.gender ? ' · ' + u.gender : '') + (u.age ? ' · ' + u.age + '岁' : '') + ' · 微信用户',
                userType: userType,
                userTypeClass: userTypeClass,
                loginBadge: loginBadge,
                loginBadgeClass: loginBadgeClass
              })
            })
            Object.keys(phoneUsers).forEach(function(pk) {
              var pu = phoneUsers[pk]
              if (!pu) return
              var p = payments[pu.phone] || {}
              var userType = '免费用户'
              var userTypeClass = 'key-badge-free'
              if (p.beautyPaid || p.beautyTrial) {
                userType = '升级版'
                userTypeClass = 'key-badge-on'
              } else if (p.storagePaid && p.storagePaidBy !== 'activation_code') {
                userType = '普通版'
                userTypeClass = 'key-badge-on'
              } else if (p.trialStart && now < (p.trialExpires || 0)) {
                userType = '试用期'
                userTypeClass = 'key-badge-trial'
              }
              /* 手机用户登录状态：通过 _phone_users 中的 lastLoginDate 判断 */
              var puLoginToday = !!(pu.lastLoginDate && pu.lastLoginDate === todayStr)
              var loginBadge = puLoginToday ? '登录中' : '未登录'
              var loginBadgeClass = puLoginToday ? 'login-badge-on' : 'login-badge-off'
              list.push({
                phone: pu.phone || '未绑定',
                meta: (pu.nickname || '未设置') + (pu.gender ? ' · ' + pu.gender : '') + (pu.age ? ' · ' + pu.age + '岁' : '') + ' · 手机用户',
                userType: userType,
                userTypeClass: userTypeClass,
                loginBadge: loginBadge,
                loginBadgeClass: loginBadgeClass
              })
            })

            self.setData({
              showUsersModal: true,
              usersModalTitle: '所有用户',
              usersModalList: list
            })
          })
        })
      })
    })
  },

  closeUsersModal: function () {
    this.setData({ showUsersModal: false })
  },

  showUsersByType: function (e) {
    var type = e.currentTarget.dataset.type
    var self = this
    var titleMap = { trial: '试用期用户', basic: '普通版用户', upgrade: '升级版用户', keyUser: '密钥用户' }
    var now = Date.now()
    var trialMs = 24 * 60 * 60 * 1000
    var todayStr = new Date().toISOString().slice(0, 10)

    store.loadPresetInfo(function (pi) {
      pi = pi || {}
      store.loadPayments(function (payments) {
        payments = payments || {}
        var configKeys = store.getPresetKeys()
        var list = []

        if (type === 'keyUser') {
          configKeys.forEach(function (k) {
            var info = pi[k] || {}
            var phone = info.phone || ''
            if (!phone) return
            var p = payments[phone] || {}
            var match = !p.storagePaid && !p.beautyPaid && !p.beautyTrial && (!p.trialStart || now >= (p.trialExpires || 0))
            if (!match) return
            /* 用户类型 */
            var userType = '免费用户'
            var userTypeClass = 'key-badge-free'
            if (p.storagePaid && p.storagePaidBy !== 'activation_code') {
              userType = '普通版'
              userTypeClass = 'key-badge-on'
            } else if (p.trialStart && now < (p.trialExpires || 0)) {
              userType = '试用期'
              userTypeClass = 'key-badge-trial'
            }
            /* 当日登录 */
            var loginToday = !!(info.lastLoginDate && info.lastLoginDate === todayStr)
            var loginBadge = loginToday ? '登录中' : '未登录'
            var loginBadgeClass = loginToday ? 'login-badge-on' : 'login-badge-off'
            list.push({
              phone: phone,
              meta: (info.gender || '') + (info.age ? ' · ' + info.age + '岁' : '') + (info.nickname ? ' · ' + info.nickname : '') + ' · 密钥' + k,
              userType: userType,
              userTypeClass: userTypeClass,
              loginBadge: loginBadge,
              loginBadgeClass: loginBadgeClass
            })
          })
        } else {
          /* 合并密钥用户 + 微信用户 + 手机用户 */
          configKeys.forEach(function (k) {
            var info = pi[k] || {}
            var phone = info.phone || ''
            if (!phone) return
            var p = payments[phone] || {}
            var match = false
            if (type === 'trial' && !p.storagePaid && !p.beautyPaid && !p.beautyTrial && p.trialStart && now < (p.trialExpires || 0)) match = true
            if (type === 'basic' && p.storagePaid && !p.beautyPaid && !p.beautyTrial) match = true
            if (type === 'upgrade' && (p.beautyPaid || p.beautyTrial)) match = true
            if (!match) return
            var userType = '试用期', userTypeClass = 'key-badge-free'
            if (p.beautyPaid || p.beautyTrial) { userType = '升级版'; userTypeClass = 'key-badge-on' }
            else if (p.storagePaid) { userType = '普通版'; userTypeClass = 'key-badge-on' }
            /* 当日登录 */
            var loginToday = !!(info.lastLoginDate && info.lastLoginDate === todayStr)
            var loginBadge = loginToday ? '登录中' : '未登录'
            var loginBadgeClass = loginToday ? 'login-badge-on' : 'login-badge-off'
            list.push({
              phone: phone,
              meta: (info.gender || '') + (info.age ? ' · ' + info.age + '岁' : '') + (info.nickname ? ' · ' + info.nickname : '') + ' · 密钥' + k,
              userType: userType,
              userTypeClass: userTypeClass,
              loginBadge: loginBadge,
              loginBadgeClass: loginBadgeClass
            })
          })
        }

        /* 读取微信用户和手机用户 */
        store.loadFromCloud('_wx_users', function(wxUsers) {
          wxUsers = wxUsers || {}
          store.loadFromCloud('_phone_users', function(phoneUsers) {
            phoneUsers = phoneUsers || {}
            var allPhoneUsers = []
            Object.keys(wxUsers).forEach(function(uk) {
              var u = wxUsers[uk]
              if (!u) return
              allPhoneUsers.push({
                phone: u.phone || '',
                nickname: u.nickname || u.name || '未设置',
                gender: u.gender || '',
                age: u.age || '',
                firstLogin: u.firstLoginTime || now,
                lastLoginDate: u.lastLoginDate || '',
                source: '微信用户',
                id: uk
              })
            })
            Object.keys(phoneUsers).forEach(function(pk) {
              var pu = phoneUsers[pk]
              if (!pu) return
              allPhoneUsers.push({
                phone: pu.phone || '',
                nickname: pu.nickname || '',
                gender: pu.gender || '',
                age: pu.age || '',
                firstLogin: pu.firstLogin || now,
                lastLoginDate: pu.lastLoginDate || '',
                source: '手机用户',
                id: pk
              })
            })
            allPhoneUsers.forEach(function(u) {
              var p = payments[u.phone] || {}
              var isVipUpgrade = !!(p.beautyPaid || p.beautyTrial)
              var isVipBasic = !!p.storagePaid && !isVipUpgrade
              var isTrial = !isVipBasic && !isVipUpgrade && (now - u.firstLogin < trialMs)

              var match = false
              if (type === 'trial' && isTrial) match = true
              if (type === 'basic' && isVipBasic) match = true
              if (type === 'upgrade' && isVipUpgrade) match = true
              if (!match) return

              var userType = isVipUpgrade ? '升级版' : (isVipBasic ? '普通版' : '试用期')
              var userTypeClass = isVipUpgrade || isVipBasic ? 'key-badge-on' : 'key-badge-free'
              /* 当日登录 */
              var loginToday = !!(u.lastLoginDate && u.lastLoginDate === todayStr)
              var loginBadge = loginToday ? '登录中' : '未登录'
              var loginBadgeClass = loginToday ? 'login-badge-on' : 'login-badge-off'
              list.push({
                phone: u.phone || '未绑定',
                meta: u.nickname + (u.gender ? ' · ' + u.gender : '') + (u.age ? ' · ' + u.age + '岁' : '') + ' · ' + u.source,
                userType: userType,
                userTypeClass: userTypeClass,
                loginBadge: loginBadge,
                loginBadgeClass: loginBadgeClass
              })
            })

            self.setData({
              showUsersModal: true,
              usersModalTitle: titleMap[type] || '用户详情',
              usersModalList: list
            })
          })
        })
      })
    })
  }
})
