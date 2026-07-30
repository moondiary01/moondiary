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
    isAdmin: false,
    dayData: {},
    waterMl: 0,
    showPayModal: false,
    dietOptions: ['液断', '轻断食', '少餐', '正餐', '放纵'],
    exerciseOptions: ['有运动', '无运动', '有氧运动', '力量训练', '瑜伽拉伸', '散步']
  },

  onLoad: function () {
    this.loadUserData()
  },

  onShow: function () {
    // 微信用户可能状态还在异步加载中
    var self = this
    if (app.globalData.loginType === 'wx' && !app.globalData.statusReady) {
      // 等待状态加载完成
      var checkCount = 0
      var checkTimer = setInterval(function () {
        checkCount++
        if (app.globalData.statusReady || checkCount > 20) {
          clearInterval(checkTimer)
          self.checkAndLoad()
        }
      }, 100)
    } else {
      self.checkAndLoad()
    }
  },

  checkAndLoad: function () {
    // 检查试用是否过期
    if (!app.canUse()) {
      this.setData({ showPayModal: true })
      return
    }
    // 如果 payModal 之前显示过，现在恢复了使用权限，隐藏它
    if (this.data.showPayModal) {
      this.setData({ showPayModal: false })
    }
    this.loadUserData()
  },

  onPayModalClose: function () {
    this.setData({ showPayModal: false })
    // 试用过期后关闭弹窗，跳转到付费页面
    wx.navigateTo({ url: '/pages/pay/pay' })
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
        weightAM: null,
        weightPM: null,
        fat: null,
        bm: '',
        diet: '',
        exercise: '',
        water: 0,
        period: false,
        periodNote: '',
        note: ''
      }
    }

    var isFemale = state.gender === '女'
    var unitLabel = state.unit || '斤'
    var weightVal = todayData.weightAM || todayData.weightPM
    var weightDisplay = '--'
    if (weightVal) {
      // 存储的是kg，斤模式下显示 ×2
      weightDisplay = unitLabel === '斤' ? (weightVal * 2).toFixed(1) : Number(weightVal).toFixed(1)
    }

    var waterMl = (todayData.water || 0) * 250

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
      isAdmin: app.globalData.loginType === 'admin',
      dayData: todayData,
      waterMl: waterMl
    })

    // 保存到当前页面的 state 引用
    this.currentState = state
    this.currentToday = today
  },

  // ===== 输入处理 =====
  onMorningWeightInput: function (e) {
    var v = e.detail.value
    // 斤模式下存储 v/2（即kg），与网页版一致
    var unitLabel = this.data.unitLabel
    var storedVal = v ? (unitLabel === '斤' ? Number(v) / 2 : Number(v)) : null
    this.updateDayData('weightAM', storedVal)
    this.updateWeightDisplay()
  },
  onEveningWeightInput: function (e) {
    var v = e.detail.value
    var unitLabel = this.data.unitLabel
    var storedVal = v ? (unitLabel === '斤' ? Number(v) / 2 : Number(v)) : null
    this.updateDayData('weightPM', storedVal)
    this.updateWeightDisplay()
  },
  onFatRateInput: function (e) {
    this.updateDayData('fat', e.detail.value)
  },
  onBmInput: function (e) {
    this.updateDayData('bm', e.detail.value)
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
    var cups = (this.data.dayData.water || 0) + 1
    this.updateDayData('water', cups)
    this.setData({ waterMl: cups * 250 })
  },
  onPeriodToggle: function () {
    var current = !this.data.dayData.period
    this.updateDayData('period', current)
  },
  onPeriodNoteInput: function (e) {
    this.updateDayData('periodNote', e.detail.value)
  },
  onNoteInput: function (e) {
    this.updateDayData('note', e.detail.value)
  },

  updateDayData: function (field, value) {
    var key = 'dayData.' + field
    var obj = {}
    obj[key] = value
    this.setData(obj)
  },

  updateWeightDisplay: function () {
    var dayData = this.data.dayData
    var weightVal = dayData.weightAM || dayData.weightPM
    var display = '--'
    if (weightVal) {
      // 存储的是kg，斤模式下显示 ×2
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
  },

  // ===== 管理后台入口 =====
  onGoAdmin: function () {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  // ===== 100变美日记入口 =====
  onGoBeauty: function () {
    var app = getApp()
    var audio = require('../../utils/audio.js')
    audio.playEnter()
    wx.navigateTo({
      url: '/subpkg-beauty/pages/upgrade-home/upgrade-home'
    })
  }
})
