// pages/admin/admin.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    totalUsers: 0,
    trialUsers: 0,        // 试用未充值人数
    vipBasicUsers: 0,     // VIP基础版用户人数
    vipUpgradeUsers: 0,    // VIP升级版用户人数（暂不统计，等升级版上线后启用）
    freeUsers: 0,          // 免费使用人数（密钥用户）
    showUpgradeStat: true,// 升级版统计开关
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
          var now = Date.now()
          var trialMs = 24 * 60 * 60 * 1000

          // 统计微信用户分类
          var trialCount = 0       // 试用未充值
          var vipBasicCount = 0    // VIP基础版（已付费）
          var vipUpgradeCount = 0  // VIP升级版（暂不统计）

          if (wxUsersData) {
            var wxKeys = Object.keys(wxUsersData)
            for (var wi = 0; wi < wxKeys.length; wi++) {
              var wxUser = wxUsersData[wxKeys[wi]]
              if (!wxUser) continue

              var firstLogin = wxUser.firstLoginTime || now
              var paidUntil = wxUser.paidUntil || null

              // 判断VIP升级版（目前没有升级版，跳过）
              // if (wxUser.upgradePaid && wxUser.upgradePaidUntil > now) {
              //   vipUpgradeCount++
              // }

              if (paidUntil && paidUntil > now) {
                // 已付费 = VIP基础版
                vipBasicCount++
              } else if (now - firstLogin < trialMs) {
                // 试用期内未充值
                trialCount++
              }
              // 试用过期未付费的不计入任何统计（或可单独统计）
            }
          }

          // 构建密钥列表
          var keyList = []
          var freeCount = 0
          var presetKeys = config.PRESET_KEYS

          for (var i = 0; i < presetKeys.length; i++) {
            var key = presetKeys[i]
            var keyInfo = presetInfo[key] || {}
            var isActivated = keyInfo.activated === true
            if (isActivated) freeCount++

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

          var totalUsers = freeCount + trialCount + vipBasicCount

          self.setData({
            keyList: keyList,
            filteredKeys: keyList,
            totalUsers: totalUsers,
            trialUsers: trialCount,
            vipBasicUsers: vipBasicCount,
            vipUpgradeUsers: vipUpgradeCount,
            freeUsers: freeCount,
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
    var self = this
    var status = this.data.filterStatus
    var keys = this.data.keyList

    // 先按手机号搜索过滤
    if (this.data.searchPhone) {
      keys = keys.filter(function (k) {
        return k.phone && k.phone.indexOf(self.data.searchPhone) !== -1
      })
    }

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
  },

  // ===== 付费管理 =====
  onPaymentPhoneInput: function (e) {
    this.setData({ paymentPhone: e.detail.value });
  },

  onGrantStorage: function () {
    var phone = this.data.paymentPhone;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    var self = this;
    var store = require('../../utils/store.js');
    store.loadWxUsers(function (wxUsers) {
      wxUsers = wxUsers || {};
      var found = false;
      var keys = Object.keys(wxUsers);
      for (var i = 0; i < keys.length; i++) {
        var u = wxUsers[keys[i]];
        if (u && u.phone === phone) {
          u.paidUntil = Date.now() + 36500 * 24 * 60 * 60 * 1000;
          found = true;
          break;
        }
      }
      if (!found) {
        // 创建新用户
        var newKey = 'wx_' + phone;
        wxUsers[newKey] = {
          phone: phone,
          paidUntil: Date.now() + 36500 * 24 * 60 * 60 * 1000,
          firstLoginTime: Date.now()
        };
      }
      store.saveWxUsers(wxUsers);
      self.setData({ paymentStatus: '✅ 已为 ' + phone + ' 开通云端存储（永久）' });
      wx.showToast({ title: '开通成功', icon: 'success' });
    });
  },

  onGrantBeauty: function () {
    var phone = this.data.paymentPhone;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    var self = this;
    var store = require('../../utils/store.js');
    store.loadWxUsers(function (wxUsers) {
      wxUsers = wxUsers || {};
      var found = false;
      var keys = Object.keys(wxUsers);
      for (var i = 0; i < keys.length; i++) {
        var u = wxUsers[keys[i]];
        if (u && u.phone === phone) {
          u.paidUntil = Date.now() + 36500 * 24 * 60 * 60 * 1000;
          u.upgradePaidUntil = Date.now() + 36500 * 24 * 60 * 60 * 1000;
          found = true;
          break;
        }
      }
      if (!found) {
        var newKey = 'wx_' + phone;
        wxUsers[newKey] = {
          phone: phone,
          paidUntil: Date.now() + 36500 * 24 * 60 * 60 * 1000,
          upgradePaidUntil: Date.now() + 36500 * 24 * 60 * 60 * 1000,
          firstLoginTime: Date.now()
        };
      }
      store.saveWxUsers(wxUsers);
      self.setData({ paymentStatus: '✅ 已为 ' + phone + ' 开通变美计划+云存储（永久）' });
      wx.showToast({ title: '开通成功', icon: 'success' });
    });
  },

  // ===== 手机号搜索 =====
  onSearchPhoneInput: function (e) {
    this.setData({ searchPhone: e.detail.value });
    this.applyFilter();
  },

  // ===== 管理员密码修改 =====
  onOldPwInput: function (e) { this.setData({ oldPw: e.detail.value }); },
  onNewPwInput: function (e) { this.setData({ newPw: e.detail.value }); },
  onNewPw2Input: function (e) { this.setData({ newPw2: e.detail.value }); },

  onChangeAdminPw: function () {
    var oldPw = this.data.oldPw;
    var newPw = this.data.newPw;
    var newPw2 = this.data.newPw2;
    if (!oldPw) { wx.showToast({ title: '请输入当前密码', icon: 'none' }); return; }
    if (!newPw) { wx.showToast({ title: '请输入新密码', icon: 'none' }); return; }
    if (newPw !== newPw2) { wx.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
    if (oldPw !== config.DEFAULT_ADMIN_PW) { wx.showToast({ title: '当前密码不正确', icon: 'none' }); return; }
    // 小程序中密码存储在本地
    wx.setStorageSync('admin_pw', newPw);
    this.setData({ oldPw: '', newPw: '', newPw2: '' });
    wx.showToast({ title: '密码修改成功', icon: 'success' });
  }
})
