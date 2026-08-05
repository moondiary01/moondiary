// pages/index/index.js
var app = getApp()
var store = require('../../utils/store.js')
var config = require('../../utils/config.js')
var audio = require('../../utils/audio.js')

// 自动保存防抖定时器
var _autoSaveTimer = null

Page({
  data: {
    userName: '',
    userAvatar: '',
    todayStr: '',
    todayWeightDisplay: '--',
    unitLabel: '斤',
    isFemale: false,
    isAdmin: false,
    isBeautyUser: false,
    hideBeautyEntry: false,
    showBeautyQuick: false,
    dayData: {},
    waterMl: 0,
    waterGoal: 2000,
    waterCups: [],
    showPayModal: false,
    periodStatusText: '',
    // 排便选项
    bmOptions: ['—', '✓ 有', '✗ 无', '便秘'],
    bmIndex: 0,
    // 运动选项 — 扩展为7个（对齐HTML版）
    exerciseTrioOptions: ['—', '✓ 有', '✗ 无', '有氧运动', '力量训练', '瑜伽拉伸', '散步'],
    exerciseIndex: 0,
    // 饮食选项
    dietOptions: ['液断', '轻断食', '少餐', '正餐', '放纵'],
    // 仪表盘数据 — HTML版6项
    dashTotalDays: '',
    dashCurrentDay: '',
    dashStartWeight: '',
    dashTargetWeight: '',
    dashLostWeight: '',
    dashLatestWeight: '',
    // 进度条
    progressPercent: 0,
    // 用户信息
    userGender: '',
    userAge: '',
    userHeight: '',
    // 完整记录 — 按月分组
    monthGroups: []
  },

  onLoad: function () {
    this.loadUserData()
  },

  onShow: function () {
    var self = this
    if (app.globalData.loginType === 'wx' && !app.globalData.statusReady) {
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

  onHide: function () {
    this.saveNow()
  },

  onUnload: function () {
    if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null }
    this.saveNow()
  },

  checkAndLoad: function () {
    if (!app.canUse()) {
      this.setData({ showPayModal: true })
      return
    }
    if (this.data.showPayModal) {
      this.setData({ showPayModal: false })
    }
    this.loadUserData()
  },

  onPayModalClose: function () {
    this.setData({ showPayModal: false })
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
        periodEnd: false,
        periodNote: '',
        note: ''
      }
    }

    var isFemale = state.gender === '女'
    var unitLabel = state.unit || '斤'
    var weightVal = todayData.weightAM || todayData.weightPM
    var weightDisplay = '--'
    if (weightVal) {
      weightDisplay = unitLabel === '斤' ? (weightVal * 2).toFixed(1) : Number(weightVal).toFixed(1)
    }

    var waterMl = (todayData.water || 0) * 250
    var waterGoal = state.waterGoal || 2000

    // 生成杯子列表
    var maxCups = Math.max(8, Math.ceil(waterGoal / 250))
    var waterCups = []
    for (var c = 0; c < maxCups; c++) {
      waterCups.push({ filled: c < (todayData.water || 0) })
    }

    // 日期格式化
    var d = new Date()
    var weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    var todayStr = d.getMonth() + 1 + '月' + d.getDate() + '日 周' + weekDay

    // 排便/运动 index 映射
    var bmMap = { '': 0, '有': 1, '无': 2, '便秘': 3 }
    var bmIndex = bmMap[todayData.bm] || 0
    // 运动扩展映射（7项）
    var exMap = { '': 0, '有运动': 1, '无运动': 2, '有氧运动': 3, '力量训练': 4, '瑜伽拉伸': 5, '散步': 6 }
    var exerciseIndex = exMap[todayData.exercise] || 0

    // 经期状态文本
    var periodStatusText = ''
    if (todayData.period) {
      var startDate = new Date(today)
      for (var pi = 0; pi < days.length; pi++) {
        if (days[pi].period && days[pi].date < today) {
          startDate = new Date(days[pi].date)
        } else if (days[pi].date < today && !days[pi].period) {
          startDate = new Date(today)
        }
      }
      var periodDay = Math.floor((d - startDate) / (1000 * 60 * 60 * 24)) + 1
      periodStatusText = '经期第 ' + periodDay + ' 天'
    }

    this.setData({
      userName: state.name || '',
      userAvatar: state.avatar || '',
      todayStr: todayStr,
      todayWeightDisplay: weightDisplay,
      unitLabel: unitLabel,
      isFemale: isFemale,
      isAdmin: app.globalData.loginType === 'admin',
      isBeautyUser: app.globalData.canUseUpgrade || app.globalData.loginType === 'admin' || app.globalData.loginType === 'key',
      hideBeautyEntry: app.globalData.canUseUpgrade && app.globalData.loginType !== 'admin',
      showBeautyQuick: app.globalData.canUseUpgrade || app.globalData.loginType === 'admin' || app.globalData.loginType === 'key',
      dayData: todayData,
      waterMl: waterMl,
      waterGoal: waterGoal,
      waterCups: waterCups,
      bmIndex: bmIndex,
      exerciseIndex: exerciseIndex,
      periodStatusText: periodStatusText,
      userGender: state.gender || '',
      userAge: state.age ? String(state.age) : '',
      userHeight: state.height ? state.height + 'cm' : ''
    })

    this.renderDashboard(state)
    this.renderMonthGroups(state)

    this.currentState = state
    this.currentToday = today
  },

  // ===== 自动保存核心 =====
  autoSave: function () {
    var self = this
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer)
    _autoSaveTimer = setTimeout(function () {
      self.saveNow()
    }, 400)
  },

  saveNow: function () {
    var state = this.currentState
    var today = this.currentToday
    var dayData = this.data.dayData

    if (!state || !today) return

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
  },

  // ===== 体重输入 =====
  onMorningWeightInput: function (e) {
    var v = e.detail.value
    var unitLabel = this.data.unitLabel
    var storedVal = v ? (unitLabel === '斤' ? Number(v) / 2 : Number(v)) : null
    this.updateDayData('weightAM', storedVal)
    this.updateWeightDisplay()
    this.autoSave()
  },
  onMorningWeightBlur: function (e) {
    this.saveNow()
  },
  onEveningWeightInput: function (e) {
    var v = e.detail.value
    var unitLabel = this.data.unitLabel
    var storedVal = v ? (unitLabel === '斤' ? Number(v) / 2 : Number(v)) : null
    this.updateDayData('weightPM', storedVal)
    this.updateWeightDisplay()
    this.autoSave()
  },
  onEveningWeightBlur: function (e) {
    this.saveNow()
  },

  // ===== 体脂率 =====
  onFatRateInput: function (e) {
    var v = e.detail.value
    this.updateDayData('fat', v || null)
    this.autoSave()
  },
  onFatRateBlur: function (e) {
    this.saveNow()
  },

  // ===== 排便 =====
  onBmChange: function (e) {
    var idx = parseInt(e.detail.value)
    var valMap = { 0: '', 1: '有', 2: '无', 3: '便秘' }
    var val = valMap[idx] || ''
    this.setData({ bmIndex: idx })
    this.updateDayData('bm', val)
    this.autoSave()
  },

  // ===== 运动 =====
  onExerciseChange: function (e) {
    var idx = parseInt(e.detail.value)
    var valMap = { 0: '', 1: '有运动', 2: '无运动', 3: '有氧运动', 4: '力量训练', 5: '瑜伽拉伸', 6: '散步' }
    var val = valMap[idx] || ''
    this.setData({ exerciseIndex: idx })
    this.updateDayData('exercise', val)
    this.autoSave()
  },

  // ===== 饮食 =====
  onDietSelect: function (e) {
    var val = e.currentTarget.dataset.value
    var current = this.data.dayData.diet === val ? '' : val
    this.updateDayData('diet', current)
    this.autoSave()
  },

  // ===== 喝水打卡 =====
  onWaterAdd: function (e) {
    var cups = (this.data.dayData.water || 0) + 1
    var maxCups = Math.max(8, Math.ceil(this.data.waterGoal / 250))
    if (cups > maxCups) cups = maxCups
    this.updateDayData('water', cups)
    this.setData({ waterMl: cups * 250 })

    var waterCups = this.data.waterCups
    for (var i = 0; i < waterCups.length; i++) {
      waterCups[i].filled = i < cups
    }
    this.setData({ waterCups: waterCups })

    audio.playWater()
    this.autoSave()
  },

  // ===== 经期 =====
  onPeriodToggle: function () {
    var current = !this.data.dayData.period
    this.updateDayData('period', current)
    if (!current) {
      this.updateDayData('periodEnd', false)
    }
    this.updatePeriodStatus()
    this.autoSave()
  },
  onPeriodEndToggle: function () {
    var current = !this.data.dayData.periodEnd
    this.updateDayData('periodEnd', current)
    this.updatePeriodStatus()
    this.autoSave()
  },
  updatePeriodStatus: function () {
    var dayData = this.data.dayData
    var text = ''
    if (dayData.period) {
      var today = new Date()
      var startDate = new Date(this.currentToday)
      var days = this.currentState ? (this.currentState.days || []) : []
      for (var i = 0; i < days.length; i++) {
        if (days[i].period && days[i].date < this.currentToday) {
          startDate = new Date(days[i].date)
        } else if (days[i].date < this.currentToday && !days[i].period) {
          startDate = new Date(this.currentToday)
        }
      }
      var periodDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1
      text = '经期第 ' + periodDay + ' 天'
    }
    this.setData({ periodStatusText: text })
  },
  onPeriodNoteInput: function (e) {
    this.updateDayData('periodNote', e.detail.value)
    this.autoSave()
  },
  onPeriodNoteBlur: function (e) {
    this.saveNow()
  },

  // ===== 备注/日记 =====
  onNoteInput: function (e) {
    this.updateDayData('note', e.detail.value)
    this.autoSave()
  },
  onNoteBlur: function (e) {
    this.saveNow()
  },

  // ===== 工具方法 =====
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
      display = this.data.unitLabel === '斤' ? (weightVal * 2).toFixed(1) : Number(weightVal).toFixed(1)
    }
    this.setData({ todayWeightDisplay: display })
  },

  // ===== 编辑字段（仪表盘可点击项） =====
  onEditField: function (e) {
    var field = e.currentTarget.dataset.field
    wx.navigateTo({ url: '/pages/plan/plan' })
  },

  onScrollToTop: function () {
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  // ===== 导航 =====
  onGoAdmin: function () {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  onGoBeauty: function () {
    audio.playEnter()
    wx.navigateTo({
      url: '/subpkg-beauty/pages/upgrade-home/upgrade-home'
    })
  },

  onOpenSkincare: function () {
    audio.playEnter()
    wx.navigateTo({
      url: '/subpkg-beauty/pages/skincare/skincare'
    })
  },

  onOpenMood: function () {
    audio.playEnter()
    wx.navigateTo({
      url: '/subpkg-beauty/pages/mood/mood'
    })
  },

  onGoSkincare: function () {
    audio.playEnter()
    wx.navigateTo({
      url: '/subpkg-beauty/pages/skincare/skincare'
    })
  },

  onGoMood: function () {
    audio.playEnter()
    wx.navigateTo({
      url: '/subpkg-beauty/pages/mood/mood'
    })
  },

  // ===== 单位切换 =====
  onSwitchUnit: function (e) {
    var newUnit = e.currentTarget.dataset.unit;
    if (newUnit === this.data.unitLabel) return;
    this.currentState.unit = newUnit;
    app.globalData.state = this.currentState;
    store.saveState(app.globalData.userKey, this.currentState);
    this.initPage(this.currentState, this.currentToday);
    wx.showToast({ title: '已切换为' + newUnit, icon: 'success' });
  },

  // ===== 设置 =====
  onOpenSettings: function () {
    wx.navigateTo({ url: '/pages/plan/plan' });
  },

  // ===== 退出登录 =====
  onLogout: function () {
    var self = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          app.logout();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },

  // ===== 仪表盘 — HTML版6项 =====
  renderDashboard: function (state) {
    var days = state.days || [];
    var unitLabel = state.unit || '斤';

    // 计划天数
    var startDate = state.startDate;
    var targetDate = state.targetDate;
    var totalDays = '—';
    var currentDay = '—';
    if (startDate && targetDate) {
      var s = new Date(startDate);
      var t = new Date(targetDate);
      var diffTotal = Math.round((t - s) / (1000 * 60 * 60 * 24));
      totalDays = diffTotal > 0 ? diffTotal + '天' : '—';
      var today = new Date();
      var diffCurrent = Math.floor((today - s) / (1000 * 60 * 60 * 24)) + 1;
      currentDay = diffCurrent > 0 ? diffCurrent : '—';
      if (typeof currentDay === 'number') currentDay = currentDay + '天';
    }

    // 起始体重
    var startWeight = '—';
    if (state.startWeight) {
      var sw = Number(state.startWeight);
      startWeight = unitLabel === '斤' ? (sw * 2).toFixed(1) : sw.toFixed(1);
      startWeight += ' ' + unitLabel;
    }

    // 目标体重
    var targetWeight = '—';
    if (state.targetWeight) {
      var tw = Number(state.targetWeight);
      targetWeight = unitLabel === '斤' ? (tw * 2).toFixed(1) : tw.toFixed(1);
      targetWeight += ' ' + unitLabel;
    }

    // 最新体重
    var latestWeight = null;
    for (var j = days.length - 1; j >= 0; j--) {
      if (days[j].weightAM || days[j].weightPM) {
        latestWeight = Number(days[j].weightAM || days[j].weightPM);
        break;
      }
    }
    var latestStr = '—';
    if (latestWeight) {
      latestStr = unitLabel === '斤' ? (latestWeight * 2).toFixed(1) : latestWeight.toFixed(1);
      latestStr += ' ' + unitLabel;
    }

    // 已减重
    var lostStr = '—';
    if (state.startWeight && latestWeight) {
      var lost = Number(state.startWeight) - latestWeight;
      if (lost > 0) {
        lostStr = unitLabel === '斤' ? (lost * 2).toFixed(1) : lost.toFixed(1);
        lostStr += ' ' + unitLabel;
      } else {
        lostStr = '0 ' + unitLabel;
      }
    }

    // 进度条
    var progressPercent = 0;
    if (state.startWeight && state.targetWeight && latestWeight) {
      var total = Number(state.startWeight) - Number(state.targetWeight);
      if (total > 0) {
        var done = Number(state.startWeight) - latestWeight;
        progressPercent = Math.round((done / total) * 100);
        if (progressPercent < 0) progressPercent = 0;
        if (progressPercent > 100) progressPercent = 100;
      }
    }

    this.setData({
      dashTotalDays: totalDays,
      dashCurrentDay: currentDay,
      dashStartWeight: startWeight,
      dashTargetWeight: targetWeight,
      dashLostWeight: lostStr,
      dashLatestWeight: latestStr,
      progressPercent: progressPercent
    });
  },

  // ===== 完整记录 — 按月分组 =====
  renderMonthGroups: function (state) {
    var days = (state.days || []).slice().reverse();
    var unitLabel = state.unit || '斤';
    var groups = {};
    var groupOrder = [];

    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var monthKey = d.date.substring(0, 7); // YYYY-MM
      if (!groups[monthKey]) {
        groups[monthKey] = [];
        groupOrder.push(monthKey);
      }
      var w = d.weightAM || d.weightPM;
      groups[monthKey].push({
        date: d.date,
        dateStr: d.date.substring(5),
        weight: w ? (unitLabel === '斤' ? (Number(w) * 2).toFixed(1) : Number(w).toFixed(1)) + ' ' + unitLabel : '—',
        bm: d.bm || '—',
        exercise: d.exercise || '—',
        diet: d.diet || '—'
      });
    }

    var monthGroups = groupOrder.map(function (key) {
      return {
        month: key,
        records: groups[key],
        expanded: false
      };
    });

    this.setData({ monthGroups: monthGroups });
  },

  onToggleMonth: function (e) {
    var month = e.currentTarget.dataset.month;
    var groups = this.data.monthGroups;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].month === month) {
        var key = 'monthGroups[' + i + '].expanded';
        var obj = {};
        obj[key] = !groups[i].expanded;
        this.setData(obj);
        break;
      }
    }
  },
})
