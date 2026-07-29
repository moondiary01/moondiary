// pages/index/index.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')

Page({
  data: {
    userName: '',
    todayStr: '',
    todayWeightDisplay: '--',
    unitLabel: '斤',
    isFemale: false,
    dayData: {},
    waterMl: 0,
    dietOptions: ['液断', '轻断食', '少餐', '正餐', '放纵'],
    exerciseOptions: ['有运动', '无运动', '有氧运动', '力量训练', '瑜伽拉伸', '散步']
  },

  onLoad: function () {
    this.loadUserData()
  },

  onShow: function () {
    // 检查试用是否过期
    if (!app.canUse()) {
      wx.navigateTo({
        url: '/pages/pay/pay'
      })
      return
    }
    this.loadUserData()
  },

  loadUserData: function () {
    var self = this
    var today = store.localDateStr(new Date())
    var state = app.globalData.state

    if (!state) {
      store.loadState(app.globalData.userKey, function (data) {
        if (data) {
          app.globalData.state = data
          self.initPage(data, today)
        } else {
          self.initPage(null, today)
        }
      })
    } else {
      self.initPage(state, today)
    }
  },

  initPage: function (state, today) {
    if (!state) {
      state = {
        name: '',
        gender: '',
        unit: '斤',
        days: [],
        waterGoal: 2000
      }
    }

    var days = state.days || []
    var todayData = null
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === today) {
        todayData = days[i]
        break
      }
    }
    if (!todayData) {
      todayData = {
        date: today,
        morningWeight: null,
        eveningWeight: null,
        fatRate: null,
        diet: '',
        exercise: '',
        waterCups: 0,
        periodNote: '',
        diary: ''
      }
    }

    var isFemale = state.gender === '女'
    var unitLabel = state.unit || '斤'
    var weightVal = todayData.morningWeight || todayData.eveningWeight
    var weightDisplay = '--'
    if (weightVal) {
      weightDisplay = unitLabel === '斤' ? (weightVal * 2).toFixed(1) : Number(weightVal).toFixed(1)
    }

    var waterMl = (todayData.waterCups || 0) * 250

    // 格式化日期显示
    var d = new Date()
    var weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    var todayStr = d.getMonth() + 1 + '月' + d.getDate() + '日 周' + weekDay

    this.setData({
      userName: state.name || '',
      todayStr: todayStr,
      todayWeightDisplay: weightDisplay,
      unitLabel: unitLabel,
      isFemale: isFemale,
      dayData: todayData,
      waterMl: waterMl
    })

    // 保存到当前页面的 state 引用
    this.currentState = state
    this.currentToday = today
  },

  // ===== 输入处理 =====
  onMorningWeightInput: function (e) {
    this.updateDayData('morningWeight', e.detail.value)
    this.updateWeightDisplay()
  },
  onEveningWeightInput: function (e) {
    this.updateDayData('eveningWeight', e.detail.value)
    this.updateWeightDisplay()
  },
  onFatRateInput: function (e) {
    this.updateDayData('fatRate', e.detail.value)
  },
  onDietSelect: function (e) {
    var val = e.currentTarget.dataset.value
    var current = this.data.dayData.diet === val ? '' : val
    this.updateDayData('diet', current)
  },
  onExerciseSelect: function (e) {
    var val = e.currentTarget.dataset.value
    var current = this.data.dayData.exercise === val ? '' : val
    this.updateDayData('exercise', current)
  },
  onWaterAdd: function () {
    var cups = (this.data.dayData.waterCups || 0) + 1
    this.updateDayData('waterCups', cups)
    this.setData({ waterMl: cups * 250 })
  },
  onPeriodNoteInput: function (e) {
    this.updateDayData('periodNote', e.detail.value)
  },
  onDiaryInput: function (e) {
    this.updateDayData('diary', e.detail.value)
  },

  updateDayData: function (field, value) {
    var key = 'dayData.' + field
    var obj = {}
    obj[key] = value
    this.setData(obj)
  },

  updateWeightDisplay: function () {
    var dayData = this.data.dayData
    var weightVal = dayData.morningWeight || dayData.eveningWeight
    var display = '--'
    if (weightVal) {
      display = this.data.unitLabel === '斤' ? (weightVal * 2).toFixed(1) : Number(weightVal).toFixed(1)
    }
    this.setData({ todayWeightDisplay: display })
  },

  // ===== 保存 =====
  onSave: function () {
    var self = this
    var state = this.currentState
    var today = this.currentToday
    var dayData = this.data.dayData

    var days = state.days || []
    var found = false
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === today) {
        days[i] = dayData
        found = true
        break
      }
    }
    if (!found) {
      days.push(dayData)
    }
    state.days = days
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)

    wx.showToast({ title: '保存成功', icon: 'success' })
  }
})
