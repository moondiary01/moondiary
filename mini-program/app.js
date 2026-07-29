// Moon Diary app.js — 全局逻辑
const store = require('./utils/store.js');
const config = require('./utils/config.js');

App({
  globalData: {
    loginType: null,       // 'key' | 'wx' | 'admin'
    userKey: null,         // 密钥值 / 'wx_{openid}' / 'admin'
    state: null,           // 用户数据
    isPaid: false,         // 是否已付费
    isTrial: false,        // 是否试用中
    trialExpired: false,   // 试用是否过期
    wxUserInfo: null       // 微信用户信息
  },

  onLaunch: function () {
    // 检查登录态
    var loginType = store.getLocal('loginType');
    var userKey = store.getLocal('userKey');

    if (loginType && userKey) {
      this.globalData.loginType = loginType;
      this.globalData.userKey = userKey;

      if (loginType === 'wx') {
        // 微信用户：检查试用/付费状态
        this.checkWxUserStatus();
      }
      // 密钥用户和管理员不需要检查
    }
  },

  // 检查微信用户试用/付费状态
  checkWxUserStatus: function () {
    var self = this;
    var userKey = this.globalData.userKey;

    store.loadWxUsers(function (wxUsers) {
      wxUsers = wxUsers || {};
      var userInfo = wxUsers[userKey];

      if (userInfo) {
        var status = store.checkUserStatus(userInfo);
        self.globalData.isPaid = status.isPaid;
        self.globalData.isTrial = status.isTrial;
        self.globalData.trialExpired = status.trialExpired || false;
        self.globalData.wxUserInfo = userInfo;
      }
    });
  },

  // 判断用户是否可以使用功能
  canUse: function () {
    if (this.globalData.loginType === 'key' || this.globalData.loginType === 'admin') {
      return true; // 密钥用户和管理员无限制
    }
    if (this.globalData.loginType === 'wx') {
      return this.globalData.isPaid || this.globalData.isTrial;
    }
    return false;
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
  }
});
