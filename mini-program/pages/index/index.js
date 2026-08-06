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
    canSeeUpgrade: false,
    showBasicPlanEntry: false,
    dayData: {},
    waterMl: 0,
    waterGoal: 2000,
    waterCups: [],
    showPayModal: false,
    periodStatusText: '',
    // 排便选项
    bmOptions: ['—', '✓ 有', '✗ 无', '便秘'],
    bmIndex: 0,
    // 运动选项（对齐HTML版 3 项）
    exerciseTrioOptions: ['—', '✓ 有', '✗ 无'],
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
    monthGroups: [],
    // === 单页应用新增 ===
    currentTab: 0,
    bottomActive: 'home',
    showPosterPage: false,
    showMyPage: false,
    // === Tab 1: 趋势统计 ===
    chartHasData: false,
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
    statRecordDays: 0,
    // === Tab 2: 计划详情 ===
    planState: {},
    startWeightDisplay: '--',
    targetWeightDisplay: '--',
    currentDay: 0,
    remainingDays: 0,
    lostWeight: 0,
    lostWeightStr: '--',
    totalDays: 0,
    showPlanEditModal: false,
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
    // === Tab 3: 周度复盘 ===
    weekList: [],
    // === Tab 4: 经期日历 ===
    calYear: 0,
    calMonth: 0,
    calDays: [],
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
    /* 管理员模拟试用过期弹窗（调试用） */
    if (app.globalData.loginType === 'admin') {
      try {
        var adminSim = wx.getStorageSync('admin_sim_basic')
        if (adminSim !== '1') {
          this.setData({ showPayModal: true })
          return
        }
      } catch (e) {}
    }
    if (this.data.showPayModal) {
      this.setData({ showPayModal: false })
    }
    this.loadUserData()
  },

  onPayModalClose: function () {
    /* 管理员关闭弹窗标记为已模拟购买 */
    if (app.globalData.loginType === 'admin') {
      try { wx.setStorageSync('admin_sim_basic', '1') } catch (e) {}
    }
    this.setData({ showPayModal: false })
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
      canSeeUpgrade: app.globalData.canUseUpgrade || app.globalData.isPaid || app.globalData.loginType === 'admin' || app.globalData.loginType === 'key',
      showBasicPlanEntry: (!app.globalData.canUseUpgrade && !app.globalData.isPaid && app.globalData.loginType !== 'key') || app.globalData.loginType === 'admin',
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

  onOpenBasicPay: function () {
    audio.playEnter()
    wx.navigateTo({
      url: '/pages/pay/pay'
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

  // ===== 单页应用：顶部 Tab 切换 =====
  onSwitchTab: function(e) {
    var idx = parseInt(e.currentTarget.dataset.idx);
    this.setData({ currentTab: idx, bottomActive: 'home' });
    if (idx === 1) this.renderChart();
    if (idx === 2) this.renderPlan();
    if (idx === 3) this.renderReview();
    if (idx === 4) this.renderCalendar();
  },

  // ===== 底部导航 =====
  onBottomHome: function() {
    this.setData({ currentTab: 0, bottomActive: 'home', showPosterPage: false, showMyPage: false });
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },

  onBottomPoster: function() {
    this.setData({ bottomActive: 'poster', showPosterPage: true, showMyPage: false });
    this.renderPosterData();
  },

  onBottomMy: function() {
    this.setData({ bottomActive: 'my', showPosterPage: false, showMyPage: true });
  },

  // ===== 今日海报数据渲染 =====
  renderPosterData: function() {
    var self = this;
    var state = app.globalData.state || {};
    var today = new Date();
    var todayStr = store.formatDateStr(today);
    var weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    var posterDate = today.getFullYear() + '年' + (today.getMonth()+1) + '月' + today.getDate() + '日 ' + weekDays[today.getDay()];

    var day = null;
    if (state.days) {
      for (var i = 0; i < state.days.length; i++) {
        if (state.days[i].date === todayStr) { day = state.days[i]; break; }
      }
    }
    day = day || {};

    var todayW = null;
    if (day.weightAM !== null && day.weightAM !== undefined) todayW = day.weightAM;
    else if (day.weightPM !== null && day.weightPM !== undefined) todayW = day.weightPM;
    var unitLabel = state.unit || '斤';
    var startW = state.startWeight;
    var targetW = state.targetWeight;
    var lostVal = (startW && todayW) ? (startW - todayW).toFixed(1) : '—';

    /* 照片 */
    var allPhotos = [];
    if (day.photo) allPhotos.push(day.photo);
    try {
      var skinData = wx.getStorageSync('beauty_skincare_data');
      if (skinData && skinData.dailyRecords) {
        for (var si = 0; si < skinData.dailyRecords.length; si++) {
          if (skinData.dailyRecords[si].date === todayStr && skinData.dailyRecords[si].photos) {
            allPhotos = allPhotos.concat(skinData.dailyRecords[si].photos);
            break;
          }
        }
      }
    } catch(e) {}
    try {
      var moodData = wx.getStorageSync('beauty_mood_data');
      if (moodData && moodData.dailyRecords) {
        for (var mi = 0; mi < moodData.dailyRecords.length; mi++) {
          if (moodData.dailyRecords[mi].date === todayStr && moodData.dailyRecords[mi].photos) {
            allPhotos = allPhotos.concat(moodData.dailyRecords[mi].photos);
            break;
          }
        }
      }
    } catch(e) {}

    /* 健康记录 */
    var waterCups = day.water || 0;
    var bmLabels = {'有':'有','无':'无','便秘':'便秘'};
    var posterHealth = [
      {label:'喝水', val:waterCups + '杯', done:waterCups>0},
      {label:'排便', val:bmLabels[day.bm] || '—', done:day.bm==='有'||day.bm==='便秘'},
      {label:'运动', val:day.exercise==='有'?'有':'—', done:day.exercise==='有'},
      {label:'饮食', val:day.diet || '—', done:!!day.diet}
    ];

    /* 护肤日记 */
    var posterSkincare = [];
    var posterSkincareNote = '';
    try {
      var scData = wx.getStorageSync('beauty_skincare_data');
      if (scData && scData.dailyRecords) {
        for (var sci = 0; sci < scData.dailyRecords.length; sci++) {
          var rec = scData.dailyRecords[sci];
          if (rec.date === todayStr) {
            var skinType = (scData.skinProfile && scData.skinProfile.type) ? scData.skinProfile.type : '';
            var skinTone = (scData.skinProfile && scData.skinProfile.tone) ? scData.skinProfile.tone : '';
            if (skinType || skinTone) posterSkincare.push({label:'皮肤状态', val:(skinType||'')+(skinTone?' · '+skinTone:''), done:true});
            if (rec.skinStatus && rec.skinStatus.length > 0) posterSkincare.push({label:'皮肤状况', val:rec.skinStatus.join('、'), done:true});
            if (rec.skinStatusCustom) posterSkincare.push({label:'状况备注', val:rec.skinStatusCustom, done:true});
            posterSkincare.push({label:'晨间护肤', val:rec.morningSkincare?'已完成':'未打卡', done:!!rec.morningSkincare});
            posterSkincare.push({label:'夜间护肤', val:rec.nightSkincare?'已完成':'未打卡', done:!!rec.nightSkincare});
            if (rec.bodyCare && rec.bodyCare.length > 0) posterSkincare.push({label:'身体护理', val:rec.bodyCare.join('、'), done:true});
            if (rec.salon) posterSkincare.push({label:'美容院', val:rec.salonNote||'已打卡', done:true});
            if (rec.cosmetic) posterSkincare.push({label:'do脸', val:rec.cosmeticNote||'已打卡', done:true});
            posterSkincareNote = rec.note || '';
            break;
          }
        }
      }
    } catch(e) {}

    /* 心情日记 */
    var posterMood = [];
    var posterMoodDiary = '';
    var posterMoodGratitude = '';
    try {
      var mdData = wx.getStorageSync('beauty_mood_data');
      if (mdData && mdData.dailyRecords) {
        for (var mdi = 0; mdi < mdData.dailyRecords.length; mdi++) {
          var mrec = mdData.dailyRecords[mdi];
          if (mrec.date === todayStr) {
            var moodLabelMap = {happy:'开心',satisfied:'满足',surprised:'惊喜',heartbeat:'心动',moved:'感动',shy:'害羞',calm:'平静',excited:'激动',confident:'自信',proud:'骄傲',loose:'松弛',relieved:'释然',healed:'治愈',hopeful:'憧憬',lost:'迷茫',nostalgic:'怀念',bored:'无聊',dazed:'恍惚',tired:'疲惫',nervous:'紧张',lonely:'孤独',pitiful:'可怜',down:'低落',aloof:'压抑',bitter:'心酸',wronged:'委屈',cold:'冷漠',sad:'难过',anxious:'焦虑',scared:'恐惧',angry:'生气',irritated:'烦躁',jealous:'妒忌',confused:'疑惑'};
            var moods = mrec.moods || (mrec.mood ? [mrec.mood] : []);
            if (moods.length > 0) {
              var moodNames = moods.map(function(m) { return moodLabelMap[m] || m; });
              posterMood.push({label:'心情', val:moodNames.join(' · '), done:true});
            }
            if (mrec.status) posterMood.push({label:'状态', val:mrec.status, done:true});
            if (mrec.diary) posterMoodDiary = mrec.diary;
            var gratitude = mrec.gratitude || ['','',''];
            var gTexts = gratitude.filter(function(g) { return !!g; });
            if (gTexts.length > 0) posterMoodGratitude = gTexts.map(function(g,i) { return (i+1)+'. '+g; }).join('  ');
            if (mrec.discipline) {
              var discItems = [];
              for (var dk in mrec.discipline) { if (mrec.discipline[dk]) discItems.push(dk); }
              if (discItems.length > 0) posterMood.push({label:'自律', val:discItems.join(' · '), done:true});
            }
            if (mrec.customCheck) posterMood.push({label:'备注', val:mrec.customCheck, done:true});
            break;
          }
        }
      }
    } catch(e) {}

    self.setData({
      posterDate: posterDate,
      posterLost: lostVal,
      posterTodayWeight: '今日体重 ' + (todayW !== null ? todayW.toFixed(1) + ' ' + unitLabel : '—'),
      posterFat: '体脂率 ' + (day.fat !== null && day.fat !== undefined ? day.fat + '%' : '—'),
      posterStartWeight: startW ? startW.toFixed(1) + ' ' + unitLabel : '—',
      posterTargetWeight: targetW ? targetW.toFixed(1) + ' ' + unitLabel : '—',
      posterPhotos: allPhotos,
      posterHealth: posterHealth,
      posterSkincare: posterSkincare,
      posterSkincareNote: posterSkincareNote,
      posterMood: posterMood,
      posterMoodDiary: posterMoodDiary,
      posterMoodGratitude: posterMoodGratitude
    });
  },

  onSavePoster: function() {
    var self = this;
    wx.showLoading({ title: '生成海报...' });
    var ctx = wx.createCanvasContext('posterCanvas');
    var w = 375, h = 667, y = 0;
    var pd = this.data;

    /* 背景 */
    ctx.setFillStyle('#faf5f9');
    ctx.fillRect(0, 0, w, h);

    /* 标题 */
    y = 40;
    ctx.setFillStyle('#9ca3af');
    ctx.setFontSize(11); ctx.setTextAlign('center');
    ctx.fillText('Moon Memo', w/2, y); y += 22;
    ctx.setFillStyle('#78716c');
    ctx.setFontSize(15);
    ctx.fillText('今日海报', w/2, y); y += 20;
    ctx.setFillStyle('#a8a29e');
    ctx.setFontSize(11);
    ctx.fillText(pd.posterDate || '', w/2, y); y += 28;

    /* 分隔线 */
    ctx.setStrokeStyle('#e5e0eb'); ctx.setLineWidth(0.5);
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w-40, y); ctx.stroke(); y += 22;

    /* 已减重圆形 */
    var cx = w/2, cy = y + 60, r = 60;
    var grad = ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
    grad.addColorStop(0, '#9d6b8b'); grad.addColorStop(0.3, '#7a5276'); grad.addColorStop(0.7, '#5b3a5e'); grad.addColorStop(1, '#3d2b4f');
    ctx.setFillStyle(grad);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.setFillStyle('#fce7f3');
    ctx.setFontSize(48); ctx.setTextAlign('center');
    ctx.fillText(String(pd.posterLost || '—'), cx, cy-6);
    ctx.setFontSize(13);
    ctx.fillText('kg', cx, cy+14);
    ctx.setFillStyle('rgba(252,231,243,0.5)');
    ctx.setFontSize(10);
    ctx.fillText('已减重', cx, cy+28);
    y = cy + r + 22;

    /* 体重数据 */
    ctx.setFillStyle('#44403c');
    ctx.setFontSize(17);
    ctx.fillText(pd.posterTodayWeight || '', w/2, y); y += 20;
    ctx.setFillStyle('#a8a29e');
    ctx.setFontSize(12);
    ctx.fillText(pd.posterFat || '', w/2, y); y += 18;
    ctx.setFontSize(10);
    ctx.setFillStyle('#a8a29e');
    ctx.fillText('起始体重', w/2-60, y); ctx.fillText('目标体重', w/2+60, y); y += 14;
    ctx.setFillStyle('#78716c');
    ctx.setFontSize(15);
    ctx.fillText(pd.posterStartWeight || '—', w/2-60, y); ctx.fillText(pd.posterTargetWeight || '—', w/2+60, y); y += 26;

    /* 健康记录 */
    y += 4;
    ctx.setStrokeStyle('#e5e0eb'); ctx.setLineWidth(0.5);
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w-40, y); ctx.stroke(); y += 18;
    ctx.setFillStyle('#9ca3af'); ctx.setFontSize(10); ctx.setTextAlign('center');
    ctx.fillText('健康记录', w/2, y); y += 16;
    var health = pd.posterHealth || [];
    var hx = 50;
    health.forEach(function(item, i) {
      if (i === 2) { hx = 50; y += 18; }
      ctx.setFillStyle(item.done ? '#a7c957' : '#e5e7eb');
      ctx.beginPath(); ctx.arc(hx+3, y-3, 3, 0, Math.PI*2); ctx.fill();
      ctx.setFillStyle('#57534e'); ctx.setFontSize(12); ctx.setTextAlign('left');
      ctx.fillText(item.label, hx+12, y+1);
      ctx.setFillStyle('#9ca3af'); ctx.setFontSize(11);
      ctx.fillText(item.val || '', hx+50, y+1);
      hx += 140;
    });
    y += 20;

    /* 护肤日记 */
    ctx.setStrokeStyle('#e5e0eb'); ctx.setLineWidth(0.5);
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w-40, y); ctx.stroke(); y += 18;
    ctx.setFillStyle('#9ca3af'); ctx.setFontSize(10); ctx.setTextAlign('center');
    ctx.fillText('护肤日记', w/2, y); y += 16;
    var sc = pd.posterSkincare || [];
    sc.forEach(function(item) {
      ctx.setFillStyle(item.done ? '#a7c957' : '#e5e7eb');
      ctx.beginPath(); ctx.arc(48, y-3, 3, 0, Math.PI*2); ctx.fill();
      ctx.setFillStyle('#57534e'); ctx.setFontSize(12); ctx.setTextAlign('left');
      ctx.fillText(item.label, 58, y+1);
      ctx.setFillStyle('#9ca3af'); ctx.setFontSize(11);
      ctx.fillText(item.val || '', 150, y+1);
      y += 17;
    });
    if (pd.posterSkincareNote) {
      ctx.setFillStyle('#a8a29e'); ctx.setFontSize(11); ctx.setTextAlign('center');
      ctx.fillText(pd.posterSkincareNote, w/2, y); y += 16;
    }
    y += 2;

    /* 心情日记 */
    ctx.setStrokeStyle('#e5e0eb'); ctx.setLineWidth(0.5);
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w-40, y); ctx.stroke(); y += 18;
    ctx.setFillStyle('#9ca3af'); ctx.setFontSize(10); ctx.setTextAlign('center');
    ctx.fillText('心情日记', w/2, y); y += 16;
    var mood = pd.posterMood || [];
    mood.forEach(function(item) {
      ctx.setFillStyle('#a7c957');
      ctx.beginPath(); ctx.arc(48, y-3, 3, 0, Math.PI*2); ctx.fill();
      ctx.setFillStyle('#57534e'); ctx.setFontSize(12); ctx.setTextAlign('left');
      ctx.fillText(item.label, 58, y+1);
      ctx.setFillStyle('#9ca3af'); ctx.setFontSize(11);
      ctx.fillText(item.val || '', 130, y+1);
      y += 17;
    });
    if (pd.posterMoodDiary) {
      ctx.setFillStyle('#78716c'); ctx.setFontSize(11); ctx.setTextAlign('center');
      ctx.fillText(pd.posterMoodDiary, w/2, y); y += 16;
    }
    if (pd.posterMoodGratitude) {
      ctx.setFillStyle('#a8a29e'); ctx.setFontSize(11); ctx.setTextAlign('center');
      ctx.fillText(pd.posterMoodGratitude, w/2, y); y += 16;
    }

    ctx.draw(false, function() {
      setTimeout(function() {
        wx.canvasToTempFilePath({
          canvasId: 'posterCanvas',
          success: function(res) {
            wx.hideLoading();
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: function() {
                wx.showToast({ title: '已保存到相册', icon: 'success' });
              },
              fail: function(e) {
                if (e.errMsg.indexOf('auth deny') !== -1 || e.errMsg.indexOf('authorize') !== -1) {
                  wx.showModal({
                    title: '需要相册权限',
                    content: '请在设置中允许小程序保存到相册',
                    confirmText: '去设置',
                    success: function(m) {
                      if (m.confirm) wx.openSetting();
                    }
                  });
                } else {
                  wx.showToast({ title: '保存失败', icon: 'none' });
                }
              }
            });
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: '生成失败', icon: 'none' });
          }
        });
      }, 500);
    });
  },

  // =========================================
  // Tab 1: 趋势统计 (from chart.js)
  // =========================================

  renderChart: function () {
    var self = this
    var state = app.globalData.state

    if (!state) {
      store.loadState(app.globalData.userKey, function (data) {
        if (data) {
          app.globalData.state = data
          self._doRenderChart(data)
        }
      })
    } else {
      self._doRenderChart(state)
    }
  },

  _doRenderChart: function (state) {
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
      chartHasData: hasData,
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
      var weekStart = d.date
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
    weeks = weeks.slice(-12)

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

  // ===== 三围编辑（chart tab） =====
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
  },

  // =========================================
  // Tab 2: 计划详情 (from plan.js)
  // =========================================

  renderPlan: function () {
    var self = this
    var state = app.globalData.state

    if (!state) {
      store.loadState(app.globalData.userKey, function (data) {
        if (data) {
          app.globalData.state = data
          self._doRenderPlan(data)
        }
      })
    } else {
      self._doRenderPlan(state)
    }
  },

  _doRenderPlan: function (state) {
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
      planState: state,
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

  // ===== Plan 编辑 (namespaced to avoid clash with chart modal) =====
  onPlanEditCard: function (e) {
    var card = e.currentTarget.dataset.card
    var s = this.data.planState
    this.setData({
      showPlanEditModal: true,
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

  onPlanInput: function (e) {
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

  onPlanCloseModal: function () {
    this.setData({ showPlanEditModal: false })
  },

  onPlanConfirmEdit: function () {
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

    this.setData({ showPlanEditModal: false })
    this._doRenderPlan(state)
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  // =========================================
  // Tab 3: 周度复盘 (from review.js)
  // =========================================

  renderReview: function () {
    var state = store.loadState(app.globalData.userKey)
    if (!state || !state.startDate) {
      this.setData({ weekList: [] })
      return
    }
    var self = this
    var unit = state.unit || '斤'
    var totalDays = this._calcTotalDays(state)
    var weeks = Math.ceil(totalDays / 7)
    var weekList = []

    for (var w = 0; w < weeks; w++) {
      var si = w * 7
      var ei = Math.min(si + 6, (state.days || []).length - 1)
      if (ei < si) continue
      var mon = state.days[si]
      var sun = state.days[ei]
      if (!mon || !sun) continue

      var mW = this._getEffectiveWeight(mon)
      var sW = this._getEffectiveWeight(sun)
      var weekDays = state.days.slice(si, ei + 1)
      var wd = weekDays.filter(function(d) { return self._getEffectiveWeight(d) !== null })

      // 周一/周日体重
      var mondayWeight = mW !== null ? this._fmtW(mW, unit) : '—'
      var sundayWeight = sW !== null ? this._fmtW(sW, unit) : '—'

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
        if (d.date && self._isPeriodDay(state, d.date)) periodDays++
      })

      // 日均饮水
      var waterSum = weekDays.reduce(function(a, d) { return a + (d.water || 0) }, 0)
      var waterAvg = wd.length ? Math.round(waterSum / (ei - si + 1) * (store.WATER_CUP_ML || 200)) : 0

      // 阶段着色
      var stage = this._getStage(w + 1, totalDays)
      var bg = stage === 1 ? '#FAF5FF' : stage === 2 ? '#D1FAE5' : '#FCE7F3'

      // 日期范围
      var dateRange = this._formatDate(mon.date) + ' - ' + this._formatDate(sun.date)

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

  _calcTotalDays: function(state) {
    if (!state.startDate) return 0
    var start = new Date(state.startDate)
    var target = state.targetDate ? new Date(state.targetDate) : null
    if (!target || target <= start) return 100
    return Math.ceil((target - start) / 86400000)
  },

  _getEffectiveWeight: function(day) {
    if (!day) return null
    if (day.weightAM !== null && day.weightAM !== undefined) return day.weightAM
    if (day.weightPM !== null && day.weightPM !== undefined) return day.weightPM
    return null
  },

  _fmtW: function(w, unit) {
    if (w === null || w === undefined) return '—'
    return unit === '斤' ? (w * 2).toFixed(1) : w.toFixed(1)
  },

  _formatDate: function(dateStr) {
    if (!dateStr) return '—'
    var d = new Date(dateStr)
    return (d.getMonth() + 1) + '/' + d.getDate()
  },

  _isPeriodDay: function(state, dateStr) {
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

  _getStage: function(week, totalDays) {
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
    this._autoSaveReview(weekIdx, value)
  },

  saveReview: function(e) {
    var weekIdx = parseInt(e.currentTarget.dataset.week)
    var value = this.data.weekList[weekIdx].review
    this._autoSaveReview(weekIdx, value)
    wx.showToast({ title: '已保存', icon: 'success', duration: 1000 })
  },

  _autoSaveReview: function(weekIdx, value) {
    if (this._reviewSaveTimer) clearTimeout(this._reviewSaveTimer)
    var self = this
    this._reviewSaveTimer = setTimeout(function() {
      var state = store.loadState(app.globalData.userKey)
      if (!state) return
      if (!state.weeklyReview) state.weeklyReview = []
      if (!state.weeklyReview[weekIdx]) state.weeklyReview[weekIdx] = { week: weekIdx + 1, review: '' }
      state.weeklyReview[weekIdx].review = value
      store.saveState(app.globalData.userKey, state)
    }, 400)
  },

  exportReviewImage: function () {
    var self = this
    var list = this.data.weekList
    if (!list.length) {
      wx.showToast({ title: '暂无复盘数据', icon: 'none' })
      return
    }

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
  },

  // =========================================
  // Tab 4: 经期日历 (from calendar.js)
  // =========================================

  renderCalendar: function () {
    var self = this
    var state = app.globalData.state

    if (!state) {
      store.loadState(app.globalData.userKey, function (data) {
        if (data) {
          app.globalData.state = data
          self._doRenderCalendar(data)
        }
      })
    } else {
      self._doRenderCalendar(state)
    }
  },

  _doRenderCalendar: function (state) {
    if (!state) return

    var year = this.data.calYear || new Date().getFullYear()
    var month = this.data.calMonth !== undefined ? this.data.calMonth : new Date().getMonth()
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
    var periodSet = this._buildPeriodDateSet(periods)

    // 经期开始日期集合（用于预测）
    var periodStartDates = []
    for (var j = 0; j < periods.length; j++) {
      periodStartDates.push(periods[j].start)
    }
    periodStartDates.sort()

    // 经期预测：根据历史经期周期预测下个月
    var predictSet = this._predictPeriods(periodStartDates, year, month)

    // 排卵日预测：经期开始后第14天
    var ovulationSet = this._predictOvulation(periodStartDates)

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
      calYear: year,
      calMonth: month,
      calDays: calDays,
      isFemale: isFemale,
      unitLabel: unitLabel
    })
  },

  onPrevMonth: function () {
    var y = this.data.calYear
    var m = this.data.calMonth - 1
    if (m < 0) { m = 11; y-- }
    this.setData({ calYear: y, calMonth: m })
    this._doRenderCalendar(app.globalData.state)
  },

  onNextMonth: function () {
    var y = this.data.calYear
    var m = this.data.calMonth + 1
    if (m > 11) { m = 0; y++ }
    this.setData({ calYear: y, calMonth: m })
    this._doRenderCalendar(app.globalData.state)
  },

  _isDateInPeriods: function (dateStr, periods) {
    for (var i = 0; i < periods.length; i++) {
      var p = periods[i]
      if (!p.start) continue
      var end = (p.end === null || p.end === undefined) ? p.start : p.end
      if (dateStr >= p.start && dateStr <= end) {
        return true
      }
    }
    return false
  },

  _buildPeriodDateSet: function (periods) {
    var set = {}
    for (var i = 0; i < periods.length; i++) {
      var p = periods[i]
      if (!p.start) continue
      var end = (p.end === null || p.end === undefined) ? p.start : p.end
      var start = new Date(p.start)
      var endD = new Date(end)
      var cur = new Date(start)
      while (cur <= endD) {
        var ds = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0')
        set[ds] = true
        cur.setDate(cur.getDate() + 1)
      }
    }
    return set
  },

  _predictPeriods: function (periodStartDates, year, month) {
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

  _predictOvulation: function (periodStartDates) {
    var ovulationSet = {}
    for (var i = 0; i < periodStartDates.length; i++) {
      var periodStart = new Date(periodStartDates[i])
      var ovulationDate = new Date(periodStart.getTime() + 14 * 24 * 60 * 60 * 1000)
      var ds = ovulationDate.getFullYear() + '-' + String(ovulationDate.getMonth() + 1).padStart(2, '0') + '-' + String(ovulationDate.getDate()).padStart(2, '0')
      ovulationSet[ds] = true
    }
    return ovulationSet
  },

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
    var isPeriodDay = this._isDateInPeriods(dateStr, periods)
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

  onTogglePeriod: function () {
    var dateStr = this.data.selectedDate
    var state = app.globalData.state
    var periods = state.periods || []

    var foundIdx = -1
    for (var i = 0; i < periods.length; i++) {
      var p = periods[i]
      if (!p.start) continue
      var end = (p.end === null || p.end === undefined) ? p.start : p.end
      if (dateStr >= p.start && dateStr <= end) {
        foundIdx = i
        break
      }
    }

    if (foundIdx !== -1) {
      periods.splice(foundIdx, 1)
      this.setData({ isPeriodDay: false })
    } else {
      periods.push({ start: dateStr, end: dateStr })
      periods.sort(function (a, b) {
        return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
      })
      this.setData({ isPeriodDay: true })
    }

    state.periods = periods
    app.globalData.state = state
    store.saveState(app.globalData.userKey, state)
    this._doRenderCalendar(state)

    wx.showToast({ title: '已更新', icon: 'success' })
  },

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
    this._doRenderCalendar(state)

    wx.showToast({ title: '已更新', icon: 'success' })
  },
})
