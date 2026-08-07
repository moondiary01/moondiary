// pages/plan/plan.js
var app = getApp()
var store = require('../../utils/store.js')

Page({
  data: {
    state: {},
    unitLabel: '斤',
    startWeightDisplay: '--',
    targetWeightDisplay: '--',
    currentDay: 0,
    remainingDays: 0,
    lostWeight: 0,
    lostWeightStr: '--',
    totalDays: 0,
    progressPercent: 0,
    showEditModal: false,
    editCard: '',
    editName: '',
    editGender: '',
    editAge: '',
    editHeight: '',
    editStartDate: '',
    editTargetDate: '',
    editStartWeight: '',
    editTargetWeight: '',
    editStartFat: '',
    editBust: '',
    editWaist: '',
    editHip: ''
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
          self.renderPage(data)
        }
      })
    } else {
      self.renderPage(state)
    }
  },

  renderPage: function (state) {
    var unitLabel = state.unit || '斤'

    // 体重显示
    var sw = state.startWeight
    var tw = state.targetWeight
    var swDisplay = '--'
    var twDisplay = '--'
    if (sw) {
      swDisplay = unitLabel === '斤' ? (sw * 2).toFixed(1) : Number(sw).toFixed(1)
      swDisplay += ' ' + unitLabel
    }
    if (tw) {
      twDisplay = unitLabel === '斤' ? (tw * 2).toFixed(1) : Number(tw).toFixed(1)
      twDisplay += ' ' + unitLabel
    }

    // 天数计算
    var today = store.localDateStr(new Date())
    var todayTime = new Date(today).getTime()
    var currentDay = 0
    var remainingDays = 0
    var totalDays = 0
    var progressPercent = 0

    if (state.startDate) {
      var startTime = new Date(state.startDate).getTime()
      currentDay = Math.floor((todayTime - startTime) / (24 * 60 * 60 * 1000)) + 1
      if (currentDay < 0) currentDay = 0
    }
    if (state.targetDate) {
      var targetTime = new Date(state.targetDate).getTime()
      remainingDays = Math.ceil((targetTime - todayTime) / (24 * 60 * 60 * 1000))
      if (remainingDays < 0) remainingDays = 0
    }
    if (state.startDate && state.targetDate) {
      var startTime2 = new Date(state.startDate).getTime()
      var targetTime2 = new Date(state.targetDate).getTime()
      totalDays = Math.floor((targetTime2 - startTime2) / (24 * 60 * 60 * 1000))
      if (totalDays > 0) {
        progressPercent = Math.min(100, Math.round((currentDay / totalDays) * 100))
      }
    }

    // 已减重
    var lostWeight = 0
    var lostWeightStr = '--'
    if (state.startWeight) {
      var days = state.days || []
      var latestWeight = null
      for (var i = days.length - 1; i >= 0; i--) {
        if (days[i].weightAM) {
          latestWeight = Number(days[i].weightAM)
          break
        }
      }
      if (latestWeight !== null) {
        lostWeight = Number(state.startWeight) - latestWeight
        var displayLost = unitLabel === '斤' ? (lostWeight * 2).toFixed(1) : lostWeight.toFixed(1)
        var sign = lostWeight > 0 ? '-' : lostWeight < 0 ? '+' : ''
        lostWeightStr = sign + Math.abs(parseFloat(displayLost)) + ' ' + unitLabel
      }
    }

    this.setData({
      state: state,
      unitLabel: unitLabel,
      startWeightDisplay: swDisplay,
      targetWeightDisplay: twDisplay,
      currentDay: currentDay,
      remainingDays: remainingDays,
      lostWeight: lostWeight,
      lostWeightStr: lostWeightStr,
      totalDays: totalDays,
      progressPercent: progressPercent
    })
  },

  // ===== 编辑 =====
  onEditCard: function (e) {
    var card = e.currentTarget.dataset.card
    var s = this.data.state
    this.setData({
      showEditModal: true,
      editCard: card,
      editName: s.name || '',
      editGender: s.gender || '',
      editAge: s.age ? String(s.age) : '',
      editHeight: s.height ? String(s.height) : '',
      editStartDate: s.startDate || '',
      editTargetDate: s.targetDate || '',
      editStartWeight: s.startWeight ? String(s.startWeight) : '',
      editTargetWeight: s.targetWeight ? String(s.targetWeight) : '',
      editStartFat: s.startFat ? String(s.startFat) : '',
      editBust: s.bust ? String(s.bust) : '',
      editWaist: s.waist ? String(s.waist) : '',
      editHip: s.hip ? String(s.hip) : ''
    })
  },

  onInput: function (e) {
    var field = e.currentTarget.dataset.field
    var obj = {}
    obj[field] = e.detail.value
    this.setData(obj)
  },

  onDateChange: function (e) {
    var field = e.currentTarget.dataset.field
    var obj = {}
    obj[field] = e.detail.value
    this.setData(obj)
  },

  onGenderSelect: function (e) {
    this.setData({ editGender: e.currentTarget.dataset.val })
  },

  onCloseModal: function () {
    this.setData({ showEditModal: false })
  },

  onConfirmEdit: function () {
    var state = app.globalData.state
    var card = this.data.editCard

    if (card === 'basic') {
      state.name = this.data.editName
      state.gender = this.data.editGender
      state.age = this.data.editAge ? Number(this.data.editAge) : null
      state.height = this.data.editHeight ? Number(this.data.editHeight) : null
    } else if (card === 'plan') {
      state.startDate = this.data.editStartDate
      state.targetDate = this.data.editTargetDate
      state.startWeight = this.data.editStartWeight ? Number(this.data.editStartWeight) : null
      state.targetWeight = this.data.editTargetWeight ? Number(this.data.editTargetWeight) : null
      state.startFat = this.data.editStartFat ? Number(this.data.editStartFat) : null
    } else if (card === 'measure') {
      state.bust = this.data.editBust ? Number(this.data.editBust) : null
      state.waist = this.data.editWaist ? Number(this.data.editWaist) : null
      state.hip = this.data.editHip ? Number(this.data.editHip) : null
    }

    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)

    this.setData({ showEditModal: false })
    this.renderPage(state)
    wx.showToast({ title: '保存成功', icon: 'success' })
  }
})
