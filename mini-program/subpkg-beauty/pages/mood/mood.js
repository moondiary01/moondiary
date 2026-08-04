var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

// 冥想音乐数据（8大类共50首）
var meditationMusic = [
  // 自然之声 (6首)
  { id: 'n1', category: 'nature', title: '晨曦微露', duration: '15:00' },
  { id: 'n2', category: 'nature', title: '林间漫步', duration: '20:00' },
  { id: 'n3', category: 'nature', title: '草原之风', duration: '18:00' },
  { id: 'n4', category: 'nature', title: '山间清泉', duration: '15:00' },
  { id: 'n5', category: 'nature', title: '夏日虫鸣', duration: '22:00' },
  { id: 'n6', category: 'nature', title: '冬日寂静', duration: '20:00' },
  // 雨声 (6首)
  { id: 'r1', category: 'rain', title: '轻柔细雨', duration: '30:00' },
  { id: 'r2', category: 'rain', title: '雨打芭蕉', duration: '25:00' },
  { id: 'r3', category: 'rain', title: '暴雨雷鸣', duration: '20:00' },
  { id: 'r4', category: 'rain', title: '雨后初晴', duration: '18:00' },
  { id: 'r5', category: 'rain', title: '窗台雨滴', duration: '30:00' },
  { id: 'r6', category: 'rain', title: '夜雨绵绵', duration: '25:00' },
  // 海洋之声 (6首)
  { id: 'o1', category: 'ocean', title: '海浪轻拍', duration: '30:00' },
  { id: 'o2', category: 'ocean', title: '潮起潮落', duration: '25:00' },
  { id: 'o3', category: 'ocean', title: '深海低吟', duration: '20:00' },
  { id: 'o4', category: 'ocean', title: '海滩日出', duration: '18:00' },
  { id: 'o5', category: 'ocean', title: '鲸鱼之歌', duration: '22:00' },
  { id: 'o6', category: 'ocean', title: '海风拂面', duration: '20:00' },
  // 森林之声 (6首)
  { id: 'f1', category: 'forest', title: '竹林深处', duration: '20:00' },
  { id: 'f2', category: 'forest', title: '松涛阵阵', duration: '18:00' },
  { id: 'f3', category: 'forest', title: '鸟语花香', duration: '15:00' },
  { id: 'f4', category: 'forest', title: '溪流潺潺', duration: '25:00' },
  { id: 'f5', category: 'forest', title: '雨林秘境', duration: '22:00' },
  { id: 'f6', category: 'forest', title: '森林晨雾', duration: '20:00' },
  // 宇宙冥想 (6首)
  { id: 's1', category: 'space', title: '星际之旅', duration: '30:00' },
  { id: 's2', category: 'space', title: '宇宙回响', duration: '25:00' },
  { id: 's3', category: 'space', title: '星云漫步', duration: '20:00' },
  { id: 's4', category: 'space', title: '银河冥想', duration: '30:00' },
  { id: 's5', category: 'space', title: '太空漂浮', duration: '25:00' },
  { id: 's6', category: 'space', title: '星辰大海', duration: '22:00' },
  // 禅修冥想 (6首)
  { id: 'z1', category: 'zen', title: '禅茶一味', duration: '20:00' },
  { id: 'z2', category: 'zen', title: '空山新雨', duration: '25:00' },
  { id: 'z3', category: 'zen', title: '心若止水', duration: '30:00' },
  { id: 'z4', category: 'zen', title: '一花一世界', duration: '20:00' },
  { id: 'z5', category: 'zen', title: '无为而治', duration: '25:00' },
  { id: 'z6', category: 'zen', title: '静坐观心', duration: '30:00' },
  // 钢琴轻音 (7首)
  { id: 'p1', category: 'piano', title: '月光奏鸣曲', duration: '15:00' },
  { id: 'p2', category: 'piano', title: '梦中的婚礼', duration: '12:00' },
  { id: 'p3', category: 'piano', title: '初雪', duration: '15:00' },
  { id: 'p4', category: 'piano', title: '雨中漫步', duration: '18:00' },
  { id: 'p5', category: 'piano', title: '星空', duration: '20:00' },
  { id: 'p6', category: 'piano', title: '秋日私语', duration: '15:00' },
  { id: 'p7', category: 'piano', title: '安静的白', duration: '18:00' },
  // 颂钵音疗 (7首)
  { id: 'b1', category: 'bowl', title: '喜马拉雅颂钵', duration: '30:00' },
  { id: 'b2', category: 'bowl', title: '水晶钵共鸣', duration: '25:00' },
  { id: 'b3', category: 'bowl', title: '七脉轮调和', duration: '35:00' },
  { id: 'b4', category: 'bowl', title: '深沉疗愈', duration: '30:00' },
  { id: 'b5', category: 'bowl', title: '净化之声', duration: '25:00' },
  { id: 'b6', category: 'bowl', title: '宇宙频率', duration: '30:00' },
  { id: 'b7', category: 'bowl', title: '回归本心', duration: '28:00' }
]

