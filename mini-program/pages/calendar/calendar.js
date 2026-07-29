// pages/calendar/calendar.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    calYear: 0,
    calMonth: 0,
    calDays: [],
    isFemale: true,
    unitLabel: '斤',
    showDetail: false,
    detailDate: '',
    detailData: {},
    isPeriodDay: false,
    isExerciseDay: false,
    selectedDate: ''
  },

  onLoad: function () {
    var now = new Date()
    this.setData({
      calYear: now.getFullYear(),
      calMonth: now.getMonth()
    })
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
          self.renderCalendar(data)
        }
      })
    } else {
      self.renderCalendar(state)
    }
  },

  // ===== 月份导航 =====
  onPrevMonth: function () {
    var y = this.data.calYear
    var m = this.data.calMonth - 1
    if (m < 0) { m = 11; y-- }
    this.setData({ calYear: y, calMonth: m })
    this.renderCalendar(app.globalData.state)
  },

  onNextMonth: function () {
    var y = this.data.calYear
    var m = this.data.calMonth + 1
    if (m > 11) { m = 0; y++ }
    this.setData({ calYear: y, calMonth: m })
    this.renderCalendar(app.globalData.state)
  },

  // 检查某日期是否在经期区间内
  isDateInPeriods: function (dateStr, periods) {
    for (var i = 0; i < periods.length; i++) {
      var p = periods[i]
      if (dateStr >= p.start && dateStr <= p.end) {
        return true
      }
    }
    return false
  },

  // 从经期区间数组构建日期集合（用于预测）
  buildPeriodDateSet: function (periods) {
    var set = {}
    for (var i = 0; i < periods.length; i++) {
      var p = periods[i]
      var start = new Date(p.start)
      var end = new Date(p.end)
      var cur = new Date(start)
      while (cur <= end) {
        var ds = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0')
        set[ds] = true
        cur.setDate(cur.getDate() + 1)
      }
    }
    return set
  },

  // ===== 生成日历数据 =====
  renderCalendar: function (state) {
    if (!state) return

    var year = this.data.calYear
    var month = this.data.calMonth
    var isFemale = state.gender === '女'
    var unitLabel = state.unit || '斤'

    var days = state.days || []
    var periods = state.periods || []

    // 构建日期数据索引
    var dayMap = {}
    for (var i = 0; i < days.length; i++) {
      dayMap[days[i].date] = days[i]
    }

    // 经期日期集合（从对象数组展开）
    var periodSet = this.buildPeriodDateSet(periods)

    // 经期开始日期集合（用于预测）
    var periodStartDates = []
    for (var j = 0; j < periods.length; j++) {
      periodStartDates.push(periods[j].start)
    }
    periodStartDates.sort()

    // 经期预测：根据历史经期周期预测下个月
    var predictSet = this.predictPeriods(periodStartDates, year, month)

    // 排卵日预测：经期开始后第14天
    var ovulationSet = this.predictOvulation(periodStartDates)

    // 当月天数
    var firstDay = new Date(year, month, 1)
    var firstWeekday = firstDay.getDay()
    var daysInMonth = new Date(year, month + 1, 0).getDate()

    var todayStr = store.localDateStr(new Date())

    var calDays = []

    // 空白填充
    for (var w = 0; w < firstWeekday; w++) {
      calDays.push({ key: 'e' + w, empty: true })
    }

    // 生成每日数据
    var prevWeight = null
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      var dayData = dayMap[dateStr] || {}
      var isToday = dateStr === todayStr
      var isPeriod = !!periodSet[dateStr]
      var isPredict = !!predictSet[dateStr]
      var isOvulation = !!ovulationSet[dateStr]
      var hasExercise = !!(dayData.exercise && dayData.exercise !== '无运动')

      // 体重波动
      var weightChange = ''
      var weightUp = false
      var currentWeight = dayData.weightAM ? Number(dayData.weightAM) : null
      if (currentWeight !== null && prevWeight !== null) {
        var diff = currentWeight - prevWeight
        if (Math.abs(diff) > 0.01) {
          var displayDiff = unitLabel === '斤' ? (Math.abs(diff) * 2).toFixed(1) : Math.abs(diff).toFixed(1)
          weightChange = displayDiff
          weightUp = diff > 0
        }
      }
      if (currentWeight !== null) {
        prevWeight = currentWeight
      }

      calDays.push({
        key: 'd' + d,
        empty: false,
        day: d,
        dateStr: dateStr,
        today: isToday,
        period: isPeriod,
        periodPredict: isPredict && !isPeriod,
        ovulation: isOvulation,
        exercise: hasExercise,
        hasPhoto: !!(dayData.photos && dayData.photos.length > 0),
        weightChange: weightChange,
        weightUp: weightUp
      })
    }

    this.setData({
      calDays: calDays,
      isFemale: isFemale,
      unitLabel: unitLabel
    })
  },

  // 预测经期（使用经期开始日期数组）
  predictPeriods: function (periodStartDates, year, month) {
    var predictSet = {}
    if (periodStartDates.length < 2) return predictSet

    // 计算平均周期
    var gaps = []
    for (var i = 1; i < periodStartDates.length; i++) {
      var gap = (new Date(periodStartDates[i]) - new Date(periodStartDates[i - 1])) / (24 * 60 * 60 * 1000)
      gaps.push(gap)
    }
    var avgCycle = Math.round(gaps.reduce(function (a, b) { return a + b }, 0) / gaps.length)
    if (avgCycle < 21 || avgCycle > 35) avgCycle = 28

    // 最后一次经期开始日
    var lastPeriod = periodStartDates[periodStartDates.length - 1]
    var lastDate = new Date(lastPeriod)

    // 预测未来经期
    var nextPeriod = new Date(lastDate.getTime() + avgCycle * 24 * 60 * 60 * 1000)
    while (nextPeriod.getFullYear() < year || (nextPeriod.getFullYear() === year && nextPeriod.getMonth() < month)) {
      nextPeriod = new Date(nextPeriod.getTime() + avgCycle * 24 * 60 * 60 * 1000)
    }

    // 如果预测日在当前月或下月
    if (nextPeriod.getFullYear() === year && nextPeriod.getMonth() === month) {
      for (var p = 0; p < 5; p++) {
        var pd = new Date(nextPeriod.getTime() + p * 24 * 60 * 60 * 1000)
        if (pd.getMonth() === month && pd.getFullYear() === year) {
          var ds = pd.getFullYear() + '-' + String(pd.getMonth() + 1).padStart(2, '0') + '-' + String(pd.getDate()).padStart(2, '0')
          predictSet[ds] = true
        }
      }
    }

    return predictSet
  },

  // 预测排卵日（使用经期开始日期数组）
  predictOvulation: function (periodStartDates) {
    var ovulationSet = {}
    for (var i = 0; i < periodStartDates.length; i++) {
      var periodStart = new Date(periodStartDates[i])
      var ovulationDate = new Date(periodStart.getTime() + 14 * 24 * 60 * 60 * 1000)
      var ds = ovulationDate.getFullYear() + '-' + String(ovulationDate.getMonth() + 1).padStart(2, '0') + '-' + String(ovulationDate.getDate()).padStart(2, '0')
      ovulationSet[ds] = true
    }
    return ovulationSet
  },

  // ===== 点击日期 =====
  onCalDayClick: function (e) {
    var dateStr = e.currentTarget.dataset.date
    var state = app.globalData.state
    var days = state.days || []
    var dayData = null
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === dateStr) {
        dayData = days[i]
        break
      }
    }
    if (!dayData) {
      dayData = { date: dateStr, weightAM: null, weightPM: null, fat: null, bm: '', diet: '', exercise: '', period: false, periodNote: '', note: '' }
    }

    var periods = state.periods || []
    var isPeriodDay = this.isDateInPeriods(dateStr, periods)
    var isExerciseDay = !!(dayData.exercise && dayData.exercise !== '无运动')

    this.setData({
      showDetail: true,
      detailDate: dateStr,
      detailData: dayData,
      isPeriodDay: isPeriodDay,
      isExerciseDay: isExerciseDay,
      selectedDate: dateStr
    })
  },

  onCloseDetail: function () {
    this.setData({ showDetail: false })
  },

  // ===== 经期标记/取消 =====
  onTogglePeriod: function () {
    var dateStr = this.data.selectedDate
    var state = app.globalData.state
    var periods = state.periods || []

    // 查找包含当前日期的经期区间
    var foundIdx = -1
    for (var i = 0; i < periods.length; i++) {
      if (dateStr >= periods[i].start && dateStr <= periods[i].end) {
        foundIdx = i
        break
      }
    }

    if (foundIdx !== -1) {
      // 取消经期标记：移除该区间
      periods.splice(foundIdx, 1)
      this.setData({ isPeriodDay: false })
    } else {
      // 标记经期：添加单日区间
      periods.push({ start: dateStr, end: dateStr })
      periods.sort(function (a, b) {
        return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
      })
      this.setData({ isPeriodDay: true })
    }

    state.periods = periods
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)
    this.renderCalendar(state)

    wx.showToast({ title: '已更新', icon: 'success' })
  },

  // ===== 运动打卡/取消 =====
  onToggleExercise: function () {
    var dateStr = this.data.selectedDate
    var state = app.globalData.state
    var days = state.days || []
    var dayData = null
    var dayIndex = -1
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === dateStr) {
        dayData = days[i]
        dayIndex = i
        break
      }
    }
    if (!dayData) {
      dayData = { date: dateStr, weightAM: null, weightPM: null, fat: null, bm: '', diet: '', exercise: '', period: false, periodNote: '', note: '' }
      days.push(dayData)
      dayIndex = days.length - 1
    }

    if (dayData.exercise && dayData.exercise !== '无运动') {
      dayData.exercise = ''
      this.setData({ isExerciseDay: false })
    } else {
      dayData.exercise = '有运动'
      this.setData({ isExerciseDay: true })
    }

    days[dayIndex] = dayData
    state.days = days
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)
    this.renderCalendar(state)

    wx.showToast({ title: '已更新', icon: 'success' })
  }
})
