// MoonMemo 月亮日记 app.js — 全局逻辑
const store = require('./utils/store.js');
const config = require('./utils/config.js');
const beautyStore = require('./utils/beauty-store.js');

App({
  globalData: {
    loginType: null,       // 'key' | 'wx' | 'admin'
    userKey: null,         // 密钥值 / 'wx_{openid}' / 'admin'
    realPhone: '',         // 绑定的真实手机号（微信用户绑定后为手机号，否则=userKey）
    state: null,           // 用户数据
    isPaid: false,         // 是否已付费
    isTrial: false,        // 是否试用中
    trialExpired: false,   // 试用是否过期
    wxUserInfo: null,      // 微信用户信息
    statusReady: false,    // 状态检查是否完成（异步）
    canUseUpgrade: false,  // 是否可使用升级版（仅beautyPaid）
    upgradeExpired: false, // 升级版是否过期
    canSeeUpgrade: false   // 是否有资格看到升级版入口（已购普通版或升级版）
  },

  onLaunch: function () {
    // 检查登录态
    var loginType = store.getLocal('loginType');
    var userKey = store.getLocal('userKey');

    if (loginType && userKey) {
      this.globalData.loginType = loginType;
      this.globalData.userKey = userKey;

      if (loginType === 'wx') {
        // 微信用户：检查试用/付费状态（异步）
        this.checkWxUserStatus();
      } else if (loginType === 'admin') {
        // 管理员（手机号登录）：直接标记就绪，全部功能可用
        this.globalData.isPaid = true;
        this.globalData.statusReady = true;
        this.globalData.canUseUpgrade = true;
      } else {
        // 密钥/手机用户：基础功能可用，升级版需从 payments 检查 beautyPaid
        this.globalData.statusReady = true;
        this.checkKeyUserUpgradeStatus();
      }
    } else {
      // 未登录，标记就绪
      this.globalData.statusReady = true;
    }
  },

  // 检查微信用户试用/付费状态
  checkWxUserStatus: function () {
    var self = this;
    var userKey = this.globalData.userKey;

    // 先从本地缓存快速判断
    var localWxUsers = store.getLocal('_wx_users_cache') || {};
    var localInfo = localWxUsers[userKey];
    if (localInfo) {
      var quickStatus = store.checkUserStatus(localInfo);
      this.globalData.isPaid = quickStatus.isPaid;
      this.globalData.isTrial = quickStatus.isTrial;
      this.globalData.trialExpired = quickStatus.trialExpired || false;
      this.globalData.wxUserInfo = localInfo;
      // 升级版状态（从 payments 读取）
      beautyStore.checkUpgradeStatus(userKey, 'wx', function (upStatus) {
        self.globalData.canUseUpgrade = upStatus.canUseUpgrade;
        self.globalData.upgradeExpired = upStatus.upgradeExpired;
      });
      this.globalData.statusReady = true;
    }

    // 再从云端同步最新状态
    store.loadWxUsers(function (wxUsers) {
      wxUsers = wxUsers || {};
      var userInfo = wxUsers[userKey];

      if (userInfo) {
        var status = store.checkUserStatus(userInfo);
        self.globalData.isPaid = status.isPaid;
        self.globalData.isTrial = status.isTrial;
        self.globalData.trialExpired = status.trialExpired || false;
        self.globalData.wxUserInfo = userInfo;

        // 升级版状态（从 payments 读取）
        beautyStore.checkUpgradeStatus(userKey, 'wx', function (upStatus) {
          self.globalData.canUseUpgrade = upStatus.canUseUpgrade;
          self.globalData.upgradeExpired = upStatus.upgradeExpired;
        });

        // 缓存到本地
        store.setLocal('_wx_users_cache', wxUsers);
      }
      self.globalData.statusReady = true;
    });
  },

  // 检查密钥/手机用户的升级版状态（从 payments 读取）
  checkKeyUserUpgradeStatus: function () {
    var self = this;
    var userKey = this.globalData.userKey;
    if (!userKey) {
      this.globalData.canUseUpgrade = false;
      return;
    }
    store.loadPayments(function (payments) {
      payments = payments || {};
      var p = payments[userKey] || {};
      self.globalData.canUseUpgrade = !!p.beautyPaid;
    });
  },

  // 判断用户是否可以使用功能
  canUse: function () {
    if (this.globalData.loginType === 'key' || this.globalData.loginType === 'admin') {
      return true;
    }
    if (this.globalData.loginType === 'wx') {
      if (this.globalData.wxUserInfo && this.globalData.wxUserInfo.disabled === true) {
        return false;
      }
      return this.globalData.isPaid || this.globalData.isTrial;
    }
    return false;
  },

  // 判断用户是否可以使用升级版
  canUseUpgrade: function () {
    return this.globalData.canUseUpgrade;
  },

  // 初始化真实手机号（登录后调用）
  // 微信用户绑定手机号后 realPhone=手机号，否则 realPhone=userKey
  initRealPhone: function () {
    var self = this;
    var userKey = this.globalData.userKey;
    if (!userKey) {
      this.globalData.realPhone = '';
      return;
    }
    // 非微信用户直接用 userKey
    if (userKey.indexOf('wx_') !== 0) {
      this.globalData.realPhone = userKey;
      return;
    }
    // 微信用户：先读本地缓存
    var localBound = store.getLocal('wx_bound_phone');
    if (localBound) {
      this.globalData.realPhone = localBound;
    } else {
      this.globalData.realPhone = userKey;
    }
    // 再从云端同步绑定关系
    store.loadWxPhoneBindings(function (bindings) {
      bindings = bindings || {};
      var bound = bindings[userKey];
      if (bound) {
        self.globalData.realPhone = bound;
        // 缓存到本地，供 saveState/loadState 同步读取
        store.setLocal('wx_bound_phone', bound);
      } else {
        self.globalData.realPhone = userKey; // 未绑定，用 wx_ID
      }
    });
  },

  // 获取真实手机号（付费/激活码绑定用）
  getRealPhone: function () {
    return this.globalData.realPhone || this.globalData.userKey || '';
  },

  // 退出登录
  logout: function () {
    store.removeLocal('loginType');
    store.removeLocal('userKey');
    this.globalData.loginType = null;
    this.globalData.userKey = null;
    this.globalData.state = null;
    this.globalData.isPaid = false;
    this.globalData.isTrial = false;
    this.globalData.trialExpired = false;
    this.globalData.canUseUpgrade = false;
    this.globalData.upgradeExpired = false;
    this.globalData.statusReady = true;
  }
});