var musicCategories = [
  { value: 'nature', label: '自然之声', icon: '🌿' },
  { value: 'rain', label: '雨声', icon: '🌧️' },
  { value: 'ocean', label: '海洋之声', icon: '🌊' },
  { value: 'forest', label: '森林之声', icon: '🌳' },
  { value: 'space', label: '宇宙冥想', icon: '🌌' },
  { value: 'zen', label: '禅修冥想', icon: '🧘' },
  { value: 'piano', label: '钢琴轻音', icon: '🎹' },
  { value: 'bowl', label: '颂钵音疗', icon: '🔔' }
]

Page({
  data: {
    todayStr: '',
    currentStatus: '',
    selectedMood: '',
    moodDiary: '',
    todayRecord: null,
    moodData: null,
    canUseUpgrade: false,
    // 心情表情
    moodEmojis: [
      { value: 'ecstatic', emoji: '🥰', label: '幸福' },
      { value: 'happy', emoji: '😊', label: '开心' },
      { value: 'calm', emoji: '😌', label: '平静' },
      { value: 'grateful', emoji: '🙏', label: '感恩' },
      { value: 'neutral', emoji: '😐', label: '一般' },
      { value: 'tired', emoji: '😪', label: '疲惫' },
      { value: 'anxious', emoji: '😰', label: '焦虑' },
      { value: 'sad', emoji: '😢', label: '难过' },
      { value: 'angry', emoji: '😤', label: '生气' },
      { value: 'stressed', emoji: '🤯', label: '压力' }
    ],
    // 自律打卡
    disciplineItems: [
      { key: 'tidyRoom', label: '收拾房间', icon: '🧹' },
      { key: 'declutter', label: '断舍离', icon: '📦' },
      { key: 'read', label: '阅读', icon: '📖' },
      { key: 'exercise', label: '运动', icon: '🏃' },
      { key: 'cook', label: '做饭', icon: '🍳' },
      { key: 'noPhone', label: '减少手机', icon: '📵' },
      { key: 'earlySleep', label: '早睡', icon: '🛏️' },
      { key: 'gratitude', label: '感恩记录', icon: '✨' },
      { key: 'meditation', label: '冥想', icon: '🧘' },
      { key: 'skincare', label: '护肤', icon: '💄' },
      { key: 'water', label: '喝水', icon: '💧' },
      { key: 'journal', label: '写日记', icon: '✏️' }
    ],
    // 冥想音乐
    musicCategories: musicCategories,
    meditationMusic: meditationMusic,
    currentCategory: 'nature',
    filteredMusic: [],
    // 播放器
    isPlaying: false,
    currentTrack: null,
    currentTrackIndex: -1,
    showPlayer: false,
    // 照片
    photos: [],
    // 感恩日记
    gratitude1: '',
    gratitude2: '',
    gratitude3: ''
  },

  onLoad: function () {
    audio.playEnter()
    var now = new Date()
    var today = beautyStore.localDateStr(now)
    var weekDay = ['日','一','二','三','四','五','六'][now.getDay()]
    this.setData({
      todayStr: now.getMonth() + 1 + '月' + now.getDate() + '日 周' + weekDay,
      canUseUpgrade: app.globalData.canUseUpgrade || false
    })
    this.filterMusic('nature')
    this.loadData()
  },

  onShow: function () {
    this.setData({ canUseUpgrade: app.globalData.canUseUpgrade || false })
  },

  onHide: function () {
    this.stopMusic()
  },

  onUnload: function () {
    this.stopMusic()
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
        gratitude3: (record.gratitude && record.gratitude[2]) || ''
      })
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
    this.setData({ selectedMood: e.currentTarget.dataset.value })
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

  // ===== 音乐分类切换 =====
  onCategorySelect: function (e) {
    audio.playClick()
    var cat = e.currentTarget.dataset.value
    this.setData({ currentCategory: cat })
    this.filterMusic(cat)
  },

  filterMusic: function (category) {
    var list = []
    for (var i = 0; i < meditationMusic.length; i++) {
      if (meditationMusic[i].category === category) {
        list.push(meditationMusic[i])
      }
    }
    this.setData({ filteredMusic: list })
  },

  // ===== 音乐播放 =====
  onPlayTrack: function (e) {
    audio.playClick()
    var trackId = e.currentTarget.dataset.id
    var track = null
    var index = -1
    for (var i = 0; i < meditationMusic.length; i++) {
      if (meditationMusic[i].id === trackId) {
        track = meditationMusic[i]
        index = i
        break
      }
    }
    if (!track) return

    // 如果正在播放同一首，则暂停
    if (this.data.currentTrack && this.data.currentTrack.id === trackId && this.data.isPlaying) {
      this.pauseMusic()
      return
    }

    this.playMusic(track, index)
  },

  playMusic: function (track, index) {
    var self = this
    // 停止之前的播放
    if (this._audioCtx) {
      try { this._audioCtx.stop() } catch (e) {}
      this._audioCtx.destroy()
      this._audioCtx = null
    }

    var ctx = wx.createInnerAudioContext()
    // 音频URL - 使用 COS 路径
    var config = require('../../../utils/config.js')
    var cosBaseUrl = 'https://' + config.COS_CONFIG.Bucket + '.cos.' + config.COS_CONFIG.Region + '.myqcloud.com'
    ctx.src = cosBaseUrl + '/beauty/music/' + track.id + '.mp3'
    ctx.title = track.title
    ctx.coverImgUrl = cosBaseUrl + '/beauty/music/cover.jpg'
    ctx.volume = 0.6

    ctx.onPlay(function () {
      self.setData({ isPlaying: true })
    })
    ctx.onPause(function () {
      self.setData({ isPlaying: false })
    })
    ctx.onEnded(function () {
      self.setData({ isPlaying: false })
      // 自动播放下一首
      self.playNext()
    })
    ctx.onError(function () {
      self.setData({ isPlaying: false })
      wx.showToast({ title: '音频加载中，请稍后', icon: 'none', duration: 1500 })
    })

    this._audioCtx = ctx
    ctx.play()
    this.setData({
      currentTrack: track,
      currentTrackIndex: index,
      showPlayer: true,
      isPlaying: true
    })
  },

  pauseMusic: function () {
    if (this._audioCtx) {
      try { this._audioCtx.pause() } catch (e) {}
    }
    this.setData({ isPlaying: false })
  },

  resumeMusic: function () {
    if (this._audioCtx) {
      try { this._audioCtx.play() } catch (e) {}
      this.setData({ isPlaying: true })
    }
  },

  playNext: function () {
    var idx = this.data.currentTrackIndex
    var next = idx + 1
    if (next >= meditationMusic.length) next = 0
    this.playMusic(meditationMusic[next], next)
  },

  playPrev: function () {
    var idx = this.data.currentTrackIndex
    var prev = idx - 1
    if (prev < 0) prev = meditationMusic.length - 1
    this.playMusic(meditationMusic[prev], prev)
  },

  onPlayerToggle: function () {
    audio.playClick()
    if (this.data.isPlaying) {
      this.pauseMusic()
    } else {
      this.resumeMusic()
    }
  },

  onPlayerNext: function () {
    audio.playClick()
    this.playNext()
  },

  onPlayerPrev: function () {
    audio.playClick()
    this.playPrev()
  },

  onClosePlayer: function () {
    audio.playClick()
    this.stopMusic()
    this.setData({ showPlayer: false })
  },

  stopMusic: function () {
    if (this._audioCtx) {
      try { this._audioCtx.stop() } catch (e) {}
      this._audioCtx.destroy()
      this._audioCtx = null
    }
    this.setData({ isPlaying: false })
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
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  },

  // ===== 返回 =====
  onGoBack: function () {
    audio.playBack()
    wx.navigateBack()
  }
})
