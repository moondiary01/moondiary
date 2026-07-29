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
    showEditModal: false,
    editField: '',
    editLabel: '',
    editValue: ''
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

    // 取最近30天有体重数据的天
    var recentDays = days.slice(-30)

    var morningData = []
    var eveningData = []
    var fatData = []
    var dates = []
    var hasData = false

    for (var i = 0; i < recentDays.length; i++) {
      var d = recentDays[i]
      var mw = d.morningWeight ? Number(d.morningWeight) : null
      var ew = d.eveningWeight ? Number(d.eveningWeight) : null
      var fr = d.fatRate ? Number(d.fatRate) : null

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
      hip: state.hip
    })

    // BMI
    this.calcBMI(state)

    // 画图
    if (hasData) {
      this.drawChart(morningData, eveningData, fatData, dates, unit)
    }
  },

  calcBMI: function (state) {
    var height = state.height
    var weight = null

    // 找最近有体重的记录
    var days = state.days || []
    for (var i = days.length - 1; i >= 0; i--) {
      if (days[i].morningWeight) {
        weight = Number(days[i].morningWeight)
        break
      }
    }

    if (!height || !weight) {
      this.setData({ bmiValue: '', bmiStatus: '数据不足', bmiClass: '' })
      return
    }

    // 如果单位是斤，转换为 kg
    var weightKg = state.unit === '斤' ? weight * 2 : weight
    var heightM = height / 100
    var bmi = weightKg / (heightM * heightM)
    var bmiStr = bmi.toFixed(1)

    var status = ''
    var cls = ''
    if (bmi < 18.5) { status = '偏瘦'; cls = 'bmi-thin' }
    else if (bmi < 24) { status = '正常'; cls = 'bmi-normal' }
    else if (bmi < 28) { status = '偏胖'; cls = 'bmi-over' }
    else { status = '肥胖'; cls = 'bmi-obese' }

    this.setData({ bmiValue: bmiStr, bmiStatus: status, bmiClass: cls })
  },

  drawChart: function (morningData, eveningData, fatData, dates, unit) {
    var ctx = wx.createCanvasContext('weightChart')
    var W = 320
    var H = 200
    var padLeft = 40
    var padRight = 10
    var padTop = 20
    var padBottom = 30
    var chartW = W - padLeft - padRight
    var chartH = H - padTop - padBottom

    // 收集所有非空值用于计算范围
    var allVals = []
    var hasFat = false
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

    // 体脂率范围（独立坐标）
    var fatVals = fatData.filter(function (v) { return v !== null })
    var hasFatData = fatVals.length > 0
    var fatMin = hasFatData ? Math.min.apply(null, fatVals) : 0
    var fatMax = hasFatData ? Math.max.apply(null, fatVals) : 100

    var n = morningData.length
    var stepX = n > 1 ? chartW / (n - 1) : 0

    // 画背景
    ctx.setFillStyle('#faf5f9')
    ctx.fillRect(padLeft, padTop, chartW, chartH)

    // 画横线
    ctx.setStrokeStyle('#e5e7eb')
    ctx.setLineWidth(0.5)
    for (var j = 0; j <= 4; j++) {
      var y = padTop + (chartH / 4) * j
      ctx.beginPath()
      ctx.moveTo(padLeft, y)
      ctx.lineTo(padLeft + chartW, y)
      ctx.stroke()
    }

    // Y 轴标签
    ctx.setFillStyle('#a8a29e')
    ctx.setFontSize(9)
    ctx.setTextAlign('right')
    for (var k = 0; k <= 4; k++) {
      var yv = yMax - (yRange / 4) * k
      var yl = padTop + (chartH / 4) * k
      var label = unit === '斤' ? (yv * 2).toFixed(0) : yv.toFixed(1)
      ctx.fillText(label, padLeft - 4, yl + 3)
    }

    // 画折线函数
    function drawLine(data, color, fill) {
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(2)
      ctx.beginPath()
      var started = false
      for (var i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) continue
        var x = padLeft + stepX * i
        var y = padTop + chartH - ((data[i] - yMin) / yRange) * chartH
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // 画点
      ctx.setFillStyle(color)
      for (var i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) continue
        var x = padLeft + stepX * i
        var y = padTop + chartH - ((data[i] - yMin) / yRange) * chartH
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // 晨起体重（粉色）
    drawLine(morningData, '#ec4899')

    // 晚间体重（浅色）
    drawLine(eveningData, '#f9a8d4')

    // 体脂率（黄色，独立缩放到体重坐标范围）
    if (hasFatData) {
      var fatScaled = fatData.map(function (v) {
        if (v === null) return null
        return yMin + ((v - fatMin) / (fatMax - fatMin || 1)) * yRange
      })
      drawLine(fatScaled, '#fbbf24')
    }

    // X 轴标签（日期，显示部分）
    ctx.setFillStyle('#a8a29e')
    ctx.setFontSize(8)
    ctx.setTextAlign('center')
    var labelStep = Math.ceil(n / 5)
    for (var m = 0; m < n; m += labelStep) {
      var xl = padLeft + stepX * m
      var dateStr = dates[m].substring(5) // MM-DD
      ctx.fillText(dateStr, xl, H - 10)
    }

    ctx.draw()
  },

  // ===== 三围编辑 =====
  onEditMeasure: function (e) {
    var field = e.currentTarget.dataset.field
    var labelMap = { bust: '胸围', waist: '腰围', hip: '臀围' }
    var val = this.data[field] || ''
    this.setData({
      showEditModal: true,
      editField: field,
      editLabel: labelMap[field],
      editValue: String(val)
    })
  },

  onEditValueInput: function (e) {
    this.setData({ editValue: e.detail.value })
  },

  onCloseModal: function () {
    this.setData({ showEditModal: false })
  },

  onConfirmEdit: function () {
    var self = this
    var field = this.data.editField
    var value = this.data.editValue
    var state = app.globalData.state

    if (!value) {
      wx.showToast({ title: '请输入数值', icon: 'none' })
      return
    }

    state[field] = Number(value)
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)

    var obj = { showEditModal: false }
    obj[field] = Number(value)
    this.setData(obj)

    wx.showToast({ title: '已更新', icon: 'success' })
  }
})
