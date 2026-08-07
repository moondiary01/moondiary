Page({
  data: {
    pageKey: '',
    pageTitle: ''
  },

  onLoad: function(options) {
    var key = options.key || '';
    var title = decodeURIComponent(options.title || '');
    this.setData({ pageKey: key, pageTitle: title });
    wx.setNavigationBarTitle({ title: title });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
