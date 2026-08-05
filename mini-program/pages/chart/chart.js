// pages/chart/chart.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    hasData: false,
    bmiValue: '',
    bmiStatus: '',
    bmiClass: '',
    bust: null,
    waist: null,
    hip: null,
    hasMeasure: false,
    showEditModal: false,
    editBust: '',
    editWaist: '',
    editHip: '',
    statStartWeight: '',
    statTargetWeight: '',
    statLatestWeight: '',
    statLostWeight: '',
    statStartFat: '',
    statLatestFat: '',
    statFatDiff: '',
    statRecordDays: 0
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
          self.renderChart(data)
        }
      })
    } else {
      self.renderChart(state)
    }
  },

  renderChart: function (state) {
    var days = state.days || []
    var unit = state.unit || '斤'

    var recentDays = days.slice(-30)
    var morningData = [], eveningData = [], fatData = [], dates = []
    var hasData = false

    for (var i = 0; i < recentDays.length; i++) {
      var d = recentDays[i]
      var mw = d.weightAM ? Number(d.weightAM) : null
      var ew = d.weightPM ? Number(d.weightPM) : null
      var fr = d.fat ? Number(d.fat) : null
      if (mw || ew || fr) hasData = true
      morningData.push(mw)
      eveningData.push(ew)
      fatData.push(fr)
      dates.push(d.date)
    }

    // 三围
    this.setData({
      hasData: hasData,
      bust: state.bust,
      waist: state.waist,
      hip: state.hip,
      hasMeasure: !!(state.bust || state.waist || state.hip)
    })

    // BMI
    this.calcBMI(state)

    // 画趋势图
    if (hasData) {
      this.drawWeightChart(morningData, eveningData, fatData, dates, unit, state)
      this.drawWeekBar(days, unit)
    }

    // 数据统计 — 对齐 HTML 版 10 项
    this.calcStats(state, days)
  },

  calcBMI: function (state) {
    var height = state.height
    var weight = null
    var days = state.days || []
    for (var i = days.length - 1; i >= 0; i--) {
      if (days[i].weightAM) { weight = Number(days[i].weightAM); break }
    }
    if (!height || !weight) {
      this.setData({ bmiValue: '', bmiStatus: '数据不足', bmiClass: '' })
      return
    }
    var weightKg = weight
    var heightM = height / 100
    var bmi = weightKg / (heightM * heightM)
    var bmiStr = bmi.toFixed(1)
    var status = '', cls = ''
    if (bmi < 18.5) { status = '偏瘦'; cls = 'bmi-thin' }
    else if (bmi < 24) { status = '标准'; cls = 'bmi-normal' }
    else if (bmi < 28) { status = '偏胖'; cls = 'bmi-over' }
    else { status = '肥胖'; cls = 'bmi-obese' }
    this.setData({ bmiValue: bmiStr, bmiStatus: status, bmiClass: cls })
  },

  calcStats: function (state, days) {
    var unit = state.unit || '斤'
    var toDisplay = function (v) {
      if (v === null || v === undefined) return '—'
      var n = Number(v)
      return unit === '斤' ? (n * 2).toFixed(1) : n.toFixed(1)
    }

    // 起始/目标/最新体重
    var startW = state.startWeight ? toDisplay(state.startWeight) : '—'
    var targetW = state.targetWeight ? toDisplay(state.targetWeight) : '—'
    var latestW = '—'
    for (var j = days.length - 1; j >= 0; j--) {
      if (days[j].weightAM) { latestW = toDisplay(days[j].weightAM); break }
    }

    // 已减重
    var lostW = '—'
    if (state.startWeight) {
      var lw = null
      for (var k = days.length - 1; k >= 0; k--) {
        if (days[k].weightAM) { lw = Number(days[k].weightAM); break }
      }
      if (lw !== null) {
        var diff = Number(state.startWeight) - lw
        lostW = (unit === '斤' ? (diff * 2).toFixed(1) : diff.toFixed(1))
      }
    }

    // 体脂统计
    var startFatStr = state.startFat !== null && state.startFat !== undefined ? state.startFat + '%' : '—'
    var latestFat = null
    for (var m = days.length - 1; m >= 0; m--) {
      if (days[m].fat) { latestFat = Number(days[m].fat); break }
    }
    var latestFatStr = latestFat !== null ? latestFat + '%' : '—'
    var fatDiffStr = '—'
    if (state.startFat !== null && state.startFat !== undefined && latestFat !== null) {
      var fd = latestFat - Number(state.startFat)
      fatDiffStr = (fd > 0 ? '+' : '') + fd.toFixed(1) + '%'
    }

    // 记录天数
    var recordDays = 0
    for (var n = 0; n < days.length; n++) {
      if (days[n].weightAM || days[n].weightPM) recordDays++
    }

    this.setData({
      statStartWeight: startW,
      statTargetWeight: targetW,
      statLatestWeight: latestW,
      statLostWeight: lostW,
      statStartFat: startFatStr,
      statLatestFat: latestFatStr,
      statFatDiff: fatDiffStr,
      statRecordDays: recordDays
    })
  },

  drawWeightChart: function (morningData, eveningData, fatData, dates, unit, state) {
    var ctx = wx.createCanvasContext('weightChart')
    var W = 320, H = 210
    var padLeft = 44, padRight = 12, padTop = 20, padBottom = 32
    var chartW = W - padLeft - padRight
    var chartH = H - padTop - padBottom

    var allVals = []
    for (var i = 0; i < morningData.length; i++) {
      if (morningData[i]) allVals.push(morningData[i])
      if (eveningData[i]) allVals.push(eveningData[i])
    }
    if (allVals.length === 0) return
    var minVal = Math.min.apply(null, allVals)
    var maxVal = Math.max.apply(null, allVals)
    var range = maxVal - minVal || 1
    var yMin = minVal - range * 0.2
    var yMax = maxVal + range * 0.2
    var yRange = yMax - yMin
    var n = morningData.length
    var stepX = n > 1 ? chartW / (n - 1) : 0

    // 背景
    ctx.setFillStyle('#FAF5FF')
    ctx.fillRect(padLeft, padTop, chartW, chartH)

    // 经期区间背景
    var periods = state.periods || []
    for (var pi = 0; pi < periods.length; pi++) {
      var pStart = periods[pi].start
      var pEnd = periods[pi].end || pStart
      for (var dj = 0; dj < dates.length; dj++) {
        if (dates[dj] >= pStart && dates[dj] <= pEnd) {
          var px = padLeft + stepX * dj
          ctx.setFillStyle('rgba(236,72,153,0.08)')
          ctx.fillRect(px - stepX/2, padTop, stepX, chartH)
        }
      }
    }

    // 网格线
    ctx.setStrokeStyle('#ECE6F5')
    ctx.setLineWidth(0.5)
    for (var j = 0; j <= 4; j++) {
      var y = padTop + (chartH / 4) * j
      ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + chartW, y); ctx.stroke()
    }

    // Y轴标签
    ctx.setFillStyle('#918CA8')
    ctx.setFontSize(9)
    ctx.setTextAlign('right')
    for (var k = 0; k <= 4; k++) {
      var yv = yMax - (yRange / 4) * k
      var yl = padTop + (chartH / 4) * k
      var label = unit === '斤' ? (yv * 2).toFixed(0) : yv.toFixed(1)
      ctx.fillText(label, padLeft - 4, yl + 3)
    }

    // 画线函数
    function drawLine(data, color, dotR) {
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(2)
      ctx.beginPath()
      var started = false
      for (var i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) continue
        var x = padLeft + stepX * i
        var y = padTop + chartH - ((data[i] - yMin) / yRange) * chartH
        if (!started) { ctx.moveTo(x, y); started = true }
        else { ctx.lineTo(x, y) }
      }
      ctx.stroke()
      ctx.setFillStyle(color)
      for (var i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) continue
        var x = padLeft + stepX * i
        var y = padTop + chartH - ((data[i] - yMin) / yRange) * chartH
        ctx.beginPath(); ctx.arc(x, y, dotR || 2.5, 0, 2 * Math.PI); ctx.fill()
      }
    }

    drawLine(morningData, '#C026D3', 2.5)  // 晨起体重
    drawLine(eveningData, '#ec4899', 2)    // 晚间体重

    // 体脂率独立缩放
    var fatVals = fatData.filter(function (v) { return v !== null })
    if (fatVals.length > 0) {
      var fatMin = Math.min.apply(null, fatVals), fatMax = Math.max.apply(null, fatVals)
      var fatScaled = fatData.map(function (v) {
        if (v === null) return null
        return yMin + ((v - fatMin) / (fatMax - fatMin || 1)) * yRange
      })
      drawLine(fatScaled, '#F59E0B', 2)
    }

    // 经期点标记
    for (var di = 0; di < dates.length; di++) {
      for (var pj = 0; pj < periods.length; pj++) {
        if (dates[di] >= periods[pj].start && dates[di] <= (periods[pj].end || periods[pj].start)) {
          var mx = padLeft + stepX * di
          ctx.setFillStyle('#D4A574')
          ctx.setFontSize(10)
          ctx.setTextAlign('center')
          ctx.fillText('·', mx, padTop - 4)
        }
      }
    }

    // X轴标签
    ctx.setFillStyle('#918CA8')
    ctx.setFontSize(8)
    ctx.setTextAlign('center')
    var labelStep = Math.ceil(n / 5)
    for (var m = 0; m < n; m += labelStep) {
      var xl = padLeft + stepX * m
      ctx.fillText(dates[m].substring(5), xl, H - 10)
    }

    ctx.draw()
  },

  drawWeekBar: function (days, unit) {
    // 按周分组计算净变化
    var weeks = []
    var currentWeek = null
    for (var i = 0; i < days.length; i++) {
      var d = days[i]
      var weekStart = d.date // 简化：用日期本身
      if (d.weightAM) {
        if (!currentWeek || d.date > currentWeek.end) {
          if (currentWeek) weeks.push(currentWeek)
          currentWeek = { start: d.date, end: d.date, firstW: Number(d.weightAM), lastW: Number(d.weightAM) }
        } else {
          currentWeek.end = d.date
          currentWeek.lastW = Number(d.weightAM)
        }
      }
    }
    if (currentWeek) weeks.push(currentWeek)
    weeks = weeks.slice(-12) // 最近12周

    if (weeks.length === 0) return

    var ctx = wx.createCanvasContext('chartWeekBar')
    var W = 320, H = 120
    var padLeft = 40, padRight = 10, padTop = 16, padBottom = 24
    var chartW = W - padLeft - padRight
    var chartH = H - padTop - padBottom

    var diffs = weeks.map(function (w) { return w.lastW - w.firstW })
    var absMax = Math.max.apply(null, diffs.map(Math.abs)) || 1
    var barW = Math.min(16, chartW / weeks.length - 4)

    ctx.setStrokeStyle('#ECE6F5')
    ctx.setLineWidth(0.5)
    var zeroY = padTop + chartH / 2
    ctx.beginPath(); ctx.moveTo(padLeft, zeroY); ctx.lineTo(padLeft + chartW, zeroY); ctx.stroke()

    for (var j = 0; j < weeks.length; j++) {
      var x = padLeft + (chartW / weeks.length) * j + (chartW / weeks.length - barW) / 2
      var h = (Math.abs(diffs[j]) / absMax) * (chartH / 2 - 4)
      if (h < 2) h = 2
      if (diffs[j] >= 0) {
        ctx.setFillStyle('#10B981')
        ctx.fillRect(x, zeroY - h, barW, h)
      } else {
        ctx.setFillStyle('#EF4444')
        ctx.fillRect(x, zeroY, barW, h)
      }
    }

    ctx.draw()
  },

  // ===== 三围编辑 =====
  onEditMeasure: function () {
    var state = app.globalData.state || {}
    this.setData({
      showEditModal: true,
      editBust: state.bust ? String(state.bust) : '',
      editWaist: state.waist ? String(state.waist) : '',
      editHip: state.hip ? String(state.hip) : ''
    })
  },

  onEditInput: function (e) {
    var field = e.currentTarget.dataset.field
    var obj = {}
    obj[field] = e.detail.value
    this.setData(obj)
  },

  onCloseModal: function () {
    this.setData({ showEditModal: false })
  },

  onConfirmEdit: function () {
    var self = this
    var state = app.globalData.state
    var bust = this.data.editBust ? Number(this.data.editBust) : null
    var waist = this.data.editWaist ? Number(this.data.editWaist) : null
    var hip = this.data.editHip ? Number(this.data.editHip) : null

    state.bust = bust
    state.waist = waist
    state.hip = hip
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)

    this.setData({
      showEditModal: false,
      bust: bust,
      waist: waist,
      hip: hip,
      hasMeasure: !!(bust || waist || hip)
    })
    wx.showToast({ title: '已更新', icon: 'success' })
  }
})
