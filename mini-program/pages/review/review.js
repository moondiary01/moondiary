// pages/review/review.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    weekList: [],
    userName: '',
    todayStr: '',
    showExportModal: false,
    exportWeeks: []
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

    var days = state.days || []
    var weeklyReview = state.weeklyReview || []
    var periods = state.periods || []
    var startTime = new Date(startDate).getTime()
    var nowTime = new Date(store.localDateStr(new Date())).getTime()
    var dayMs = 24 * 60 * 60 * 1000
    var totalDays = Math.floor((nowTime - startTime) / dayMs) + 1
    if (totalDays < 1) totalDays = 1

    var totalWeeks = Math.ceil(totalDays / 7)
    var weekList = []
    var unit = state.unit || '斤'
    var toDisplay = function (v) {
      if (v === null || v === undefined) return '—'
      return unit === '斤' ? (Number(v) * 2).toFixed(1) : Number(v).toFixed(1)
    }

    // 累计起始体重（用于计算累计变化）
    var startWeight = state.startWeight ? Number(state.startWeight) : null

    for (var w = 1; w <= totalWeeks; w++) {
      var weekStartDay = (w - 1) * 7
      var weekEndDay = Math.min(w * 7 - 1, totalDays - 1)
      var weekStartDate = new Date(startTime + weekStartDay * dayMs)
      var weekEndDate = new Date(startTime + weekEndDay * dayMs)

      var startStr = (weekStartDate.getMonth() + 1) + '/' + weekStartDate.getDate()
      var endStr = (weekEndDate.getMonth() + 1) + '/' + weekEndDate.getDate()

      // 统计本周数据
      var monWeight = null, sunWeight = null
      var recordDays = 0, periodDays = 0, totalWater = 0, waterCount = 0

      for (var d = weekStartDay; d <= weekEndDay; d++) {
        var dayData = days[d]
        if (!dayData) continue

        // 周一晨重（本周第一条有weightAM的记录）
        if (dayData.weightAM && monWeight === null) {
          monWeight = Number(dayData.weightAM)
        }
        // 周日晨重（最后一条）
        if (dayData.weightAM) {
          sunWeight = Number(dayData.weightAM)
        }

        if (dayData.weightAM || dayData.weightPM) recordDays++

        // 经期天数
        for (var p = 0; p < periods.length; p++) {
          var pStart = periods[p].start
          var pEnd = periods[p].end || pStart
          if (dayData.date >= pStart && dayData.date <= pEnd) {
            periodDays++
            break
          }
        }

        // 饮水统计
        if (dayData.waterCups && dayData.waterCups.length > 0) {
          totalWater += dayData.waterCups.length * 200
          waterCount += dayData.waterCups.length
        }
      }

      var avgWater = waterCount > 0 ? Math.round(totalWater / waterCount * (waterCount / recordDays || 1)) : 0
      var weekDiff = (monWeight !== null && sunWeight !== null) ? (sunWeight - monWeight) : null
      var cumDiff = (startWeight !== null && sunWeight !== null) ? (sunWeight - startWeight) : null

      // 阶段标签
      var stageLabel = ''
      var stageClass = ''
      if (w <= 4) { stageLabel = '适应期'; stageClass = 'stage-s1' }
      else if (w <= 8) { stageLabel = '加速期'; stageClass = 'stage-s2' }
      else { stageLabel = '巩固期'; stageClass = 'stage-s3' }

      var review = ''
      for (var i = 0; i < weeklyReview.length; i++) {
        if (weeklyReview[i] && weeklyReview[i].week === w) {
          review = weeklyReview[i].review || ''
          break
        }
      }

      var hasStats = monWeight !== null || sunWeight !== null || recordDays > 0

      weekList.push({
        week: w,
        dateRange: startStr + ' - ' + endStr,
        review: review,
        stageLabel: stageLabel,
        stageClass: stageClass,
        hasStats: hasStats,
        monWeight: monWeight !== null ? toDisplay(monWeight) : '—',
        sunWeight: sunWeight !== null ? toDisplay(sunWeight) : '—',
        weekDiff: weekDiff !== null ? (weekDiff >= 0 ? '+' : '') + toDisplay(Math.abs(weekDiff)) : '—',
        weekDiffClass: weekDiff !== null && weekDiff < 0 ? 'good' : 'bad',
        cumDiff: cumDiff !== null ? (cumDiff >= 0 ? '+' : '') + toDisplay(Math.abs(cumDiff)) : '—',
        cumDiffClass: cumDiff !== null && cumDiff < 0 ? 'good' : 'bad',
        recordDays: recordDays,
        periodDays: periodDays,
        avgWater: avgWater
      })
    }

    var userName = state.name || ''
    var now = new Date()
    var todayStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate()

    this.setData({ weekList: weekList, userName: userName, todayStr: todayStr })
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
      weeklyReview.push({ week: weekList[i].week, review: weekList[i].review })
    }
    state.weeklyReview = weeklyReview
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  // 导出
  onExport: function () {
    var weeks = this.data.weekList.filter(function (w) { return w.review })
    if (weeks.length === 0) {
      wx.showToast({ title: '暂无复盘内容可导出', icon: 'none' })
      return
    }
    this.setData({ showExportModal: true, exportWeeks: weeks })
  },

  onCloseExport: function () {
    this.setData({ showExportModal: false })
  },

  onCopyExport: function () {
    var weeks = this.data.exportWeeks
    var text = 'Moon Memo 周度复盘\n' + this.data.userName + ' · ' + this.data.todayStr + '\n---\n'
    for (var i = 0; i < weeks.length; i++) {
      text += '第' + weeks[i].week + '周 (' + weeks[i].dateRange + ')\n'
      text += (weeks[i].review || '暂无') + '\n\n'
    }
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  }
})
