// pages/admin/admin.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    totalUsers: 0,
    trialUsers: 0,
    vipBasicUsers: 0,
    vipUpgradeUsers: 0,
    freeUsers: 0,
    showUpgradeStat: true,
    version: '7.1',
    noticeSent: false,
    keyList: [],
    filteredKeys: [],
    filterStatus: 'all',
    paymentPhone: '',
    paymentStatus: '',
    searchPhone: '',
    oldPw: '',
    newPw: '',
    newPw2: '',
    newDynamicKey: '',
    // 用户弹窗
    showUsersModal: false,
    usersModalTitle: '',
    displayUsers: [],
    // 备注弹窗
    showNoteModal: false,
    editNoteKey: '',
    editNoteValue: '',
    // 所有用户数据缓存
    allUsersData: null
  },

  onLoad: function () {
    if (app.globalData.loginType !== 'admin') {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadData()
  },

  onShow: function () {
    if (app.globalData.loginType !== 'admin') {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
  },

  loadData: function () {
    var self = this
    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}
      store.loadPhoneBindings(function (bindings) {
        bindings = bindings || {}
        var keyToPhone = {}
        var phoneToKey = bindings
        var phones = Object.keys(bindings)
        for (var p = 0; p < phones.length; p++) {
          keyToPhone[bindings[phones[p]]] = phones[p]
        }

        store.loadWxUsers(function (wxUsersData) {
          var now = Date.now()
          var trialMs = 24 * 60 * 60 * 1000
          var trialCount = 0, vipBasicCount = 0, vipUpgradeCount = 0
          var allUsers = { free: [], trial: [], basic: [], upgrade: [], allPhones: [] }

          if (wxUsersData) {
            var wxKeys = Object.keys(wxUsersData)
            for (var wi = 0; wi < wxKeys.length; wi++) {
              var wxUser = wxUsersData[wxKeys[wi]]
              if (!wxUser) continue
              var firstLogin = wxUser.firstLoginTime || now
              var paidUntil = wxUser.paidUntil || null
              var phone = wxUser.phone || ''

              if (wxUser.upgradePaidUntil && wxUser.upgradePaidUntil > now) {
                vipUpgradeCount++
                if (phone) allUsers.upgrade.push(phone)
              }
              if (paidUntil && paidUntil > now) {
                vipBasicCount++
                if (phone && allUsers.upgrade.indexOf(phone) === -1) allUsers.basic.push(phone)
              } else if (now - firstLogin < trialMs) {
                trialCount++
                if (phone) allUsers.trial.push(phone)
              } else {
                if (phone) allUsers.free.push(phone)
              }
              if (phone) allUsers.allPhones.push(phone)
            }
          }

          // 构建密钥列表
          var keyList = [], freeCount = 0
          var presetKeys = config.PRESET_KEYS
          for (var i = 0; i < presetKeys.length; i++) {
            var key = presetKeys[i]
            var keyInfo = presetInfo[key] || {}
            var isActivated = keyInfo.activated === true
            if (isActivated) freeCount++

            var status = '', statusText = '', statusClass = ''
            if (keyInfo.activated === true) {
              status = 'active'; statusText = '已启用'; statusClass = 'active'
            } else if (keyInfo.activated === false && keyInfo.revoked) {
              status = 'revoked'; statusText = '已作废'; statusClass = 'revoked'
            } else {
              status = 'inactive'; statusText = '未启用'; statusClass = 'inactive'
            }

            var boundPhone = keyInfo.phone || keyToPhone[key] || ''
            var isUpgrade = keyInfo.isUpgrade === true
            var hasLogin = !!boundPhone
            var userInfo = ''
            if (keyInfo.gender || keyInfo.age) {
              userInfo = (keyInfo.gender || '') + (keyInfo.age ? ' ' + keyInfo.age + '岁' : '')
              if (keyInfo.nickname) userInfo += ' ' + keyInfo.nickname
            }

            keyList.push({
              key: key,
              phone: boundPhone,
              remark: keyInfo.note || '',
              status: status, statusText: statusText, statusClass: statusClass,
              isUpgrade: isUpgrade,
              hasLogin: hasLogin,
              userInfo: userInfo
            })
          }

          var totalUsers = freeCount + trialCount + vipBasicCount
          self.allUsersData = allUsers

          self.setData({
            keyList: keyList, filteredKeys: keyList,
            totalUsers: totalUsers, trialUsers: trialCount,
            vipBasicUsers: vipBasicCount, vipUpgradeUsers: vipUpgradeCount,
            freeUsers: freeCount, noticeSent: presetInfo.noticeSent || false
          })
          self.applyFilter()
        })
      })
    })
  },

  // ===== 查看用户类型 =====
  onShowUsersByType: function (e) {
    var type = e.currentTarget.dataset.type
    var data = this.allUsersData
    var users = []
    var title = ''

    if (type === 'free') { users = data.free; title = '免费用户' }
    else if (type === 'trial') { users = data.trial; title = '试用未充值' }
    else if (type === 'basic') { users = data.basic; title = 'VIP基础版' }
    else if (type === 'upgrade') { users = data.upgrade; title = 'VIP升级版' }
    else { users = data.allPhones; title = '所有用户' }

    this.setData({
      showUsersModal: true,
      usersModalTitle: title + ' (' + users.length + '人)',
      displayUsers: users
    })
  },

  onCloseUsersModal: function () {
    this.setData({ showUsersModal: false })
  },

  // ===== 筛选 =====
  onFilter: function (e) {
    this.setData({ filterStatus: e.currentTarget.dataset.status })
    this.applyFilter()
  },

  applyFilter: function () {
    var self = this
    var status = this.data.filterStatus
    var keys = this.data.keyList
    if (this.data.searchPhone) {
      keys = keys.filter(function (k) { return k.phone && k.phone.indexOf(self.data.searchPhone) !== -1 })
    }
    if (status === 'all') {
      this.setData({ filteredKeys: keys })
    } else {
      this.setData({ filteredKeys: keys.filter(function (k) { return k.status === status }) })
    }
  },

  // ===== 切换密钥 =====
  onToggleKey: function (e) {
    var self = this
    var key = e.currentTarget.dataset.key
    var action = e.currentTarget.dataset.action
    wx.showModal({
      title: '确认操作',
      content: '确定要' + (action === 'activate' ? '启用' : '作废') + '密钥 ' + key + ' 吗？',
      success: function (res) { if (res.confirm) self.doToggleKey(key, action) }
    })
  },

  doToggleKey: function (key, action) {
    var self = this
    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}
      var keyInfo = presetInfo[key] || {}
      if (action === 'activate') {
        keyInfo.activated = true; keyInfo.activatedAt = Date.now(); keyInfo.revoked = false
      } else {
        keyInfo.activated = false; keyInfo.revoked = true
      }
      presetInfo[key] = keyInfo
      store.savePresetInfo(presetInfo)
      wx.showToast({ title: '操作成功', icon: 'success' })
      setTimeout(function () { self.loadData() }, 500)
    })
  },

  // ===== 升级版开关 =====
  onToggleBeautyTrial: function (e) {
    var self = this
    var key = e.currentTarget.dataset.key
    var action = e.currentTarget.dataset.action
    var isEnable = action === 'enable'
    wx.showModal({
      title: '确认操作',
      content: '确定要' + (isEnable ? '开通' : '关闭') + '密钥 ' + key + ' 的升级版吗？',
      success: function (res) {
        if (res.confirm) {
          store.loadPresetInfo(function (presetInfo) {
            presetInfo = presetInfo || {}
            var keyInfo = presetInfo[key] || {}
            keyInfo.isUpgrade = isEnable
            presetInfo[key] = keyInfo
            store.savePresetInfo(presetInfo)
            wx.showToast({ title: '操作成功', icon: 'success' })
            setTimeout(function () { self.loadData() }, 500)
          })
        }
      }
    })
  },

  // ===== 动态密钥 =====
  onDynamicKeyInput: function (e) {
    this.setData({ newDynamicKey: e.detail.value })
  },

  onAddDynamicKey: function () {
    var self = this
    var newKey = this.data.newDynamicKey
    if (!newKey || newKey.length !== 6 || !/^\d{6}$/.test(newKey)) {
      wx.showToast({ title: '请输入6位数字密钥', icon: 'none' })
      return
    }
    // 检查是否已存在
    var exists = this.data.keyList.some(function (k) { return k.key === newKey })
    if (exists) {
      wx.showToast({ title: '该密钥已存在', icon: 'none' })
      return
    }
    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}
      presetInfo[newKey] = { activated: true, activatedAt: Date.now(), isDynamic: true }
      store.savePresetInfo(presetInfo)
      wx.showToast({ title: '密钥 ' + newKey + ' 已添加', icon: 'success' })
      self.setData({ newDynamicKey: '' })
      self.loadData()
    })
  },

  // ===== 备注编辑 =====
  onEditKeyNote: function (e) {
    var key = e.currentTarget.dataset.key
    var keyItem = this.data.keyList.find(function (k) { return k.key === key })
    this.setData({
      showNoteModal: true,
      editNoteKey: key,
      editNoteValue: keyItem ? keyItem.remark : ''
    })
  },

  onNoteInput: function (e) {
    this.setData({ editNoteValue: e.detail.value })
  },

  onCloseNoteModal: function () {
    this.setData({ showNoteModal: false })
  },

  onSaveNote: function () {
    var self = this
    var key = this.data.editNoteKey
    var note = this.data.editNoteValue
    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}
      var keyInfo = presetInfo[key] || {}
      keyInfo.note = note
      presetInfo[key] = keyInfo
      store.savePresetInfo(presetInfo)
      wx.showToast({ title: '备注已保存', icon: 'success' })
      self.setData({ showNoteModal: false })
      self.loadData()
    })
  },

  // ===== 通知 =====
  onSendNotice: function () {
    var self = this
    wx.showModal({
      title: '版本更新通知',
      content: '确定向所有用户发送版本更新通知吗？',
      success: function (res) {
        if (res.confirm) {
          store.loadPresetInfo(function (presetInfo) {
            presetInfo = presetInfo || {}
            presetInfo.noticeSent = true
            presetInfo.noticeVersion = self.data.version
            presetInfo.noticeTime = Date.now()
            store.savePresetInfo(presetInfo)
            self.setData({ noticeSent: true })
            wx.showToast({ title: '通知已发送', icon: 'success' })
          })
        }
      }
    })
  },

  // ===== 付费 =====
  onPaymentPhoneInput: function (e) { this.setData({ paymentPhone: e.detail.value }) },

  onGrantStorage: function () {
    var phone = this.data.paymentPhone
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return
    }
    var self = this
    store.loadWxUsers(function (wxUsers) {
      wxUsers = wxUsers || {}
      var found = false
      var keys = Object.keys(wxUsers)
      for (var i = 0; i < keys.length; i++) {
        var u = wxUsers[keys[i]]
        if (u && u.phone === phone) {
          u.paidUntil = Date.now() + 36500 * 24 * 60 * 60 * 1000; found = true; break
        }
      }
      if (!found) {
        wxUsers['wx_' + phone] = { phone: phone, paidUntil: Date.now() + 36500 * 24 * 60 * 60 * 1000, firstLoginTime: Date.now() }
      }
      store.saveWxUsers(wxUsers)
      self.setData({ paymentStatus: '已为 ' + phone + ' 开通云端存储（永久）' })
      wx.showToast({ title: '开通成功', icon: 'success' })
    })
  },

  onGrantBeauty: function () {
    var phone = this.data.paymentPhone
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return
    }
    var self = this
    store.loadWxUsers(function (wxUsers) {
      wxUsers = wxUsers || {}
      var found = false
      var keys = Object.keys(wxUsers)
      for (var i = 0; i < keys.length; i++) {
        var u = wxUsers[keys[i]]
        if (u && u.phone === phone) {
          u.paidUntil = Date.now() + 36500 * 24 * 60 * 60 * 1000
          u.upgradePaidUntil = Date.now() + 36500 * 24 * 60 * 60 * 1000
          found = true; break
        }
      }
      if (!found) {
        wxUsers['wx_' + phone] = { phone: phone, paidUntil: Date.now() + 36500 * 24 * 60 * 60 * 1000, upgradePaidUntil: Date.now() + 36500 * 24 * 60 * 60 * 1000, firstLoginTime: Date.now() }
      }
      store.saveWxUsers(wxUsers)
      self.setData({ paymentStatus: '已为 ' + phone + ' 开通变美计划+云存储（永久）' })
      wx.showToast({ title: '开通成功', icon: 'success' })
    })
  },

  // ===== 搜索 =====
  onSearchPhoneInput: function (e) {
    this.setData({ searchPhone: e.detail.value }); this.applyFilter()
  },

  // ===== 密码 =====
  onOldPwInput: function (e) { this.setData({ oldPw: e.detail.value }) },
  onNewPwInput: function (e) { this.setData({ newPw: e.detail.value }) },
  onNewPw2Input: function (e) { this.setData({ newPw2: e.detail.value }) },

  onChangeAdminPw: function () {
    var oldPw = this.data.oldPw, newPw = this.data.newPw, newPw2 = this.data.newPw2
    if (!oldPw) { wx.showToast({ title: '请输入当前密码', icon: 'none' }); return }
    if (!newPw) { wx.showToast({ title: '请输入新密码', icon: 'none' }); return }
    if (newPw.length < 6) { wx.showToast({ title: '新密码至少6位', icon: 'none' }); return }
    if (newPw !== newPw2) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return }
    if (oldPw !== config.DEFAULT_ADMIN_PW && oldPw !== wx.getStorageSync('admin_pw')) {
      wx.showToast({ title: '当前密码不正确', icon: 'none' }); return
    }
    if (oldPw === newPw) { wx.showToast({ title: '新密码不能与当前密码相同', icon: 'none' }); return }
    wx.setStorageSync('admin_pw', newPw)
    this.setData({ oldPw: '', newPw: '', newPw2: '' })
    wx.showToast({ title: '密码修改成功', icon: 'success' })
  }
})
