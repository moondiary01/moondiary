// MoonMemo 月亮日记 数据存储封装
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

// HMAC-SHA1 实现（用于 COS V5 签名）
function hmacSha1(key, message) {
  // 使用小程序的 hmac 算法（纯JS实现）
  var blockSize = 64;

  function strToBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else if (c < 2048) {
        bytes.push(192 | (c >> 6));
        bytes.push(128 | (c & 63));
      } else {
        bytes.push(224 | (c >> 12));
        bytes.push(128 | ((c >> 6) & 63));
        bytes.push(128 | (c & 63));
      }
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    }
    return hex;
  }

  // SHA1 implementation
  function sha1(msgBytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var ml = msgBytes.length;
    var bitLen = ml * 8;

    // Padding
    msgBytes = msgBytes.slice();
    msgBytes.push(0x80);
    while (msgBytes.length % 64 !== 56) {
      msgBytes.push(0);
    }
    // Append length as 64-bit big-endian
    for (var i = 7; i >= 0; i--) {
      msgBytes.push((bitLen >>> (i * 8)) & 0xFF);
    }

    function rotl(n, s) { return ((n << s) | (n >>> (32 - s))) & 0xFFFFFFFF; }

    for (var chunk = 0; chunk < msgBytes.length; chunk += 64) {
      var w = [];
      for (var i = 0; i < 16; i++) {
        w[i] = (msgBytes[chunk + i * 4] << 24) | (msgBytes[chunk + i * 4 + 1] << 16) | (msgBytes[chunk + i * 4 + 2] << 8) | msgBytes[chunk + i * 4 + 3];
        w[i] = w[i] & 0xFFFFFFFF;
      }
      for (var i = 16; i < 80; i++) {
        w[i] = rotl((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]), 1);
      }

      var a = h0, b = h1, c = h2, d = h3, e = h4;
      for (var i = 0; i < 80; i++) {
        var f, k;
        if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }

        var temp = (rotl(a, 5) + f + e + k + w[i]) & 0xFFFFFFFF;
        e = d; d = c; c = rotl(b, 30); b = a; a = temp;
      }

      h0 = (h0 + a) & 0xFFFFFFFF;
      h1 = (h1 + b) & 0xFFFFFFFF;
      h2 = (h2 + c) & 0xFFFFFFFF;
      h3 = (h3 + d) & 0xFFFFFFFF;
      h4 = (h4 + e) & 0xFFFFFFFF;
    }

    var result = [];
    var hs = [h0, h1, h2, h3, h4];
    for (var i = 0; i < 5; i++) {
      result.push((hs[i] >>> 24) & 0xFF);
      result.push((hs[i] >>> 16) & 0xFF);
      result.push((hs[i] >>> 8) & 0xFF);
      result.push(hs[i] & 0xFF);
    }
    return result;
  }

  var keyBytes = strToBytes(key);
  if (keyBytes.length > blockSize) {
    keyBytes = sha1(keyBytes);
  }
  while (keyBytes.length < blockSize) {
    keyBytes.push(0);
  }

  var oKeyPad = [], iKeyPad = [];
  for (var i = 0; i < blockSize; i++) {
    oKeyPad.push(keyBytes[i] ^ 0x5C);
    iKeyPad.push(keyBytes[i] ^ 0x36);
  }

  var innerHash = sha1(iKeyPad.concat(strToBytes(message)));
  var outerHash = sha1(oKeyPad.concat(innerHash));

  return bytesToHex(outerHash);
}

