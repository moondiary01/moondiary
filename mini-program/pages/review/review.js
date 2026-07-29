// pages/review/review.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    weekList: []
  },

  onLoad: function () {
    this.loadData()
  },

  onShow: function () {
    if (!app.canUse()) {
      wx.navigateTo({ url: '/pages/pay/pay' })
      return
    }
    this.loadData()
  },

  loadData: function () {
    var self = this
    var state = app.globalData.state

    if (!state) {
      store.loadState(app.globalData.userKey, function (data) {
        if (data) {
          app.globalData.state = data
          self.buildWeekList(data)
        }
      })
    } else {
      self.buildWeekList(state)
    }
  },

  buildWeekList: function (state) {
    var startDate = state.startDate
    if (!startDate) {
      this.setData({ weekList: [] })
      return
    }

    var weeklyReview = state.weeklyReview || []
    var startTime = new Date(startDate).getTime()
    var nowTime = new Date(store.localDateStr(new Date())).getTime()
    var dayMs = 24 * 60 * 60 * 1000
    var totalDays = Math.floor((nowTime - startTime) / dayMs) + 1
    if (totalDays < 1) totalDays = 1

    var totalWeeks = Math.ceil(totalDays / 7)
    var weekList = []

    for (var w = 1; w <= totalWeeks; w++) {
      var weekStartDay = (w - 1) * 7
      var weekEndDay = Math.min(w * 7 - 1, totalDays - 1)

      var weekStartDate = new Date(startTime + weekStartDay * dayMs)
      var weekEndDate = new Date(startTime + weekEndDay * dayMs)

      var startStr = (weekStartDate.getMonth() + 1) + '/' + weekStartDate.getDate()
      var endStr = (weekEndDate.getMonth() + 1) + '/' + weekEndDate.getDate()

      var review = ''
      // 从 weeklyReview 数组找对应周的内容
      for (var i = 0; i < weeklyReview.length; i++) {
        if (weeklyReview[i] && weeklyReview[i].week === w) {
          review = weeklyReview[i].review || ''
          break
        }
      }

      weekList.push({
        week: w,
        dateRange: startStr + ' - ' + endStr,
        review: review
      })
    }

    this.setData({ weekList: weekList })
  },

  onReviewInput: function (e) {
    var index = e.currentTarget.dataset.index
    var value = e.detail.value
    var key = 'weekList[' + index + '].review'
    var obj = {}
    obj[key] = value
    this.setData(obj)
  },

  onSave: function () {
    var state = app.globalData.state
    var weekList = this.data.weekList

    var weeklyReview = []
    for (var i = 0; i < weekList.length; i++) {
      weeklyReview.push({
        week: weekList[i].week,
        review: weekList[i].review
      })
    }

    state.weeklyReview = weeklyReview
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)

    wx.showToast({ title: '保存成功', icon: 'success' })
  }
})
