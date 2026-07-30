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

module.exports = {
  playEffect: playEffect,
  playClick: playClick,
  playPageFlip: playPageFlip,
  playEnter: playEnter,
  playBack: playBack
}
