// pages/admin/admin.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    adminStats: { wx: 0, phone: 0, keyFree: 0, trial: 0, basic: 0, upgrade: 0, total: 0 },
    appVersion: '2.2.4',
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
    modalUserList: [],
    modalSearch: '',
    // 用户详情
    showDetailModal: false,
    detailData: {},
    // 全局搜索
    globalSearch: '',
    globalSearchResult: [],
    // 预览弹窗
    showPreviewModal: false,
    // 激活码列表弹窗
    showKeyListModal: false,
    // 内部缓存
    _allUsers: [],
    _currentType: '',
    // 密钥编辑
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

  // ===== 合并所有用户数据（微信+手机+激活码） =====
  _loadAllUsers: function (callback) {
    var self = this
    var now = Date.now()
    var trialMs = 7 * 24 * 60 * 60 * 1000
    var todayStr = new Date().toISOString().slice(0, 10)
    var allUsers = []

    store.loadPayments(function (payments) {
      payments = payments || {}

      // 加载微信→手机号绑定关系
      store.loadWxPhoneBindings(function (wxBindings) {
        wxBindings = wxBindings || {}

        // 加载微信用户
        store.loadFromCloud('_wx_users', function (wxUsers) {
          wxUsers = wxUsers || {}
          Object.keys(wxUsers).forEach(function (uk) {
            var u = wxUsers[uk]
            if (!u) return
            // 查绑定的真实手机号
            var realPhone = wxBindings[uk] || u.phone || ''
            var p = payments[realPhone] || {}
            var isTrial = !p.storagePaid && !p.beautyPaid && (now - (u.firstLoginTime || now) < trialMs)
            var isBasic = p.storagePaid && !p.beautyPaid
            var isUpgrade = !!p.beautyPaid
            var isFree = p.storagePaidBy === 'activation_code'
            var versionLabel = isUpgrade ? '升级版' : (isBasic ? '普通版' : '试用期')
            var versionTag = isUpgrade ? 'upgrade' : (isBasic ? 'basic' : 'trial')
            var loginToday = !!(u.lastLoginDate && u.lastLoginDate === todayStr)

            allUsers.push({
              key: 'wx_' + uk,
              displayId: realPhone || '未绑定',
              source: '微信用户',
              sourceType: 'wx',
              nickname: u.nickname || '',
              gender: u.gender || '',
              age: u.age || '',
              versionLabel: versionLabel,
              versionTag: versionTag,
              isFree: isFree,
              isTrial: isTrial,
              isBasic: isBasic,
              isUpgrade: isUpgrade,
              loginToday: loginToday,
              loginBadge: loginToday ? '登录中' : '未登录',
              loginBadgeClass: loginToday ? 'login-badge-on' : 'login-badge-off',
              firstLoginText: u.firstLoginTime ? new Date(u.firstLoginTime).toLocaleDateString() : '未知',
              note: u.note || '',
              metaText: [u.nickname || '', u.gender || '', u.age ? u.age + '岁' : ''].filter(Boolean).join(' · ') || '暂无信息',
              phone: realPhone || '',
              wxId: uk,
              boundPhone: wxBindings[uk] || ''
            })
          })

        // 加载手机用户
        store.loadFromCloud('_phone_users', function (phoneUsers) {
          phoneUsers = phoneUsers || {}
          Object.keys(phoneUsers).forEach(function (pk) {
            var pu = phoneUsers[pk]
            if (!pu) return
            var p = payments[pu.phone] || {}
            var isTrial = !p.storagePaid && !p.beautyPaid && (now - (pu.firstLogin || now) < trialMs)
            var isBasic = p.storagePaid && !p.beautyPaid
            var isUpgrade = !!p.beautyPaid
            var isFree = p.storagePaidBy === 'activation_code'
            var versionLabel = isUpgrade ? '升级版' : (isBasic ? '普通版' : '试用期')
            var versionTag = isUpgrade ? 'upgrade' : (isBasic ? 'basic' : 'trial')
            var loginToday = !!(pu.lastLoginDate && pu.lastLoginDate === todayStr)

            // 去重：如果该手机号已有微信用户记录（绑定的），合并而非重复添加
            var existing = allUsers.find(function (u) { return u.phone === pu.phone && u.sourceType === 'wx' })
            if (existing) {
              // 合并到微信用户记录：标注双重身份
              existing.source = '微信+手机'
              existing.loginToday = existing.loginToday || loginToday
              existing.loginBadge = existing.loginToday ? '登录中' : '未登录'
              existing.loginBadgeClass = existing.loginToday ? 'login-badge-on' : 'login-badge-off'
              // 同步付费状态（确保免费用户标记正确）
              existing.isFree = existing.isFree || isFree
              existing.isTrial = isTrial
              existing.isBasic = isBasic
              existing.isUpgrade = isUpgrade
              existing.versionLabel = versionLabel
              existing.versionTag = versionTag
              // 补充手机端资料
              if (!existing.nickname && pu.nickname) existing.nickname = pu.nickname
              if (!existing.gender && pu.gender) existing.gender = pu.gender
              if (!existing.age && pu.age) existing.age = pu.age
              if (!existing.note && pu.note) existing.note = pu.note
              existing.metaText = [existing.nickname || '', existing.gender || '', existing.age ? existing.age + '岁' : ''].filter(Boolean).join(' · ') || '暂无信息'
              return
            }

            allUsers.push({
              key: 'ph_' + pk,
              displayId: pu.phone || '未绑定',
              source: '手机用户',
              sourceType: 'phone',
              nickname: pu.nickname || '',
              gender: pu.gender || '',
              age: pu.age || '',
              versionLabel: versionLabel,
              versionTag: versionTag,
              isFree: isFree,
              isTrial: isTrial,
              isBasic: isBasic,
              isUpgrade: isUpgrade,
              loginToday: loginToday,
              loginBadge: loginToday ? '登录中' : '未登录',
              loginBadgeClass: loginToday ? 'login-badge-on' : 'login-badge-off',
              firstLoginText: pu.firstLogin ? new Date(pu.firstLogin).toLocaleDateString() : '未知',
              note: pu.note || '',
              metaText: [pu.nickname || '', pu.gender || '', pu.age ? pu.age + '岁' : ''].filter(Boolean).join(' · ') || '暂无信息',
              phone: pu.phone || ''
            })
          })

          // 加载激活码用户（从 presetInfo 中有手机号的）
          store.loadPresetInfo(function (pi) {
            pi = pi || {}
            var configKeys = store.getPresetKeys()
            configKeys.forEach(function (k) {
              var info = pi[k] || {}
              if (!info.phone) return
              var p = payments[info.phone] || {}
              // 只添加不在微信/手机用户列表里的
              var exists = allUsers.some(function (u) { return u.phone === info.phone })
              if (exists) {
                // 标记已有用户为激活码用户
                var existing = allUsers.find(function (u) { return u.phone === info.phone })
                if (existing && p.storagePaidBy === 'activation_code') existing.isFree = true
                return
              }
              var isBasic = p.storagePaid
              var isUpgrade = !!p.beautyPaid
              var isFree = p.storagePaidBy === 'activation_code'
              var versionLabel = isUpgrade ? '升级版' : (isBasic ? '普通版' : '试用期')
              var versionTag = isUpgrade ? 'upgrade' : (isBasic ? 'basic' : 'trial')
              var loginToday = !!(info.lastLoginDate && info.lastLoginDate === todayStr)

              allUsers.push({
                key: 'key_' + k,
                displayId: info.phone,
                source: '激活码用户',
                sourceType: 'keyFree',
                nickname: info.nickname || '',
                gender: info.gender || '',
                age: info.age || '',
                versionLabel: versionLabel,
                versionTag: versionTag,
                isFree: isFree,
                isTrial: false,
                isBasic: isBasic,
                isUpgrade: isUpgrade,
                loginToday: loginToday,
                loginBadge: loginToday ? '登录中' : '未登录',
                loginBadgeClass: loginToday ? 'login-badge-on' : 'login-badge-off',
                firstLoginText: info.activatedAt ? new Date(info.activatedAt).toLocaleDateString() : '未知',
                note: info.note || '',
                metaText: [info.nickname || '', info.gender || '', info.age ? info.age + '岁' : ''].filter(Boolean).join(' · ') || '暂无信息',
                phone: info.phone
              })
            })

            // 缓存
            self.data._allUsers = allUsers
            callback(allUsers)
          })
        })
      })
      })
    })
  },

  // ===== 统计 =====
  loadAdminStats: function () {
    var self = this
    this._loadAllUsers(function (allUsers) {
      var stats = { wx: 0, phone: 0, keyFree: 0, trial: 0, basic: 0, upgrade: 0, total: 0 }
      allUsers.forEach(function (u) {
        if (u.sourceType === 'wx') stats.wx++
        if (u.sourceType === 'phone') stats.phone++
        if (u.isFree) stats.keyFree++
        if (u.isTrial) stats.trial++
        if (u.isBasic) stats.basic++
        if (u.isUpgrade) stats.upgrade++
      })
      stats.total = allUsers.length
      self.setData({ adminStats: stats })
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
    this.setData({ showPreviewModal: true })
  },

  // 预览29.9升级弹窗
  previewBeautyPopup: function () {
    wx.navigateTo({ url: '/subpkg-beauty/pages/upgrade-home/upgrade-home' })
  },

  // 重置模拟状态
  resetAdminSimulation: function () {
    wx.showToast({ title: '已重置模拟状态', icon: 'success' })
  },

  closePreviewModal: function () {
    this.setData({ showPreviewModal: false })
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
        payments[phone].storagePaidBy = 'admin'
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

  // ===== 激活码管理 =====
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

          if (self.data.keySearchPhone && phone.indexOf(self.data.keySearchPhone) === -1) return

          var userType = 'free'
          var userTypeLabel = '试用期'
          if (phone && p.beautyPaid) {
            userType = 'vip'
            userTypeLabel = '升级版'
          } else if (phone && p.storagePaid) {
            userType = 'vip'
            userTypeLabel = '普通版'
          }

          var versionLabel = ''
          var versionBadgeStyle = ''
          if (phone && p.beautyPaid) {
            versionLabel = '升级版'
            versionBadgeStyle = 'background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff'
          } else if (phone && p.storagePaid) {
            versionLabel = '普通版'
            versionBadgeStyle = 'background:#10b981;color:#fff'
          }

          var loginLabel = '未登录'
          var loginBadgeStyle = 'background:#e5e7eb;color:#6b7280'
          if (activated || info.activated) {
            loginLabel = '已启用'
            loginBadgeStyle = 'background:#dcfce7;color:#16a34a'
          }

          var toggleClass = 'key-toggle-off'
          var toggleLabel = '未启用'
          if (revoked) {
            toggleClass = 'key-toggle-revoked'
            toggleLabel = '已停用'
          } else if (activated) {
            toggleClass = 'key-toggle-on'
            toggleLabel = '已启用 · 点击停用'
          }

          var showTrialBtn = !!(phone && !p.beautyPaid)
          var trialActive = !!(phone && p.beautyPaid)
          var trialLabel = trialActive ? '升级版·关闭' : '开通升级版'

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

  // ===== 激活码列表弹窗 =====
  showKeyListModal: function () {
    this.loadKeyList()
    this.setData({ showKeyListModal: true })
  },

  closeKeyListModal: function () {
    this.setData({ showKeyListModal: false })
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
        // 已停用 → 恢复：恢复由激活码开通的权限
        info.revoked = false
        var phone = info.phone || ''
        if (phone) {
          store.loadPayments(function (payments) {
            payments = payments || {}
            if (payments[phone]) {
              // 只恢复由激活码开通的权限
              if (payments[phone].beautyPaidBy === 'activation_code') {
                payments[phone].beautyPaid = true
                payments[phone].beautyPaidAt = Date.now()
              }
              if (payments[phone].storagePaidBy === 'activation_code') {
                payments[phone].storagePaid = true
                payments[phone].storagePaidAt = Date.now()
              }
              store.savePayments(payments)
            }
          })
        }
        wx.showToast({ title: '激活码 ' + key + ' 已恢复', icon: 'success' })
      } else if (info.activated) {
        // 已启用 → 停用：同步清除该用户的升级版权限
        info.revoked = true
        var phone = info.phone || ''
        if (phone) {
          store.loadPayments(function (payments) {
            payments = payments || {}
            if (payments[phone]) {
              // 清除升级版，保留普通版（用户回退到需自行购买升级版）
              payments[phone].beautyPaid = false
              payments[phone].beautyPaidAt = null
              payments[phone].beautyPaidBy = null
              store.savePayments(payments)
            }
          })
        }
        wx.showToast({ title: '激活码 ' + key + ' 已停用，用户升级版已关闭', icon: 'success' })
      } else {
        info.activated = true
        wx.showToast({ title: '激活码 ' + key + ' 已启用', icon: 'success' })
      }
      store.savePresetInfo(pi)
      self.loadKeyList()
    })
  },

  toggleBeautyTrial: function (e) {
    var phone = e.currentTarget.dataset.phone
    if (!phone) {
      wx.showToast({ title: '该用户未绑定手机号', icon: 'none' })
      return
    }
    var self = this
    store.loadPayments(function (payments) {
      payments = payments || {}
      if (!payments[phone]) payments[phone] = { storagePaid: false, beautyPaid: false }
      if (payments[phone].beautyPaid) {
        // 已开通升级版：关闭它
        payments[phone].beautyPaid = false
        payments[phone].beautyPaidAt = null
        payments[phone].beautyPaidBy = null
        store.savePayments(payments)
        wx.showToast({ title: '已关闭 ' + phone + ' 的升级版', icon: 'success' })
        self.loadKeyList()
        return
      }
      // 未开通：管理员开通升级版（永久 beautyPaid）
      payments[phone].beautyPaid = true
      payments[phone].beautyPaidAt = Date.now()
      payments[phone].beautyPaidBy = 'admin'
      // 升级版自动包含普通版
      payments[phone].storagePaid = true
      payments[phone].storagePaidAt = Date.now()
      if (!payments[phone].storagePaidBy) {
        payments[phone].storagePaidBy = 'admin'
      }
      store.savePayments(payments)
      wx.showToast({ title: '已为 ' + phone + ' 开通升级版', icon: 'success' })
      self.loadKeyList()
    })
  },

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

  generateDynamicKey: function () {
    var key = ''
    for (var i = 0; i < 6; i++) {
      key += Math.floor(Math.random() * 10)
    }
    this.setData({ newDynamicKey: key })
    store.addDynamicKey(key)
    this.loadKeyList()
    wx.showToast({ title: '激活码 ' + key + ' 已生成', icon: 'success' })
  },

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

  // ===== 用户列表弹窗 =====
  showUsersByType: function (e) {
    var type = e.currentTarget.dataset.type
    var titleMap = {
      wx: '微信用户', phone: '手机用户', keyFree: '激活码用户',
      trial: '试用期用户', basic: '普通版用户', upgrade: '升级版用户', all: '所有用户'
    }
    var allUsers = this.data._allUsers || []
    var filtered = allUsers.filter(function (u) {
      if (type === 'wx') return u.sourceType === 'wx'
      if (type === 'phone') return u.sourceType === 'phone'
      if (type === 'keyFree') return u.isFree
      if (type === 'trial') return u.isTrial
      if (type === 'basic') return u.isBasic
      if (type === 'upgrade') return u.isUpgrade
      if (type === 'all') return true
      return false
    })

    this.setData({
      showUsersModal: true,
      usersModalTitle: titleMap[type] || '用户详情',
      modalUserList: filtered,
      modalSearch: '',
      _currentType: type
    })
  },

  onModalSearch: function (e) {
    var keyword = (e.detail.value || '').trim().toLowerCase()
    var allUsers = this.data._allUsers || []
    var type = this.data._currentType
    var self = this

    var filtered = allUsers.filter(function (u) {
      if (type === 'wx' && u.sourceType !== 'wx') return false
      if (type === 'phone' && u.sourceType !== 'phone') return false
      if (type === 'keyFree' && !u.isFree) return false
      if (type === 'trial' && !u.isTrial) return false
      if (type === 'basic' && !u.isBasic) return false
      if (type === 'upgrade' && !u.isUpgrade) return false
      if (type === 'all') {}
      if (!keyword) return true
      return (u.displayId || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.nickname || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.gender || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.versionLabel || '').toLowerCase().indexOf(keyword) !== -1 ||
             (keyword === '免费' && u.isFree)
    })

    this.setData({ modalUserList: filtered, modalSearch: e.detail.value })
  },

  closeUsersModal: function () {
    this.setData({ showUsersModal: false })
  },

  // ===== 用户详情 =====
  showUserDetail: function (e) {
    var index = e.currentTarget.dataset.index
    var user = this.data.globalSearchResult[index]
    if (user) {
      this.setData({ showDetailModal: true, detailData: user })
    }
  },

  showUserDetailFromModal: function (e) {
    var index = e.currentTarget.dataset.index
    var user = this.data.modalUserList[index]
    if (user) {
      this.setData({ showDetailModal: true, detailData: user })
    }
  },

  closeDetailModal: function () {
    this.setData({ showDetailModal: false })
  },

  // ===== 全局搜索 =====
  onGlobalSearch: function (e) {
    var keyword = (e.detail.value || '').trim().toLowerCase()
    var allUsers = this.data._allUsers || []

    if (!keyword) {
      this.setData({ globalSearch: '', globalSearchResult: [] })
      return
    }

    var results = allUsers.filter(function (u) {
      return (u.displayId || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.nickname || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.gender || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.versionLabel || '').toLowerCase().indexOf(keyword) !== -1 ||
             (u.source || '').toLowerCase().indexOf(keyword) !== -1 ||
             (keyword === '免费' && u.isFree)
    })

    this.setData({ globalSearch: e.detail.value, globalSearchResult: results })
  }
})
