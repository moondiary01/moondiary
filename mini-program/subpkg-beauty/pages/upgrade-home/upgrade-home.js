var app = getApp()
var audio = require('../../../utils/audio.js')

Page({
  data: {
    canUseUpgrade: false
  },

  onLoad: function () {
    audio.playEnter()
    this.setData({ canUseUpgrade: app.canUseUpgrade() })
  },

  onShow: function () {
    this.setData({ canUseUpgrade: app.canUseUpgrade() })
  },

  onGoSkincare: function () {
    audio.playPageFlip()
    wx.navigateTo({ url: '/subpkg-beauty/pages/skincare/skincare' })
  },

  onGoMood: function () {
    audio.playPageFlip()
    wx.navigateTo({ url: '/subpkg-beauty/pages/mood/mood' })
  }
})
