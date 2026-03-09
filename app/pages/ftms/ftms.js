// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

Page({
  data: {
    ftmsEnabled: true,
    resistance: 20,
    deviceId: '',
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    ftmsLabel: ''
  },

  /**
   * 获取 I18n 实例的辅助方法
   */
  getI18n() {
    return global.I18n || I18nUtil;
  },

  onLoad: function (options) {
    // 确保 I18n 已初始化
    const currentI18n = this.getI18n();
    
    // 初始化国际化文本
    this.setData({
      ftmsLabel: currentI18n.t('ftms')
    });
    
    ty.hideMenuButton({ success: () => {
      console.log('hideMenuButton success');
    }, fail: (error) => {
      console.log('hideMenuButton fail', error);
    } });
    // Get deviceId from launch options or page parameters
    const launchOptions = ty.getLaunchOptionsSync();
    const deviceId = options.deviceId || launchOptions.query?.deviceId || launchOptions.query?.devId;
    
    if (deviceId) {
      this.setData({ deviceId: deviceId });
    } else {
      console.warn('DeviceId not found, DP commands will not work');
      ty.showToast({
        title: currentI18n.t('device_not_found'),
        icon: 'none'
      });
    }

    // Initialize state if needed
    const savedState = ty.getStorageSync('ftmsEnabled');
    if (savedState !== '') {
      this.setData({ ftmsEnabled: savedState });
    }
  },

  /**
   * Send DP command to device
   * @param {Object} dps - Data points object, e.g. { 1: true, 2: 20 }
   */
  publishDps: function(dps) {
    const { deviceId } = this.data;
    
    if (!deviceId) {
      ty.showToast({
        title: this.getI18n().t('device_not_connected'),
        icon: 'none'
      });
      return;
    }

    const { publishDps } = ty.device;
    
    publishDps({
      deviceId: deviceId,
      dps: dps,
      mode: 2, // 0: LAN, 1: Network, 2: Auto
      pipelines: [0, 1, 2, 3, 4, 5, 6], // Priority: LAN, MQTT, HTTP, BLE, SIGMesh, BLEMesh, BLEBeacon
      options: {},
      success: (res) => {
        console.log('publishDps success', res);
      },
      fail: (error) => {
        console.error('publishDps fail', error);
        const currentI18n = this.getI18n();
        ty.showToast({
          title: currentI18n.t('send_failed') + ': ' + (error.errorMsg || currentI18n.t('unknown_error')),
          icon: 'none'
        });
      }
    });
  },

  toggleFTMS: function (e) {
    const enabled = e.detail.value;
    this.setData({
      ftmsEnabled: enabled
    });
    ty.setStorageSync('ftmsEnabled', enabled);
    
    // Send FTMS enable/disable DP command
    // Note: Adjust DP ID (1) based on your product configuration
    // Common DP IDs: 1 for switch, 101 for FTMS enable, etc.
    this.publishDps({
      1: enabled // Change this DP ID to match your product's FTMS enable DP
    });
  },

  changeResistance: function (e) {
    const resistance = e.detail.value;
    this.setData({
      resistance: resistance
    });
    
    // Send resistance value DP command
    // Note: Adjust DP ID (2) based on your product configuration
    // Common DP IDs: 2 for resistance, 102 for resistance value, etc.
    this.publishDps({
      2: resistance // Change this DP ID to match your product's resistance DP
    });
  },

  goBack: function () {
    ty.navigateBack();
  }
});


