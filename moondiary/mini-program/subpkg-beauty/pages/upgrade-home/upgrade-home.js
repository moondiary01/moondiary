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

  // upgrade-lock 组件开通成功后刷新
  onUpgraded: function () {
    this.setData({ canUseUpgrade: true })
  },

  // upgrade-lock 关闭事件（返回上一页）
  onLockClose: function () {
    wx.navigateBack()
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
