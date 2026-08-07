// pages/review/review.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    weekList: [],
    userName: '',
    todayStr: ''
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
    var state = store.loadState(app.globalData.userKey)
    if (!state || !state.startDate) {
      this.setData({ weekList: [] })
      return
    }
    var unit = state.unit || '斤'
    var totalDays = this.calcTotalDays(state)
    var weeks = Math.ceil(totalDays / 7)
    var weekList = []

    for (var w = 0; w < weeks; w++) {
      var si = w * 7
      var ei = Math.min(si + 6, (state.days || []).length - 1)
      if (ei < si) continue
      var mon = state.days[si]
      var sun = state.days[ei]
      if (!mon || !sun) continue

      var mW = this.getEffectiveWeight(mon)
      var sW = this.getEffectiveWeight(sun)
      var weekDays = state.days.slice(si, ei + 1)
      var wd = weekDays.filter(function(d) { return this.getEffectiveWeight(d) !== null }.bind(this))

      // 周一/周日体重
      var mondayWeight = mW !== null ? this.fmtW(mW, unit) : '—'
      var sundayWeight = sW !== null ? this.fmtW(sW, unit) : '—'

      // 本周变化
      var weekChange = '—'
      var weekChangeColor = ''
      if (mW !== null && sW !== null) {
        var wdVal = unit === '斤' ? (sW - mW) * 2 : sW - mW
        weekChange = (wdVal > 0 ? '+' : '') + wdVal.toFixed(1) + ' ' + unit
        weekChangeColor = wdVal > 0 ? 'red' : 'mint'
      }

      // 累计变化
      var totalChange = '—'
      var totalChangeColor = ''
      if (sW !== null && state.startWeight !== null) {
        var tdVal = unit === '斤' ? (sW - state.startWeight) * 2 : sW - state.startWeight
        totalChange = (tdVal > 0 ? '+' : '') + tdVal.toFixed(1) + ' ' + unit
        totalChangeColor = tdVal > 0 ? 'red' : 'mint'
      }

      // 记录天数
      var recordDays = wd.length + '/' + (ei - si + 1)

      // 经期天数
      var periodDays = 0
      weekDays.forEach(function(d) {
        if (d.date && this.isPeriodDay(state, d.date)) periodDays++
      }.bind(this))

      // 日均饮水
      var waterSum = weekDays.reduce(function(a, d) { return a + (d.water || 0) }, 0)
      var waterAvg = wd.length ? Math.round(waterSum / (ei - si + 1) * (store.WATER_CUP_ML || 200)) : 0

      // 阶段着色
      var stage = this.getStage(w + 1, totalDays)
      var bg = stage === 1 ? '#FAF5FF' : stage === 2 ? '#D1FAE5' : '#FCE7F3'

      // 日期范围
      var dateRange = this.formatDate(mon.date) + ' - ' + this.formatDate(sun.date)

      weekList.push({
        week: w,
        weekNum: w + 1,
        dateRange: dateRange,
        mondayWeight: mondayWeight,
        sundayWeight: sundayWeight,
        weekChange: weekChange,
        weekChangeColor: weekChangeColor,
        totalChange: totalChange,
        totalChangeColor: totalChangeColor,
        recordDays: recordDays,
        periodDays: periodDays,
        waterAvg: waterAvg,
        bg: bg,
        review: (state.weeklyReview && state.weeklyReview[w]) ? state.weeklyReview[w].review || '' : ''
      })
    }

    this.setData({ weekList: weekList })
  },

  calcTotalDays: function(state) {
    if (!state.startDate) return 0
    var start = new Date(state.startDate)
    var target = state.targetDate ? new Date(state.targetDate) : null
    if (!target || target <= start) return 100
    return Math.ceil((target - start) / 86400000)
  },

  getEffectiveWeight: function(day) {
    if (!day) return null
    if (day.weightAM !== null && day.weightAM !== undefined) return day.weightAM
    if (day.weightPM !== null && day.weightPM !== undefined) return day.weightPM
    return null
  },

  fmtW: function(w, unit) {
    if (w === null || w === undefined) return '—'
    return unit === '斤' ? (w * 2).toFixed(1) : w.toFixed(1)
  },

  formatDate: function(dateStr) {
    if (!dateStr) return '—'
    var d = new Date(dateStr)
    return (d.getMonth() + 1) + '/' + d.getDate()
  },

  isPeriodDay: function(state, dateStr) {
    if (!state.periods || !state.periods.length) return false
    for (var i = 0; i < state.periods.length; i++) {
      var p = state.periods[i]
      var start = new Date(p.start)
      var end = p.end ? new Date(p.end) : new Date(p.start)
      var d = new Date(dateStr)
      d.setHours(0, 0, 0, 0)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      if (d >= start && d <= end) return true
    }
    return false
  },

  getStage: function(week, totalDays) {
    var tw = Math.ceil(totalDays / 7)
    if (tw <= 3) return week <= 1 ? 1 : (week <= 2 ? 2 : 3)
    if (week <= Math.ceil(tw * 0.25)) return 1
    if (week <= Math.ceil(tw * 0.75)) return 2
    return 3
  },

  onReviewInput: function(e) {
    var weekIdx = parseInt(e.currentTarget.dataset.week)
    var value = e.detail.value
    var list = this.data.weekList
    if (list[weekIdx]) list[weekIdx].review = value
    this.setData({ weekList: list })
    // 自动保存
    this.autoSaveReview(weekIdx, value)
  },

  saveReview: function(e) {
    var weekIdx = parseInt(e.currentTarget.dataset.week)
    var value = this.data.weekList[weekIdx].review
    this.autoSaveReview(weekIdx, value)
    wx.showToast({ title: '已保存', icon: 'success', duration: 1000 })
  },

  autoSaveReview: function(weekIdx, value) {
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(function() {
      var state = store.loadState(app.globalData.userKey)
      if (!state) return
      if (!state.weeklyReview) state.weeklyReview = []
      if (!state.weeklyReview[weekIdx]) state.weeklyReview[weekIdx] = { week: weekIdx + 1, review: '' }
      state.weeklyReview[weekIdx].review = value
      store.saveState(app.globalData.userKey, state)
    }.bind(this), 400)
  },

  exportReviewImage: function () {
    var self = this
    var list = this.data.weekList
    if (!list.length) {
      wx.showToast({ title: '暂无复盘数据', icon: 'none' })
      return
    }

    // 使用当前周或第一周
    var curWeekIdx = 0
    var state = store.loadState(app.globalData.userKey)
    if (state && state.startDate) {
      var start = new Date(state.startDate)
      var today = new Date()
      today.setHours(0, 0, 0, 0)
      curWeekIdx = Math.min(list.length - 1, Math.max(0, Math.floor((today - start) / 86400000 / 7)))
    }
    var weekData = list[curWeekIdx]

    var cw = 760, ch = 720
    var dpr = 2
    var ctx = wx.createCanvasContext('reviewExportCanvas', this)

    if (!ctx) {
      wx.showToast({ title: '当前环境不支持导出', icon: 'none' })
      return
    }

    ctx.scale(dpr, dpr)

    // 渐变背景
    var g = ctx.createLinearGradient(0, 0, cw, 0)
    g.addColorStop(0, '#7C3AED')
    g.addColorStop(0.4, '#C026D3')
    g.addColorStop(0.8, '#EC4899')
    g.addColorStop(1, '#FECDD3')
    ctx.setFillStyle(g)
    ctx.fillRect(0, 0, cw, ch)

    // 标题
    ctx.setFillStyle('#fff')
    ctx.setFontSize(30)
    ctx.setTextAlign('left')
    ctx.fillText((state && state.name ? state.name : 'MoonMemo') + '的月亮日记', 30, 50)
    ctx.setFontSize(15)
    ctx.setGlobalAlpha(0.85)
    ctx.fillText('第' + weekData.weekNum + '周复盘报表 · ' + weekData.dateRange, 30, 76)
    ctx.setGlobalAlpha(1)

    // 白色内容区
    ctx.setFillStyle('#fff')
    ctx.fillRect(20, 100, cw - 40, ch - 130)
    ctx.setFillStyle('#1C1917')
    var y = 140
    ctx.setFontSize(18)
    ctx.fillText('本周数据总览', 40, y)
    y += 28
    ctx.setFontSize(14)
    ctx.setFillStyle('#57534E')

    var rows = [
      ['周一体重', weekData.mondayWeight],
      ['周日体重', weekData.sundayWeight],
      ['本周变化', weekData.weekChange],
      ['累计变化', weekData.totalChange],
      ['记录天数', weekData.recordDays],
      ['日均饮水', weekData.waterAvg + 'ml']
    ]
    rows.forEach(function(r) {
      ctx.setFillStyle('#A8A29E')
      ctx.fillText(r[0], 50, y)
      ctx.setFillStyle('#1C1917')
      ctx.fillText(r[1], 200, y)
      y += 24
    })

    y += 10
    ctx.setFillStyle('#1C1917')
    ctx.setFontSize(16)
    ctx.fillText('本周感想', 40, y)
    y += 18
    ctx.setFillStyle('#57534E')
    ctx.setFontSize(13)
    var review = weekData.review || '（未填写）'
    ctx.fillText(review, 50, y)

    ctx.setFillStyle('#A8A29E')
    ctx.setFontSize(11)
    ctx.fillText('MoonMemo 月亮日记 · ' + new Date().toLocaleDateString('zh-CN'), 40, ch - 25)

    ctx.draw(false, function() {
      wx.canvasToTempFilePath({
        canvasId: 'reviewExportCanvas',
        destWidth: cw * dpr,
        destHeight: ch * dpr,
        success: function(res) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: function() {
              wx.showToast({ title: '图片已保存到相册', icon: 'success' })
            },
            fail: function() {
              wx.showToast({ title: '保存失败，请授权相册权限', icon: 'none' })
            }
          })
        },
        fail: function() {
          wx.showToast({ title: '导出失败', icon: 'none' })
        }
      })
    })
  }
})
