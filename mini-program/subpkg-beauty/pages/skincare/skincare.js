var app = getApp()
var beautyStore = require('../../../utils/beauty-store.js')
var audio = require('../../../utils/audio.js')

Page({
  data: {
    todayStr: '',
    todayDateTime: '',
    canUseUpgrade: false,
    skinData: null,
    todayRecord: null,
    // 打卡周期
    startDate: '',
    endDate: '',
    currentDay: 1,
    totalDays: 100,
    // 皮肤状态
    skinType: '',
    skinTypeLabel: '未设置',
    skinTypeOptions: [
      { value: 'dry', label: '干性' },
      { value: 'oily', label: '油性' },
      { value: 'combination', label: '混合' },
      { value: 'sensitive', label: '敏感' }
    ],
    // checkbox 打勾项（美容院护理 + do脸日记）
    checkItems: [
      { key: 'salon', label: '美容院护理', icon: '💆' },
      { key: 'cosmetic', label: 'do脸日记', icon: '💉' }
    ],
    // 护理项目多选（面部护理排在最前面）
    bodyCareOptions: [
      { key: 'faceCare', label: '面部护理' },
      { key: 'oralCare', label: '口腔护理' },
      { key: 'neckCare', label: '颈部护理' },
      { key: 'bodyCare', label: '身体护理' },
      { key: 'handCare', label: '手部护理' },
      { key: 'footCare', label: '脚部护理' }
    ],
    bodyCareSelected: [],
    // 顶部摘要：已选打卡项标签列表
    topSummaryTags: [],
    // 日历
    calYear: 0,
    calMonth: 0,
    calDays: [],
    // 日历弹窗
    showDayDetail: false,
    detailDate: '',
    detailRecord: null,
    detailNote: '',
    detailPhoto: '',
    detailSalonNote: '',
    detailCosmeticNote: '',
    isToday: false,
    // 查看照片大图
    showPhotoView: false,
    // 日期选择器
    showStartDatePicker: false,
    showEndDatePicker: false,
    // 自动保存防抖
    _saveTimer: null
  },

  onLoad: function () {
    audio.playEnter()
    var now = new Date()
    var weekDay = ['日','一','二','三','四','五','六'][now.getDay()]
    var h = String(now.getHours()).padStart(2, '0')
    var m = String(now.getMinutes()).padStart(2, '0')
    this.setData({
      todayStr: now.getMonth() + 1 + '月' + now.getDate() + '日 周' + weekDay,
      todayDateTime: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + h + ':' + m,
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
    beautyStore.loadSkincare(userKey, function (data) {
      if (!data) {
        var today = beautyStore.localDateStr(new Date())
        var endD = new Date()
        endD.setDate(endD.getDate() + 99)
        data = { version: 2, startDate: today, endDate: beautyStore.localDateStr(endD), skinProfile: {}, dailyRecords: [] }
      }
      if (!data.dailyRecords) data.dailyRecords = []
      if (!data.startDate) data.startDate = beautyStore.localDateStr(new Date())
      if (!data.endDate) {
        var endD2 = new Date(data.startDate)
        endD2.setDate(endD2.getDate() + 99)
        data.endDate = beautyStore.localDateStr(endD2)
      }

      var todayStr = beautyStore.localDateStr(new Date())
      var startTs = new Date(data.startDate).getTime()
      var nowTs = new Date(todayStr).getTime()
      var endTs = new Date(data.endDate).getTime()
      var dayDiff = Math.floor((nowTs - startTs) / 86400000) + 1
      if (dayDiff < 1) dayDiff = 1
      var total = Math.floor((endTs - startTs) / 86400000) + 1
      if (total < 1) total = 100
      if (dayDiff > total) dayDiff = total

      var record = null
      for (var i = 0; i < data.dailyRecords.length; i++) {
        if (data.dailyRecords[i].date === todayStr) {
          record = data.dailyRecords[i]
          break
        }
      }
      if (!record) {
        record = self.createEmptyRecord(todayStr)
      }

      // 计算 skinTypeLabel
      var skinType = (data.skinProfile && data.skinProfile.type) || ''
      var skinTypeLabel = '未设置'
      var options = self.data.skinTypeOptions
      for (var j = 0; j < options.length; j++) {
        if (options[j].value === skinType) {
          skinTypeLabel = options[j].label
          break
        }
      }

      self.setData({
        skinData: data,
        todayRecord: record,
        skinType: skinType,
        skinTypeLabel: skinTypeLabel,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: total,
        currentDay: dayDiff,
        bodyCareSelected: record.bodyCare || []
      })
      self.updateTopSummary()
      self.renderCalendar()
    })
  },

  createEmptyRecord: function (date) {
    return {
      date: date,
      morningSkincare: false,
      nightSkincare: false,
      bodyCare: [],
      salon: false, salonNote: '',
      cosmetic: false, cosmeticNote: '',
      note: '',
      photo: ''
    }
  },

  // ===== 顶部摘要：计算已选项目标签 =====
  updateTopSummary: function () {
    var record = this.data.todayRecord
    if (!record) {
      this.setData({ topSummaryTags: [] })
      return
    }
    var tags = []
    // 打卡项
    var checkItems = this.data.checkItems
    for (var i = 0; i < checkItems.length; i++) {
      if (record[checkItems[i].key]) {
        tags.push({ label: checkItems[i].icon + ' ' + checkItems[i].label, type: 'check' })
      }
    }
    // 身体护理
    var bodyCareOptions = this.data.bodyCareOptions
    var bodyCare = record.bodyCare || []
    for (var j = 0; j < bodyCareOptions.length; j++) {
      if (bodyCare.indexOf(bodyCareOptions[j].key) > -1) {
        tags.push({ label: bodyCareOptions[j].label, type: 'body' })
      }
    }
    this.setData({ topSummaryTags: tags })
  },

  // ===== 皮肤状态修改 =====
  onSkinTypeChange: function () {
    var self = this
    audio.playClick()
    var labels = this.data.skinTypeOptions.map(function (o) { return o.label })
    wx.showActionSheet({
      itemList: labels,
      success: function (res) {
        var selected = self.data.skinTypeOptions[res.tapIndex]
        self.setData({
          skinType: selected.value,
          skinTypeLabel: selected.label
        })
        self.autoSaveSkinProfile()
      }
    })
  },

  autoSaveSkinProfile: function () {
    var data = this.data.skinData
    if (!data) return
    data.skinProfile = {
      type: this.data.skinType,
      updatedAt: Date.now()
    }
    beautyStore.saveSkincare(app.globalData.userKey, data, function () {})
  },

  // ===== 修改起始/结束日期 =====
  onEditStartDate: function () {
    audio.playClick()
    this.setData({ showStartDatePicker: true })
  },

  onStartDateChange: function (e) {
    var date = e.detail.value
    var data = this.data.skinData
    data.startDate = date
    this.setData({ showStartDatePicker: false })
    this.recalcDays(data)
  },

  onEndDateChange: function (e) {
    var date = e.detail.value
    var data = this.data.skinData
    data.endDate = date
    this.setData({ showEndDatePicker: false })
    this.recalcDays(data)
  },

  onEditEndDate: function () {
    audio.playClick()
    this.setData({ showEndDatePicker: true })
  },

  onDatePickerCancel: function () {
    this.setData({ showStartDatePicker: false, showEndDatePicker: false })
  },

  recalcDays: function (data) {
    var startTs = new Date(data.startDate).getTime()
    var endTs = new Date(data.endDate).getTime()
    var todayStr = beautyStore.localDateStr(new Date())
    var nowTs = new Date(todayStr).getTime()
    var total = Math.floor((endTs - startTs) / 86400000) + 1
    if (total < 1) total = 100
    var dayDiff = Math.floor((nowTs - startTs) / 86400000) + 1
    if (dayDiff < 1) dayDiff = 1
    if (dayDiff > total) dayDiff = total
    this.setData({
      skinData: data,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: total,
      currentDay: dayDiff
    })
    beautyStore.saveSkincare(app.globalData.userKey, data, function () {})
  },

  // ===== checkbox 打勾切换（有/无 → 打勾） =====
  onToggleCheck: function (e) {
    audio.playClick()
    var field = e.currentTarget.dataset.field
    var record = this.data.todayRecord
    record[field] = !record[field]
    this.setData({ todayRecord: record })
    this.updateTopSummary()
    this.autoSave()
  },

  // ===== 身体护理多选（自动保存） =====
  onBodyCareToggle: function (e) {
    audio.playClick()
    var key = e.currentTarget.dataset.key
    var selected = this.data.bodyCareSelected.slice()
    var idx = selected.indexOf(key)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(key)
    }
    var record = this.data.todayRecord
    record.bodyCare = selected
    this.setData({ bodyCareSelected: selected, todayRecord: record })
    this.updateTopSummary()
    this.autoSave()
  },

  // ===== 文本输入（防抖自动保存） =====
  onTextInput: function (e) {
    var field = e.currentTarget.dataset.field
    var record = this.data.todayRecord
    record[field] = e.detail.value
    this.setData({ todayRecord: record })
    this.autoSave()
  },

  // ===== 自动保存到云端（防抖1.5秒） =====
  autoSave: function () {
    var self = this
    if (this.data._saveTimer) {
      clearTimeout(this.data._saveTimer)
    }
    var timer = setTimeout(function () {
      self.doAutoSave()
    }, 1500)
    this.data._saveTimer = timer
  },

  doAutoSave: function () {
    var self = this
    var data = this.data.skinData
    if (!data) return
    var record = this.data.todayRecord
    record.updatedAt = Date.now()

    data.skinProfile = {
      type: this.data.skinType,
      updatedAt: Date.now()
    }

    var found = false
    var now = Date.now()
    for (var i = 0; i < data.dailyRecords.length; i++) {
      if (data.dailyRecords[i].date === record.date) {
        record.createdAt = data.dailyRecords[i].createdAt || now
        // 保留日历中编辑过的字段
        record.photo = data.dailyRecords[i].photo || record.photo
        record.salonNote = data.dailyRecords[i].salonNote || record.salonNote
        record.cosmeticNote = data.dailyRecords[i].cosmeticNote || record.cosmeticNote
        data.dailyRecords[i] = record
        found = true
        break
      }
    }
    if (!found) {
      record.createdAt = now
      data.dailyRecords.push(record)
    }

    beautyStore.saveSkincare(app.globalData.userKey, data, function (success) {
      if (success) {
        self.setData({ skinData: data })
        self.renderCalendar()
      }
    })
  },

  // ===== 日历渲染 =====
  // 判断某天是否有打卡（晨间/晚间/美容院/do脸/护理项目 任一即可）
  isDayChecked: function (dayData) {
    if (!dayData) return false
    if (dayData.morningSkincare) return true
    if (dayData.nightSkincare) return true
    if (dayData.salon) return true
    if (dayData.cosmetic) return true
    if (dayData.bodyCare && dayData.bodyCare.length > 0) return true
    return false
  },

  renderCalendar: function () {
    var year = this.data.calYear
    var month = this.data.calMonth
    var firstDay = new Date(year, month, 1)
    var firstWeekday = firstDay.getDay()
    var daysInMonth = new Date(year, month + 1, 0).getDate()
    var todayStr = beautyStore.localDateStr(new Date())

    var dayMap = {}
    if (this.data.skinData && this.data.skinData.dailyRecords) {
      for (var i = 0; i < this.data.skinData.dailyRecords.length; i++) {
        dayMap[this.data.skinData.dailyRecords[i].date] = this.data.skinData.dailyRecords[i]
      }
    }

    var calDays = []
    for (var w = 0; w < firstWeekday; w++) {
      calDays.push({ key: 'e' + w, empty: true })
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
      var dayData = dayMap[dateStr]
      calDays.push({
        key: 'd' + d,
        empty: false,
        day: d,
        dateStr: dateStr,
        today: dateStr === todayStr,
        hasRecord: !!dayData && self.isDayChecked(dayData),
        hasPhoto: dayData && dayData.photo ? true : false
      })
    }
    this.setData({ calDays: calDays })
  },

  onPrevMonth: function () {
    audio.playClick()
    var m = this.data.calMonth - 1
    var y = this.data.calYear
    if (m < 0) { m = 11; y-- }
    this.setData({ calMonth: m, calYear: y })
    this.renderCalendar()
  },

  onNextMonth: function () {
    audio.playClick()
    var m = this.data.calMonth + 1
    var y = this.data.calYear
    if (m > 11) { m = 0; y++ }
    this.setData({ calMonth: m, calYear: y })
    this.renderCalendar()
  },

  // ===== 点击日历日期 =====
  onCalDayClick: function (e) {
    audio.playClick()
    var dateStr = e.currentTarget.dataset.date
    var record = null
    if (this.data.skinData && this.data.skinData.dailyRecords) {
      for (var i = 0; i < this.data.skinData.dailyRecords.length; i++) {
        if (this.data.skinData.dailyRecords[i].date === dateStr) {
          record = this.data.skinData.dailyRecords[i]
          break
        }
      }
    }
    if (!record) {
      record = this.createEmptyRecord(dateStr)
    }
    var todayStr = beautyStore.localDateStr(new Date())
    this.setData({
      showDayDetail: true,
      detailDate: dateStr,
      detailRecord: record,
      detailNote: record.note || '',
      detailPhoto: record.photo || '',
      detailSalonNote: record.salonNote || '',
      detailCosmeticNote: record.cosmeticNote || '',
      isToday: dateStr === todayStr
    })
  },

  onCloseDetail: function () {
    this.setData({ showDayDetail: false })
  },

  onDetailNoteInput: function (e) {
    this.setData({ detailNote: e.detail.value })
  },

  onDetailSalonNoteInput: function (e) {
    this.setData({ detailSalonNote: e.detail.value })
  },

  onDetailCosmeticNoteInput: function (e) {
    this.setData({ detailCosmeticNote: e.detail.value })
  },

  // ===== 照片上传（多策略：chooseMedia → chooseImage，base64存入JSON） =====
  onDetailUploadPhoto: function () {
    var self = this
    audio.playClick()

    // 策略1：wx.chooseMedia（新版基础库推荐）
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: function (res) {
          var tempPath = res.tempFiles && res.tempFiles[0] ? res.tempFiles[0].tempFilePath : ''
          if (!tempPath && res.tempFilePaths && res.tempFilePaths[0]) {
            tempPath = res.tempFilePaths[0]
          }
          if (!tempPath) {
            wx.showToast({ title: '获取照片失败', icon: 'none' })
            return
          }
          self.processPhoto(tempPath)
        },
        fail: function (err) {
          console.log('chooseMedia fail, trying chooseImage:', err)
          // 降级到 chooseImage
          self.fallbackChooseImage()
        }
      })
    } else {
      // 策略2：wx.chooseImage（旧版兼容）
      self.fallbackChooseImage()
    }
  },

  fallbackChooseImage: function () {
    var self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempPath = res.tempFilePaths && res.tempFilePaths[0]
        if (!tempPath) {
          wx.showToast({ title: '获取照片失败', icon: 'none' })
          return
        }
        self.processPhoto(tempPath)
      },
      fail: function (err) {
        console.log('chooseImage fail:', err)
        if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '选择照片失败', icon: 'none' })
        }
      }
    })
  },

  processPhoto: function (tempPath) {
    var self = this
    wx.showLoading({ title: '处理中...' })

    // 使用 wx.getFileSystemManager 读取文件为 base64
    var fsm = wx.getFileSystemManager()
    fsm.readFile({
      filePath: tempPath,
      encoding: 'base64',
      success: function (fileRes) {
        wx.hideLoading()
        // 检测图片类型
        var ext = 'jpeg'
        var lowerPath = tempPath.toLowerCase()
        if (lowerPath.indexOf('.png') > -1) ext = 'png'
        else if (lowerPath.indexOf('.gif') > -1) ext = 'gif'
        else if (lowerPath.indexOf('.webp') > -1) ext = 'webp'
        var base64Data = 'data:image/' + ext + ';base64,' + fileRes.data

        // 检查大小（base64 字符串长度，限制 1.5MB 避免 COS 超限）
        if (fileRes.data.length > 1.5 * 1024 * 1024) {
          wx.showToast({ title: '图片过大，请选小图或截图', icon: 'none', duration: 2500 })
          return
        }

        self.setData({ detailPhoto: base64Data })
        wx.showToast({ title: '照片已添加', icon: 'success' })
      },
      fail: function (err) {
        wx.hideLoading()
        console.log('[Photo] readFile fail:', err)

        // 降级方案1：使用 wx.getImageInfo 压缩后重试
        wx.getImageInfo({
          src: tempPath,
          success: function (info) {
            // 使用 canvas 压缩
            console.log('[Photo] 图片信息:', info)
            // 直接用临时路径（本地可见，不同步云端）
            self.setData({ detailPhoto: tempPath })
            wx.showToast({ title: '照片已添加(本地)', icon: 'none' })
          },
          fail: function () {
            // 降级方案2：直接用临时路径
            self.setData({ detailPhoto: tempPath })
            wx.showToast({ title: '照片已添加(本地)', icon: 'none' })
          }
        })
      }
    })
  },

  // ===== 查看照片大图 =====
  onViewPhoto: function () {
    audio.playClick()
    if (this.data.detailPhoto) {
      wx.previewImage({
        urls: [this.data.detailPhoto],
        current: this.data.detailPhoto
      })
    }
  },

  // ===== 弹窗内查看照片（overlay方式） =====
  onShowPhotoView: function () {
    audio.playClick()
    this.setData({ showPhotoView: true })
  },

  onClosePhotoView: function () {
    this.setData({ showPhotoView: false })
  },

  onDeleteDetailPhoto: function () {
    audio.playClick()
    var self = this
    wx.showModal({
      title: '提示',
      content: '确定删除这张照片吗？',
      success: function (res) {
        if (res.confirm) {
          self.setData({ detailPhoto: '' })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  onPreviewDetailPhoto: function () {
    if (this.data.detailPhoto) {
      wx.previewImage({ urls: [this.data.detailPhoto] })
    }
  },

  onSaveDetail: function () {
    var self = this
    var dateStr = this.data.detailDate
    var record = this.data.detailRecord
    record.note = this.data.detailNote
    record.photo = this.data.detailPhoto
    record.salonNote = this.data.detailSalonNote
    record.cosmeticNote = this.data.detailCosmeticNote
    record.updatedAt = Date.now()

    var data = this.data.skinData
    var found = false
    var now = Date.now()
    for (var i = 0; i < data.dailyRecords.length; i++) {
      if (data.dailyRecords[i].date === dateStr) {
        record.createdAt = data.dailyRecords[i].createdAt || now
        record.morningSkincare = data.dailyRecords[i].morningSkincare || record.morningSkincare
        record.nightSkincare = data.dailyRecords[i].nightSkincare || record.nightSkincare
        record.bodyCare = data.dailyRecords[i].bodyCare || record.bodyCare
        record.salon = data.dailyRecords[i].salon || record.salon
        record.cosmetic = data.dailyRecords[i].cosmetic || record.cosmetic
        data.dailyRecords[i] = record
        found = true
        break
      }
    }
    if (!found) {
      record.createdAt = now
      data.dailyRecords.push(record)
    }

    // 同步到今日记录（如果编辑的是今天）
    var todayStr = beautyStore.localDateStr(new Date())
    if (dateStr === todayStr) {
      self.setData({ todayRecord: record })
      self.updateTopSummary()
    }

    beautyStore.saveSkincare(app.globalData.userKey, data, function (success) {
      if (success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        self.setData({ showDayDetail: false, skinData: data })
        self.renderCalendar()
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  }
})
