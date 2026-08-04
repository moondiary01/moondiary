// utils/audio.js — 音效管理器
var audioContexts = {}

function playEffect(type) {
  var path = ''
  switch (type) {
    case 'click': path = '/assets/audio/click.mp3'; break
    case 'page-flip': path = '/assets/audio/page-flip.mp3'; break
    case 'enter': path = '/assets/audio/enter.mp3'; break
    case 'back': path = '/assets/audio/back.mp3'; break
    default: return
  }

  // 复用或创建
  if (audioContexts[type]) {
    try {
      audioContexts[type].stop()
      audioContexts[type].play()
      return
    } catch (e) {
      // 重建
    }
  }

  try {
    var ctx = wx.createInnerAudioContext()
    ctx.src = path
    ctx.volume = 0.5
    ctx.onError(function () {})
    audioContexts[type] = ctx
    ctx.play()
  } catch (e) {}
}

function playClick() { playEffect('click') }
function playPageFlip() { playEffect('page-flip') }
function playEnter() { playEffect('enter') }
function playBack() { playEffect('back') }

// ===== 水滴音效：合成 WAV 并播放 =====
// 微信小程序中 WebAudio API 不可用，使用合成 WAV base64 方式
var _waterAudioCtx = null
var _waterBase64 = null

function _generateWaterWav() {
  // 生成短促水滴声 WAV（8000Hz, 16bit mono）
  // 水滴：1400Hz 正弦 + 280Hz 低音，约 0.22 秒
  var sampleRate = 8000
  var duration = 0.22
  var numSamples = Math.floor(sampleRate * duration)
  var buffer = new ArrayBuffer(44 + numSamples * 2)
  var view = new DataView(buffer)

  // WAV header
  function writeString(offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)       // chunk size
  view.setUint16(20, 1, true)        // PCM
  view.setUint16(22, 1, true)        // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)        // block align
  view.setUint16(34, 16, true)       // bits per sample
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  // 合成水滴声：1400Hz 高频 + 280Hz 低频
  for (var i = 0; i < numSamples; i++) {
    var t = i / sampleRate
    var env = Math.exp(-t * 18) // 衰减包络
    // 高频水滴
    var high = Math.sin(2 * Math.PI * 1400 * t) * 0.6
    // 低频咕嘟（延迟出现）
    var lowEnv = t > 0.03 ? Math.exp(-(t - 0.03) * 12) : 0
    var low = Math.sin(2 * Math.PI * 280 * t) * 0.4 * lowEnv
    var sample = (high * env + low) * 0.7
    // 限制幅度
    if (sample > 0.9) sample = 0.9
    if (sample < -0.9) sample = -0.9
    var intSample = Math.floor(sample * 32767)
    view.setInt16(44 + i * 2, intSample, true)
  }

  // 转 base64
  var bytes = new Uint8Array(buffer)
  var binary = ''
  for (var j = 0; j < bytes.length; j++) {
    binary += String.fromCharCode(bytes[j])
  }
  return 'data:audio/wav;base64,' + btoa(binary)
}

function playWater() {
  try {
    if (!_waterBase64) {
      _waterBase64 = _generateWaterWav()
    }
    // 停止之前的播放
    if (_waterAudioCtx) {
      try { _waterAudioCtx.destroy() } catch (e) {}
      _waterAudioCtx = null
    }
    _waterAudioCtx = wx.createInnerAudioContext()
    _waterAudioCtx.src = _waterBase64
    _waterAudioCtx.volume = 0.5
    _waterAudioCtx.onError(function () {})
    _waterAudioCtx.onEnded(function () {
      try { _waterAudioCtx.destroy() } catch (e) {}
      _waterAudioCtx = null
    })
    _waterAudioCtx.play()
  } catch (e) {
    // 降级：震动反馈
    try { wx.vibrateShort({ type: 'light' }) } catch (e2) {}
  }
}

module.exports = {
  playEffect: playEffect,
  playClick: playClick,
  playPageFlip: playPageFlip,
  playEnter: playEnter,
  playBack: playBack,
  playWater: playWater
}