// 生成 COS V5 签名
function getCosAuth(method, key) {
  var SecretId = COS_CONFIG.SecretId;
  var SecretKey = COS_CONFIG.SecretKey;

  var host = COS_CONFIG.Bucket + '.cos.' + COS_CONFIG.Region + '.myqcloud.com';
  var pathStr = '/userdata/' + key + '.json';

  // 签名时间
  var now = Math.floor(Date.now() / 1000);
  var signTimeStart = now;
  var signTimeEnd = now + 600; // 10分钟有效期
  var keyTime = signTimeStart + ';' + signTimeEnd;
  var signTime = keyTime;

  // 构造签名串
  // HttpHeadersString: "host=" + host + "\n"
  var headerList = 'host';
  var urlParamList = '';

  // 生成 SignKey = HMAC-SHA1(SecretKey, KeyTime)
  var signKey = hmacSha1(SecretKey, keyTime);

  // 生成 HttpMethodString
  var httpMethod = method.toLowerCase();

  // 生成 HttpUriString
  var httpUri = pathStr;

  // 生成 HttpHeaderString
  var httpHeaderString = 'host=' + host + '\n';

  // 生成 HttpRequestString
  var httpRequestString = httpMethod + '\n' + httpUri + '\n' + urlParamList + '\n' + httpHeaderString + '\n';

  // 生成 Signature = HMAC-SHA1(SignKey, HttpRequestString)
  var signature = hmacSha1(signKey, httpRequestString);

  // 组装 Authorization
  var auth = 'q-sign-algorithm=sha1' +
    '&q-ak=' + SecretId +
    '&q-sign-time=' + signTime +
    '&q-key-time=' + keyTime +
    '&q-header-list=' + headerList +
    '&q-url-param-list=' + urlParamList +
    '&q-signature=' + signature;

  return auth;
}

// 保存数据到云端
function saveToCloud(key, data, callback) {
  var url = getCosUrl(key);
  var auth = getCosAuth('put', key);
  wx.request({
    url: url,
    method: 'PUT',
    header: {
      'Content-Type': 'application/json',
      'Authorization': auth,
      'Host': COS_CONFIG.Bucket + '.cos.' + COS_CONFIG.Region + '.myqcloud.com'
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
  var url = getCosUrl(key);
  var auth = getCosAuth('get', key);
  wx.request({
    url: url,
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
      'Authorization': auth
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
  // 记录更新时间戳
  state._updatedAt = Date.now();
  // 空数据保护：防止覆盖云端已有数据
  if (isStateEmpty(state)) {
    console.log('数据为空，跳过云端保存');
    setLocal(userStorageKey(userKey), state);
    return;
  }
  setLocal(userStorageKey(userKey), state);
  saveToCloud(userKey, state);
}

// 检查 state 是否为空（防止空数据覆盖云端）
function isStateEmpty(state) {
  if (!state) return true;
  if (state.name && state.name.trim()) return false;
  if (state.startWeight !== null && state.startWeight !== undefined) return false;
  if (state.startFat !== null && state.startFat !== undefined) return false;
  if (state.days && state.days.length > 0) {
    for (var i = 0; i < state.days.length; i++) {
      var d = state.days[i];
      if (d && (d.weightAM || d.weightPM || d.diet || d.exercise || d.note || d.fat || d.water || d.bm || d.period || d.periodNote || d.photo)) return false;
    }
  }
  return true;
}

function loadState(userKey, callback) {
  // 先读本地
  var local = getLocal(userStorageKey(userKey));
  if (local) {
    // 再读云端合并
    loadFromCloud(userKey, function (cloudData) {
      if (cloudData) {
        // 时间戳对比：本地数据比云端新则跳过合并
        var localUpdated = local._updatedAt || 0;
        var cloudUpdated = cloudData._updatedAt || 0;
        if (cloudUpdated > localUpdated) {
          // 云端更新，以云端为主
          var merged = Object.assign({}, local, cloudData);
          if (!merged.days) merged.days = cloudData.days || local.days || [];
          if (!merged.periods) merged.periods = cloudData.periods || local.periods || [];
          if (!merged.weeklyReview) merged.weeklyReview = cloudData.weeklyReview || local.weeklyReview || [];
          setLocal(userStorageKey(userKey), merged);
          if (callback) callback(merged);
        } else {
          // 本地已是最新，保留本地
          if (callback) callback(local);
        }
      } else {
        if (callback) callback(local);
      }
    });
  } else {
    // 本地无数据，从云端加载
    loadFromCloud(userKey, function (cloudData) {
      if (cloudData) {
        // 确保数组字段存在
        if (!cloudData.days) cloudData.days = [];
        if (!cloudData.periods) cloudData.periods = [];
        if (!cloudData.weeklyReview) cloudData.weeklyReview = [];
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
