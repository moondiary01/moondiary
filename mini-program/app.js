// Moon Diary app.js — 全局逻辑
const store = require('./utils/store.js');
const config = require('./utils/config.js');
const beautyStore = require('./utils/beauty-store.js');

App({
  globalData: {
    loginType: null,       // 'key' | 'wx' | 'admin'
    userKey: null,         // 密钥值 / 'wx_{openid}' / 'admin'
    state: null,           // 用户数据
    isPaid: false,         // 是否已付费
    isTrial: false,        // 是否试用中
    trialExpired: false,   // 试用是否过期
    wxUserInfo: null,      // 微信用户信息
    statusReady: false,    // 状态检查是否完成（异步）
    canUseUpgrade: false,  // 是否可使用升级版
    upgradeExpired: false  // 升级版是否过期
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
      } else {
        // 密钥用户和管理员直接标记就绪，升级版免费
        this.globalData.statusReady = true;
        this.globalData.canUseUpgrade = true;
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
      // 升级版状态
      var upStatus = beautyStore.checkUpgradeStatus(localInfo, 'wx');
      this.globalData.canUseUpgrade = upStatus.canUseUpgrade;
      this.globalData.upgradeExpired = upStatus.upgradeExpired;
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

        // 升级版状态
        var upStatus = beautyStore.checkUpgradeStatus(userInfo, 'wx');
        self.globalData.canUseUpgrade = upStatus.canUseUpgrade;
        self.globalData.upgradeExpired = upStatus.upgradeExpired;

        // 缓存到本地
        store.setLocal('_wx_users_cache', wxUsers);
      }
      self.globalData.statusReady = true;
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
