// Moon Diary 数据存储封装
const { COS_CONFIG, PRESET_KEYS } = require('./config.js');

// ===== 本地存储 =====
function getLocal(key) {
  try { return wx.getStorageSync(key) || null; } catch (e) { return null; }
}
function setLocal(key, data) {
  try { wx.setStorageSync(key, data); } catch (e) {}
}
function removeLocal(key) {
  try { wx.removeStorageSync(key); } catch (e) {}
}

// ===== 云端 COS 操作 =====
// 小程序环境下的 COS HTTP API 封装（不依赖 SDK，直接用 wx.request）

function getCosUrl(key) {
  return 'https://' + COS_CONFIG.Bucket + '.cos.' + COS_CONFIG.Region + '.myqcloud.com/userdata/' + key + '.json';
}

// 生成 COS 签名（简单版，用于 PUT/GET）
function getCosAuth(method, key) {
  // 这里使用简单的临时密钥方式
  // 实际生产环境建议使用临时密钥服务
  return COS_CONFIG.SecretId + ':' + COS_CONFIG.SecretKey;
}

// 保存数据到云端
function saveToCloud(key, data, callback) {
  const url = getCosUrl(key);
  wx.request({
    url: url,
    method: 'PUT',
    header: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(data),
    success: function (res) {
      if (res.statusCode === 200) {
        console.log('云端保存成功:', key);
        if (callback) callback(true);
      } else {
        console.error('云端保存失败:', res.statusCode);
        if (callback) callback(false);
      }
    },
    fail: function (err) {
      console.error('云端保存异常:', err);
      if (callback) callback(false);
    }
  });
}

// 从云端读取数据
function loadFromCloud(key, callback) {
  const url = getCosUrl(key);
  wx.request({
    url: url,
    method: 'GET',
    header: {
      'Content-Type': 'application/json'
    },
    success: function (res) {
      if (res.statusCode === 200 && res.data) {
        console.log('云端读取成功:', key);
        if (callback) callback(res.data);
      } else {
        console.log('云端无数据:', key);
        if (callback) callback(null);
      }
    },
    fail: function (err) {
      console.error('云端读取异常:', err);
      if (callback) callback(null);
    }
  });
}

// ===== 用户数据存取 =====
function userStorageKey(userKey) {
  return 'moondiary_state_' + userKey;
}

function saveState(userKey, state) {
  setLocal(userStorageKey(userKey), state);
  saveToCloud(userKey, state);
}

function loadState(userKey, callback) {
  // 先读本地
  var local = getLocal(userStorageKey(userKey));
  if (local) {
    // 再读云端合并
    loadFromCloud(userKey, function (cloudData) {
      if (cloudData) {
        // 云端覆盖本地
        var merged = Object.assign({}, local, cloudData);
        setLocal(userStorageKey(userKey), merged);
        if (callback) callback(merged);
      } else {
        if (callback) callback(local);
      }
    });
  } else {
    // 全新用户
    loadFromCloud(userKey, function (cloudData) {
      if (cloudData) {
        setLocal(userStorageKey(userKey), cloudData);
        if (callback) callback(cloudData);
      } else {
        if (callback) callback(null);
      }
    });
  }
}

// ===== 预设密钥信息 =====
function loadPresetInfo(callback) {
  loadFromCloud('_preset_info', callback);
}
function savePresetInfo(info) {
  saveToCloud('_preset_info', info);
}

// ===== 手机号绑定 =====
function loadPhoneBindings(callback) {
  loadFromCloud('_phone_bindings', callback);
}
function savePhoneBindings(bindings) {
  saveToCloud('_phone_bindings', bindings);
}

// ===== 微信用户信息 =====
function loadWxUsers(callback) {
  loadFromCloud('_wx_users', callback);
}
function saveWxUsers(users) {
  saveToCloud('_wx_users', users);
}

// ===== 工具函数 =====
function localDateStr(d) {
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function isPresetKey(k) {
  return PRESET_KEYS.indexOf(k) !== -1;
}

// 检查用户试用/付费状态
function checkUserStatus(wxUserInfo) {
  if (!wxUserInfo) return { canUse: false, isPaid: false, isTrial: false, trialExpired: true };

  var now = Date.now();
  var firstLogin = wxUserInfo.firstLoginTime || now;
  var paidUntil = wxUserInfo.paidUntil || null;

  // 已付费且未过期
  if (paidUntil && paidUntil > now) {
    return { canUse: true, isPaid: true, isTrial: false };
  }
  // 试用中（24小时内）
  var trialMs = 24 * 60 * 60 * 1000;
  if (now - firstLogin < trialMs) {
    var remaining = trialMs - (now - firstLogin);
    return { canUse: true, isPaid: false, isTrial: true, remaining: remaining };
  }
  // 试用过期
  return { canUse: false, isPaid: false, isTrial: false, trialExpired: true };
}

// 格式化剩余试用时间
function formatRemaining(ms) {
  var hours = Math.floor(ms / (60 * 60 * 1000));
  var minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return hours + '小时' + minutes + '分钟';
}

module.exports = {
  getLocal, setLocal, removeLocal,
  saveToCloud, loadFromCloud,
  userStorageKey, saveState, loadState,
  loadPresetInfo, savePresetInfo,
  loadPhoneBindings, savePhoneBindings,
  loadWxUsers, saveWxUsers,
  localDateStr, isPresetKey,
  checkUserStatus, formatRemaining
};
