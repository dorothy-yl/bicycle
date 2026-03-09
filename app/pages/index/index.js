// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

function formatDpState(dpState) {
  return Object.keys(dpState).map(dpCode => ({ code: dpCode, value: dpState[dpCode] }));
}

Page({
  data: {
    exerciseTime: '05:20',
    distance: '1.35',
    currentTime: '9:42',
    // 初始化为空字符串，在 onLoad 中根据系统语言设置
    pageTitle: '',
    exerciseTimeLabel: '',
    distanceLabel: '',
    commonFunctionsLabel: '',
    quickStartLabel: '',
    targetPatternLabel: '',
    ftmsLabel: '',
    tipsLabel: ''
  },
  onLoad() {
    // 确保 I18n 已初始化（如果全局未定义，使用工具类实例）
    const currentI18n = global.I18n || I18nUtil;
    
    // 根据系统语言加载的 I18n 实例，更新页面文本
    this.setData({
      pageTitle: currentI18n.t('page_title_home'),
      exerciseTimeLabel: currentI18n.t('exercise_time'),
      distanceLabel: currentI18n.t('distance_km'),
      commonFunctionsLabel: currentI18n.t('common_functions'),
      quickStartLabel: currentI18n.t('quick_start'),
      targetPatternLabel: currentI18n.t('target_pattern'),
      ftmsLabel: currentI18n.t('ftms'),
      tipsLabel: currentI18n.t('tips')
    });
    
    console.log('Current language:', currentI18n.getCurrentLang());
    console.log('Page title:', currentI18n.t('title'));
    ty.hideMenuButton({ success: () => {
      console.log('hideMenuButton success');
    }, fail: (error) => {
      console.log('hideMenuButton fail', error);
    } });
    console.log('Home Page Load');
    // this.loadTodayData();
    this.updateTime();

    const { onDpDataChange, registerDeviceListListener } = ty.device;
    const { getLaunchOptionsSync } = ty;
    // 启动参数中获取设备 id
    const {
      query: { deviceId }
    } = getLaunchOptionsSync();

    const _onDpDataChange = (event) => {
      console.log('dp点数组:' + JSON.stringify(formatDpState(event.dps)));
      const dpID = formatDpState(event.dps); //dpID 数组
      dpID.forEach(element => {
        // 时间
        if (element.code == 108) {
          this.setData({
            exerciseTime: this.formatTime(element.value)
          });
        }
       
        //距离
        if (element.code == 103) {
          this.setData({
            distance: (element.value/1000).toFixed(2)
          });
        }
      });
    }

    registerDeviceListListener({
      deviceIdList: [deviceId],
      success: () => {
        console.log('registerDeviceListListener success');
      },
      fail: (error) => {
        console.log('registerDeviceListListener fail', error);
      }
    });
    onDpDataChange(_onDpDataChange);
  },
  onShow() {
    console.log('Home Page Show');
    // this.loadTodayData();
    this.updateTime();
  },
  updateTime() {
    // Display static time as per screenshot, or enable dynamic time
    // const now = new Date();
    // const hours = String(now.getHours()).padStart(2, '0');
    // const minutes = String(now.getMinutes()).padStart(2, '0');
    // this.setData({ currentTime: `${hours}:${minutes}` });
  },
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = secs.toString().padStart(2, '0');
    
    // Matching the format '05:04' from the initial data
    return `${m}:${s}`;
  },
  loadTodayData() {
    // Keep this function for future real data integration
    // For now we want to match the screenshot exactly
    /*
    const today = new Date().toISOString().split('T')[0];
    const history = ty.getStorageSync('treadmill_history') || [];
    const todayRecords = history.filter(record => {
      const recordDate = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
      return recordDate === today;
    });
    
    let totalDistance = 0;
    let totalDuration = 0; 
    
    todayRecords.forEach(record => {
      totalDistance += record.distance || 0;
      totalDuration += record.duration || 0; 
    });
    
    const minutes = Math.floor(totalDuration / 60);
    const seconds = totalDuration % 60;
    const exerciseTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (todayRecords.length > 0) {
      this.setData({
        exerciseTime: exerciseTime,
        distance: totalDistance.toFixed(0)
      });
    }
    */
  },
  goToHome() {
    // Already on home
  },
  goToExercise() {
    ty.navigateTo({
      url: '/pages/exercise/exercise'
    });
  },
  goToGoal() {
    ty.navigateTo({
      url: '/pages/goal/goal'
    });
  },
  goToHistory() {
    ty.navigateTo({
      url: '/pages/history/history'
    });
  },
  goToSettings() {
    ty.navigateTo({
      url: '/pages/congrats/congrats'
    });
  },
  goToFTMS() {
    ty.navigateTo({
      url: '/pages/ftms/ftms'
    });
  },
  goToTirp() {
    ty.navigateTo({
      url: '/pages/alarm/index/index'
    });
  }
});
