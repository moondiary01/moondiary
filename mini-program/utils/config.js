// Moon Diary 小程序全局配置

// COS 配置（运行时解码，避免明文暴露）
var _c = function () { return wx.base64ToArrayBuffer ? arrayBufferToString(wx.base64ToArrayBuffer('QUtJRGtVQm5Nelh1R1hmcG83WHlZNFFteHhrTW1BT1JJelVV')) : ''; };
var _k = function () { return wx.base64ToArrayBuffer ? arrayBufferToString(wx.base64ToArrayBuffer('d2hXQWN5OEt3UE1Bb0lmdjMydmpURnRWNmlBa0h3Umw=')) : ''; };

function arrayBufferToString(buf) {
  var bytes = new Uint8Array(buf);
  var str = '';
  for (var i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

// 预设解码（兼容方案）
function decodeBase64(b64) {
  try {
    if (typeof atob !== 'undefined') return atob(b64);
    // 小程序无 atob，手动解码
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var str = b64.replace(/=+$/, '');
    var output = '';
    for (var bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (e) {
    return '';
  }
}

const COS_CONFIG = {
  SecretId: decodeBase64('QUtJRGtVQm5Nelh1R1hmcG83WHlZNFFteHhrTW1BT1JJelVV'),
  SecretKey: decodeBase64('d2hXQWN5OEt3UE1Bb0lmdjMydmpURnRWNmlBa0h3Umw='),
  Bucket: 'moondiary-1459278480',
  Region: 'ap-chongqing'
};

// 管理员配置
const ADMIN_PHONE = '18680881810';
const ADMIN_SESSION = 'admin';
const DEFAULT_ADMIN_PW = 'moonmoondiaomeinv';

// 预设密钥
const PRESET_KEYS = [
  '010454', '012857', '013348', '018485', '023425', '023591', '036032', '036446', '037880', '052685',
  '052808', '058200', '073455', '076343', '084789', '084982', '093400', '096418', '101874', '102582',
  '115952', '119283', '142757', '143758', '164751', '180274', '184166', '209636', '236646', '248964',
  '267433', '271906', '274491', '280859', '284903', '293586', '304476', '308139', '328462', '329298',
  '346078', '346277', '369485', '377674', '387697', '419948', '432766', '433973', '440677', '447871',
  '456865', '476101', '482027', '488360', '489068', '489110', '491723', '495407', '508373', '549524',
  '562504', '569932', '573489', '575763', '599981', '610266', '617810', '625423', '657913', '668217',
  '701927', '711630', '723316', '729015', '733029', '737867', '745817', '770571', '802718', '809624',
  '824136', '825033', '850547', '856860', '865608', '872030', '884622', '886980', '887928', '889171',
  '890256', '898640', '914858', '925406', '928652', '930565', '931496', '956876', '986478', '987348'
];

// 会员配置
const MEMBERSHIP_FEE = 19.9;        // 月费
const TRIAL_HOURS = 24;              // 试用小时数
const MEMBERSHIP_DAYS = 30;          // 会员有效天数

module.exports = {
  COS_CONFIG,
  ADMIN_PHONE,
  ADMIN_SESSION,
  DEFAULT_ADMIN_PW,
  PRESET_KEYS,
  MEMBERSHIP_FEE,
  TRIAL_HOURS,
  MEMBERSHIP_DAYS
};
