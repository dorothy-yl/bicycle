// 导入 I18n 工具类
const I18n = require('./utils/i18n.js');

App({
  onLaunch() {
    console.log('App Launch');
    
    // 初始化 I18n：根据涂鸦系统语言自动加载对应语言包
    this.initI18n();
  }, 
  
  /**
   * 初始化 I18n 国际化
   * 检测涂鸦系统语言设置，自动匹配并加载对应语言包
   */
  initI18n() {
    try {
      // 尝试获取涂鸦系统语言
      // 方法1: 通过 MQTT 获取系统语言
      let systemLang = null;
      
      if (typeof ty !== 'undefined' && ty.mqtt && ty.mqtt.getSystemLang) {
        try {
          systemLang = ty.mqtt.getSystemLang();
          console.log('Got system language from ty.mqtt.getSystemLang():', systemLang);
        } catch (e) {
          console.log('ty.mqtt.getSystemLang() not available:', e);
        }
      }
      
      // 方法2: 如果方法1失败，尝试通过设备 API 获取语言
      if (!systemLang && typeof ty !== 'undefined' && ty.device && ty.device.getDeviceLang) {
        try {
          systemLang = ty.device.getDeviceLang();
          console.log('Got system language from ty.device.getDeviceLang():', systemLang);
        } catch (e) {
          console.log('ty.device.getDeviceLang() not available:', e);
        }
      }
      
      // 方法3: 如果以上方法都不可用，尝试从系统信息获取
      if (!systemLang && typeof ty !== 'undefined' && ty.getSystemInfoSync) {
        try {
          const systemInfo = ty.getSystemInfoSync();
          systemLang = systemInfo.language || systemInfo.lang;
          console.log('Got system language from systemInfo:', systemLang);
        } catch (e) {
          console.log('ty.getSystemInfoSync() not available:', e);
        }
      }
      
      // 初始化 I18n 实例，传入系统语言
      // 如果未获取到系统语言，I18n 内部会使用默认语言（en）
      I18n.init(systemLang);
      
      // 将 I18n 实例挂载到全局，方便页面直接使用
      global.I18n = I18n;
      
      console.log('I18n initialized successfully, current language:', I18n.getCurrentLang());
    } catch (error) {
      console.error('Failed to initialize I18n:', error);
      // 即使初始化失败，也使用默认语言
      I18n.init('en');
      global.I18n = I18n;
    }
  },
  
  onShow() {
    console.log('App Show');
  },
  onHide() {
    console.log('App Hide');
  }
});



