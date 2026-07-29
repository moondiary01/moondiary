// pages/admin/admin.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    totalUsers: 0,
    activeKeys: 0,
    wxUsers: 0,
    version: '3.0.0',
    noticeSent: false,
    keyList: [],
    filteredKeys: [],
    filterStatus: 'all'
  },

  onLoad: function () {
    // 检查是否管理员
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

    // 加载预设密钥信息（网页版结构: {key: {activated, phone, activatedAt, gender, age, note}}）
    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}

      // 加载手机号绑定（网页版结构: {phone: key}）
      store.loadPhoneBindings(function (bindings) {
        bindings = bindings || {}

        // 构建反向映射：key → phone
        var keyToPhone = {}
        var phones = Object.keys(bindings)
        for (var p = 0; p < phones.length; p++) {
          var phone = phones[p]
          var boundKey = bindings[phone]
          keyToPhone[boundKey] = phone
        }

        // 加载微信用户
        store.loadWxUsers(function (wxUsersData) {
          var wxCount = wxUsersData ? Object.keys(wxUsersData).length : 0

          // 构建密钥列表
          var keyList = []
          var activeCount = 0
          var presetKeys = config.PRESET_KEYS

          for (var i = 0; i < presetKeys.length; i++) {
            var key = presetKeys[i]
            var keyInfo = presetInfo[key] || {}
            var isActivated = keyInfo.activated === true
            if (isActivated) activeCount++

            var status = ''
            var statusText = ''
            var statusClass = ''
            if (keyInfo.activated === true) {
              status = 'active'
              statusText = '已启用'
              statusClass = 'status-active'
            } else if (keyInfo.activated === false && keyInfo.revoked) {
              status = 'revoked'
              statusText = '已作废'
              statusClass = 'status-revoked'
            } else {
              status = 'inactive'
              statusText = '未启用'
              statusClass = 'status-inactive'
            }

            keyList.push({
              key: key,
              phone: keyInfo.phone || keyToPhone[key] || '',
              remark: keyInfo.note || '',
              status: status,
              statusText: statusText,
              statusClass: statusClass
            })
          }

          var totalUsers = activeCount + wxCount

          self.setData({
            keyList: keyList,
            filteredKeys: keyList,
            totalUsers: totalUsers,
            activeKeys: activeCount,
            wxUsers: wxCount,
            noticeSent: presetInfo.noticeSent || false
          })

          self.applyFilter()
        })
      })
    })
  },

  // ===== 筛选 =====
  onFilter: function (e) {
    var status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status })
    this.applyFilter()
  },

  applyFilter: function () {
    var status = this.data.filterStatus
    var keys = this.data.keyList

    if (status === 'all') {
      this.setData({ filteredKeys: keys })
    } else {
      var filtered = keys.filter(function (k) {
        return k.status === status
      })
      this.setData({ filteredKeys: filtered })
    }
  },

  // ===== 切换密钥状态 =====
  onToggleKey: function (e) {
    var self = this
    var key = e.currentTarget.dataset.key
    var action = e.currentTarget.dataset.action

    wx.showModal({
      title: '确认操作',
      content: '确定要' + (action === 'activate' ? '启用' : '作废') + '密钥 ' + key + ' 吗？',
      success: function (res) {
        if (res.confirm) {
          self.doToggleKey(key, action)
        }
      }
    })
  },

  doToggleKey: function (key, action) {
    var self = this

    store.loadPresetInfo(function (presetInfo) {
      presetInfo = presetInfo || {}

      // 网页版结构: {key: {activated, phone, activatedAt, gender, age, note}}
      var keyInfo = presetInfo[key] || {}

      if (action === 'activate') {
        keyInfo.activated = true
        keyInfo.activatedAt = Date.now()
        keyInfo.revoked = false
      } else {
        keyInfo.activated = false
        keyInfo.revoked = true
      }

      presetInfo[key] = keyInfo

      store.savePresetInfo(presetInfo)

      wx.showToast({ title: '操作成功', icon: 'success' })

      // 重新加载
      setTimeout(function () {
        self.loadData()
      }, 500)
    })
  },

  // ===== 发送版本通知 =====
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
  }
})
