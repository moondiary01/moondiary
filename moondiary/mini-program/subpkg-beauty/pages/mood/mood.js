var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')
var moodEmojiData = require('../../data/mood-emojis.js')

Page({
Page({
  data: {
    todayStr: '',
    currentStatus: '',
    selectedMood: '',
    moodDiary: '',
    todayRecord: null,
    moodData: null,
    canUseUpgrade: false,
    // 心情表情 (35种 SVG)
    moodEmojis: moodEmojiData.moodEmojis,
    // 自律打卡 (19项，纯文字，与HTML版一致)
    disciplineItems: [
      { key: 'disc_earlyRise', label: '早起' },
      { key: 'disc_water', label: '喝水' },
      { key: 'disc_meditation', label: '冥想' },
      { key: 'disc_podcast', label: '听播客' },
      { key: 'disc_read', label: '阅读' },
      { key: 'disc_news', label: '今日新闻' },
      { key: 'disc_study', label: '学习打卡' },
      { key: 'disc_newSkill', label: '学习新技能' },
      { key: 'disc_english', label: '学英语' },
      { key: 'disc_journal', label: '写日记' },
      { key: 'disc_gratitude', label: '感恩日记' },
      { key: 'disc_plan', label: '写今日规划' },
      { key: 'disc_cook', label: '做饭' },
      { key: 'disc_cleanRoom', label: '打扫房间' },
      { key: 'disc_exercise', label: '运动' },
      { key: 'disc_declutter', label: '断舍离' },
      { key: 'disc_lessScreen', label: '少玩电子产品' },
      { key: 'disc_skincare', label: '护肤' },
      { key: 'disc_earlySleep', label: '早睡' }
    ],
    // 自定义打卡
    moodCustomCheck: '',
    // 冥想音乐
    // 照片
    photos: [],
    // 感恩日记
    gratitude1: '',
    gratitude2: '',
    gratitude3: '',
    // 日历
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    calDays: [],
    showDayDetail: false,
    detailDate: '',
    detailMoodSvg: '',
    detailMoodLabel: '',
    detailStatus: '',
    detailDiary: '',
    detailDiscipline: [],
    detailGratitude: [],
    detailPhotos: []
  },

  onLoad: function () {
    audio.playEnter()
    var now = new Date()
    var today = beautyStore.localDateStr(now)
    var weekDay = ['日','一','二','三','四','五','六'][now.getDay()]
    this.setData({
      todayStr: now.getMonth() + 1 + '月' + now.getDate() + '日 周' + weekDay,
      canUseUpgrade: app.globalData.canUseUpgrade || false,
      calYear: now.getFullYear(),
      calMonth: now.getMonth()
    })
    this.loadData()
  },

  onShow: function () {
    this.setData({ canUseUpgrade: app.globalData.canUseUpgrade || false })
  },

  // ===== 数据加载 =====
  loadData: function () {
    var self = this
    var userKey = app.globalData.userKey
    beautyStore.loadMood(userKey, function (data) {
      if (!data) {
        data = { version: 1, dailyRecords: [] }
      }
      if (!data.dailyRecords) data.dailyRecords = []

      var today = beautyStore.localDateStr(new Date())
      var record = null
      for (var i = 0; i < data.dailyRecords.length; i++) {
        if (data.dailyRecords[i].date === today) {
          record = data.dailyRecords[i]
          break
        }
      }
      if (!record) {
        record = self.createEmptyRecord(today)
      }
      self.setData({
        moodData: data,
        todayRecord: record,
        currentStatus: record.status || '',
        selectedMood: record.mood || '',
        moodDiary: record.diary || '',
        photos: record.photos || [],
        gratitude1: (record.gratitude && record.gratitude[0]) || '',
        gratitude2: (record.gratitude && record.gratitude[1]) || '',
        gratitude3: (record.gratitude && record.gratitude[2]) || '',
        moodCustomCheck: record.customCheck || ''
      })
      self.renderCalendar()
    })
  },

  createEmptyRecord: function (date) {
    return {
      date: date,
      status: '',
      mood: '',
      diary: '',
      meditation: false,
      meditationMinutes: 0,
      discipline: {},
      photos: [],
      gratitude: ['', '', '']
    }
  },

  // ===== 当前状态 =====
  onStatusInput: function (e) {
    this.setData({ currentStatus: e.detail.value })
  },

  // ===== 心情选择 =====
  onMoodSelect: function (e) {
    audio.playClick()
    this.setData({ selectedMood: e.currentTarget.dataset.key })
  },

  // ===== 心情日记输入 =====
  onDiaryInput: function (e) {
    this.setData({ moodDiary: e.detail.value })
  },

  // ===== 感恩日记输入 =====
  onGratitude1Input: function (e) { this.setData({ gratitude1: e.detail.value }) },
  onGratitude2Input: function (e) { this.setData({ gratitude2: e.detail.value }) },
  onGratitude3Input: function (e) { this.setData({ gratitude3: e.detail.value }) },

  // ===== 自律打卡切换 =====
  onDisciplineToggle: function (e) {
    audio.playClick()
    var key = e.currentTarget.dataset.key
    var record = this.data.todayRecord
    if (!record.discipline) record.discipline = {}
    record.discipline[key] = !record.discipline[key]
    this.setData({ todayRecord: record })
  },

  // ===== 自定义打卡输入 =====
  onCustomCheckInput: function (e) {
    this.setData({ moodCustomCheck: e.detail.value })
  },

  // ===== 冥想打卡 =====
  onMeditationToggle: function (e) {
    audio.playClick()
    var record = this.data.todayRecord
    record.meditation = !record.meditation
    if (record.meditation && !record.meditationMinutes) {
      record.meditationMinutes = 15
    }
    this.setData({ todayRecord: record })
  },

  onMeditationMinutesChange: function (e) {
    var record = this.data.todayRecord
    record.meditationMinutes = parseInt(e.detail.value) || 0
    this.setData({ todayRecord: record })
  },

  // ===== 照片上传 =====
  onAddPhoto: function () {
    audio.playClick()
    var self = this
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var photos = self.data.photos.slice()
        for (var i = 0; i < res.tempFiles.length; i++) {
          photos.push(res.tempFiles[i].tempFilePath)
        }
        self.setData({ photos: photos })
      }
    })
  },

  onDeletePhoto: function (e) {
    audio.playClick()
    var idx = e.currentTarget.dataset.index
    var photos = this.data.photos.slice()
    photos.splice(idx, 1)
    this.setData({ photos: photos })
  },

  onPreviewPhoto: function (e) {
    var idx = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.photos[idx],
      urls: this.data.photos
    })
  },

  // ===== 保存 =====
  onSave: function () {
    var self = this
    var data = this.data.moodData
    var record = this.data.todayRecord

    record.status = this.data.currentStatus
    record.mood = this.data.selectedMood
    record.diary = this.data.moodDiary
    record.photos = this.data.photos
    record.gratitude = [this.data.gratitude1, this.data.gratitude2, this.data.gratitude3]
    record.customCheck = this.data.moodCustomCheck
    record.updatedAt = Date.now()

    var found = false
    var now = Date.now()
    for (var i = 0; i < data.dailyRecords.length; i++) {
      if (data.dailyRecords[i].date === record.date) {
        record.createdAt = data.dailyRecords[i].createdAt || now
        data.dailyRecords[i] = record
        found = true
        break
      }
    }
    if (!found) {
      record.createdAt = now
      data.dailyRecords.push(record)
    }

    beautyStore.saveMood(app.globalData.userKey, data, function (success) {
      if (success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        self.renderCalendar()
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  },

  // ===== 日历渲染 =====
  renderCalendar: function () {
    var data = this.data.moodData
    var records = (data && data.dailyRecords) ? data.dailyRecords : []
    var recordMap = {}
    records.forEach(function(r) { recordMap[r.date] = r })

    // 从 moodEmojiData 构建 key->svg 和 key->label 映射
    var moodSvgMap = {}
    var moodLabelMap = {}
    moodEmojiData.moodEmojis.forEach(function(m) {
      moodSvgMap[m.key] = m.svg
      moodLabelMap[m.key] = m.label
    })

    function hasRecord(rec) {
      return rec && (rec.status || rec.mood || rec.diary || rec.photos.length > 0 ||
        (rec.discipline && Object.values(rec.discipline).some(function(v) { return v })) ||
        (rec.gratitude && rec.gratitude.some(function(g) { return g && g.trim() })))
    }

    var year = this.data.calYear
    var month = this.data.calMonth
    var todayStr = beautyStore.localDateStr(new Date())

    var firstDay = new Date(year, month, 1).getDay()
    var daysInMonth = new Date(year, month + 1, 0).getDate()

    var days = []
    for (var i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: 'e' + i })
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      var rec = recordMap[ds] || null
      var hasData = hasRecord(rec)
      var hasPhoto = rec && rec.photos && rec.photos.length > 0
      var hasGrat = rec && rec.gratitude && rec.gratitude.some(function(g) { return g && g.trim() })
      days.push({
        empty: false,
        key: 'd' + d,
        day: d,
        dateStr: ds,
        today: ds === todayStr,
        hasRecord: hasData,
        hasPhoto: hasPhoto,
        hasMood: rec && rec.mood && moodSvgMap[rec.mood],
        moodSvg: rec && rec.mood ? moodSvgMap[rec.mood] : '',
        hasGratitude: hasGrat
      })
    }
    this.setData({ calDays: days })
  },

  onPrevMonth: function () {
    audio.playClick()
    var month = this.data.calMonth - 1
    var year = this.data.calYear
    if (month < 0) { month = 11; year-- }
    this.setData({ calMonth: month, calYear: year })
    this.renderCalendar()
  },

  onNextMonth: function () {
    audio.playClick()
    var month = this.data.calMonth + 1
    var year = this.data.calYear
    if (month > 11) { month = 0; year++ }
    this.setData({ calMonth: month, calYear: year })
    this.renderCalendar()
  },

  onCalDayClick: function (e) {
    audio.playClick()
    var dateStr = e.currentTarget.dataset.date
    var record = null
    var data = this.data.moodData
    if (data && data.dailyRecords) {
      for (var i = 0; i < data.dailyRecords.length; i++) {
        if (data.dailyRecords[i].date === dateStr) {
          record = data.dailyRecords[i]
          break
        }
      }
    }

    // 从 moodEmojiData 构建映射
    var moodSvgMap = {}
    var moodLabelMap = {}
    moodEmojiData.moodEmojis.forEach(function(m) {
      moodSvgMap[m.key] = m.svg
      moodLabelMap[m.key] = m.label
    })

    // 自律打卡标签（纯文字，无emoji）
    var discLabels = {
      disc_earlyRise: '早起', disc_water: '喝水', disc_meditation: '冥想',
      disc_podcast: '听播客', disc_read: '阅读', disc_news: '今日新闻',
      disc_study: '学习打卡', disc_newSkill: '学习新技能', disc_english: '学英语',
      disc_journal: '写日记', disc_gratitude: '感恩日记', disc_plan: '写今日规划',
      disc_cook: '做饭', disc_cleanRoom: '打扫房间', disc_exercise: '运动',
      disc_declutter: '断舍离', disc_lessScreen: '少玩电子产品',
      disc_skincare: '护肤', disc_earlySleep: '早睡'
    }

    var discActive = []
    if (record && record.discipline) {
      Object.keys(record.discipline).forEach(function(k) {
        if (record.discipline[k] && discLabels[k]) discActive.push(discLabels[k])
      })
    }

    var gratitudeItems = []
    if (record && record.gratitude) {
      record.gratitude.forEach(function(g) { if (g && g.trim()) gratitudeItems.push(g) })
    }

    this.setData({
      showDayDetail: true,
      detailDate: dateStr,
      detailMoodSvg: record && record.mood ? moodSvgMap[record.mood] || '' : '',
      detailMoodLabel: record && record.mood ? moodLabelMap[record.mood] || '' : '',
      detailStatus: record ? (record.status || '') : '',
      detailDiary: record ? (record.diary || '') : '',
      detailDiscipline: discActive,
      detailGratitude: gratitudeItems,
      detailPhotos: record && record.photos ? record.photos : []
    })
  },

  onCloseDetail: function () {
    this.setData({ showDayDetail: false })
  },

  onPreviewDetailPhoto: function (e) {
    var idx = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.detailPhotos[idx],
      urls: this.data.detailPhotos
    })
  },

  // ===== 返回 =====
  onGoBack: function () {
    audio.playBack()
    wx.navigateBack()
  }
})
