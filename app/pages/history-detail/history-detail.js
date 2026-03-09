// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

function formatDpState(dpState) {
  return Object.keys(dpState).map(dpCode => ({ code: dpCode, value: dpState[dpCode] }));
}

Page({
  /**
   * 获取 I18n 实例的辅助方法
   */
  getI18n() {
    return global.I18n || I18nUtil;
  },
  data: {
    record: null,
    showEmptyState: false,
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    detailsLabel: '',
    quickStartLabel: '',
    hrBpmLabel: '',
    rpmLabel: '',
    powerWLabel: '',
    speedKmhLabel: '',
    caloriesLabel: '',
    distanceLabel: '',
    maxResistanceLabel: '',
    trainingDurationLabel: '',
    workoutTimeLabel: '',
    inclineLabel: '',
    distanceKmLabel: '',
    noDataLabel: ''
  },

  // 格式化时长为 "HH:MM:SS" 格式
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = secs.toString().padStart(2, '0');
    
    return `${h}:${m}:${s}`;
  },

  // 格式化日期为 "12月29日 16:53:07" 格式 (中文) 或 "Dec 29 16:53:07" 格式 (英文)
  formatDate(date) {
    const monthKeys = [
      'month_january_short', 'month_february_short', 'month_march_short', 'month_april_short',
      'month_may_short', 'month_june_short', 'month_july_short', 'month_august_short',
      'month_september_short', 'month_october_short', 'month_november_short', 'month_december_short'
    ];
    const month = date.getMonth();
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const monthText = this.getI18n().t(monthKeys[month]);
    // 检查翻译后的文本是否包含"月"字来判断是否为中文
    const isChinese = monthText.includes('月');
    if (isChinese) {
      return `${monthText}${day}日 ${hours}:${minutes}:${seconds}`;
    } else {
      return `${monthText} ${day} ${hours}:${minutes}:${seconds}`;
    }
  },

  // 将 ISO 格式字符串转换为友好的显示格式
  formatDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return dateString;
    }
    
    // 检测是否为 ISO 格式（包含 'T' 和 'Z' 或时区信息）
    const isISOFormat = dateString.includes('T') && (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/));
    
    if (isISOFormat) {
      try {
        // 解析 ISO 格式字符串并转换为本地时间
        const date = new Date(dateString);
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return dateString; // 如果解析失败，返回原字符串
        }
        return this.formatDate(date);
      } catch (error) {
        console.warn('formatDateString: 解析日期失败', error, dateString);
        return dateString; // 如果解析失败，返回原字符串
      }
    }
    
    // 如果不是 ISO 格式，直接返回原字符串
    return dateString;
  },

  // 从URL参数构建记录
  buildRecordFromOptions(options) {
    const durationSeconds = parseInt(options.duration) || 0;
    const rawDate = options.date || options.dateCongrats || this.formatDate(new Date());
    const formattedDate = this.formatDateString(rawDate);

    let speedValue = '0';
    if (options.speed !== undefined && options.speed !== null && options.speed !== '') {
      speedValue = parseFloat(options.speed).toFixed(1);
    } else if (options.speedKmh !== undefined && options.speedKmh !== null && options.speedKmh !== '') {
      speedValue = parseFloat(options.speedKmh).toFixed(1);
    }

    const titleValue = options.title || options.pageTitle || this.getI18n().t('quick_start');
    const isGoalMode = options.isGoalMode === 'true' || options.isGoalMode === true;

    const inclineValue = options.incline !== undefined && options.incline !== null && options.incline !== ''
      ? parseFloat(options.incline).toFixed(1)
      : '0.0';

    return {
      id: parseInt(options.id) || Date.now(),
      duration: this.formatTime(durationSeconds),
      date: formattedDate,
      title: titleValue,
      Load: options.Load || options.load || '0',
      calories: options.calories || '0',
      distance: (parseFloat(options.distance) || 0).toFixed(2),
      speed: speedValue,
      rpm: options.rpm || '0',
      watt: options.watt || '0.0',
      maxResistance: options.maxResistance || '0',
      minResistance: options.minResistance || '0',
      heartRate: options.heartRate || '0',
      incline: inclineValue,
      isGoalMode: isGoalMode,
      pageTitle: titleValue
    };
  },

  // 规范化本地记录字段（用于详情页展示）
  normalizeLocalRecord(record, options) {
    const normalized = { ...record };
    // 规范化 distance 字段
    if (normalized.distance !== undefined && normalized.distance !== null) {
      const distanceNum = typeof normalized.distance === 'number' 
        ? normalized.distance 
        : parseFloat(normalized.distance);
      normalized.distance = Number.isFinite(distanceNum) ? distanceNum.toFixed(2) : '0.00';
    } else if (options && options.distance !== undefined && options.distance !== null && options.distance !== '') {
      normalized.distance = parseFloat(options.distance).toFixed(2);
    } else {
      normalized.distance = '0.00';
    }
    if (normalized.duration !== undefined) {
      const durationSeconds = typeof normalized.duration === 'number'
        ? normalized.duration
        : parseInt(normalized.duration) || 0;
      normalized.duration = this.formatTime(durationSeconds);
    }
    if (normalized.date) {
      normalized.date = this.formatDateString(normalized.date);
    }
    if (!normalized.Load) {
      normalized.Load = normalized.load
        ? normalized.load.toString()
        : (normalized.avgResistance ? Math.round(normalized.avgResistance).toString() : '0');
    }
    if (options.speed !== undefined && options.speed !== null && options.speed !== '') {
      normalized.speed = parseFloat(options.speed).toFixed(1);
    } else if (options.speedKmh !== undefined && options.speedKmh !== null && options.speedKmh !== '') {
      normalized.speed = parseFloat(options.speedKmh).toFixed(1);
    } else if (!normalized.speed) {
      if (normalized.speedKmh !== undefined) {
        normalized.speed = parseFloat(normalized.speedKmh).toFixed(0);
      } else if (normalized.speed !== undefined) {
        normalized.speed = parseFloat(normalized.speed).toFixed(0);
      } else {
        normalized.speed = '0';
      }
    }
    if (!normalized.title) {
      normalized.title = normalized.pageTitle || (normalized.isGoalMode === true
        ? this.getI18n().t('target_pattern')
        : this.getI18n().t('quick_start'));
    }
    if (normalized.isGoalMode === undefined && normalized.pageTitle) {
      normalized.isGoalMode = normalized.pageTitle === this.getI18n().t('target_pattern');
    }
    if (!normalized.pageTitle) {
      normalized.pageTitle = normalized.title;
    }
    // 规范化 incline 字段
    if (normalized.incline !== undefined) {
      const inclineNum = typeof normalized.incline === 'number' 
        ? normalized.incline 
        : parseFloat(normalized.incline);
      normalized.incline = Number.isFinite(inclineNum) ? inclineNum.toFixed(1) : '0.0';
    } else if (options && options.incline !== undefined && options.incline !== null && options.incline !== '') {
      normalized.incline = parseFloat(options.incline).toFixed(1);
    } else {
      normalized.incline = '0.0';
    }
    return normalized;
  },
  
  // 设置 dp 点监听（实时更新最大阻力）
  setupDpListener() {
    const { onDpDataChange, registerDeviceListListener } = ty.device;
    const { getLaunchOptionsSync } = ty;
    const { query: { deviceId } } = getLaunchOptionsSync();

    if (!deviceId) {
      console.log('设备ID不存在，跳过dp点监听');
      return;
    }

    // 监听 DP 点数据变化
    const _onDpDataChange = (event) => {
      if (!event.dps) {
        return;
      }

      const dpID = formatDpState(event.dps);
      dpID.forEach(element => {
        // 最大阻力 - dp 点 111
        if (element.code == 111) {
          console.log('历史详情页收到设备上报最大阻力:', element.value);
          // 实时更新最大阻力
          if (this.data.record) {
            this.setData({
              'record.maxResistance': element.value.toString()
            });
          }
        }
      });
    };

    // 注册设备监听
    registerDeviceListListener({
      deviceIdList: [deviceId],
      success: () => {
        console.log('历史详情页dp点监听注册成功');
      },
      fail: (error) => {
        console.error('历史详情页dp点监听注册失败:', error);
      }
    });

    // 监听 DP 点变化
    onDpDataChange(_onDpDataChange);
  },

  onLoad(options) {
    // 确保 I18n 已初始化
    const currentI18n = this.getI18n();
    
    // 初始化国际化文本
    this.setData({
      detailsLabel: currentI18n.t('details'),
      quickStartLabel: currentI18n.t('quick_start'),
      hrBpmLabel: currentI18n.t('hr_bpm'),
      rpmLabel: currentI18n.t('rpm'),
      powerWLabel: currentI18n.t('power_w'),
      speedKmhLabel: currentI18n.t('speed_kmh'),
      caloriesLabel: currentI18n.t('calories'),
      distanceLabel: currentI18n.t('distance'),
      distanceKmLabel: currentI18n.t('distance_km_simple'),
      maxResistanceLabel: currentI18n.t('max_resistance'),
      trainingDurationLabel: currentI18n.t('training_duration'),
      workoutTimeLabel: currentI18n.t('workout_time'),
      inclineLabel: currentI18n.t('incline'),
      noDataLabel: currentI18n.t('no_records_today') || '暂无数据'
    });
    
    ty.hideMenuButton({ success: () => {
      console.log('hideMenuButton success');
    }, fail: (error) => {
      console.log('hideMenuButton fail', error);
    } });
    
    const id = options.id ? parseInt(options.id) : null;
    // 使用对象参数形式获取存储数据
    const storageResult = ty.getStorageSync({ key: 'treadmill_history' });
    // 处理返回结果：可能是直接返回数据，也可能是 { data: ... } 格式
    const rawHistory = (storageResult && storageResult.data !== undefined) ? storageResult.data : storageResult;
    const history = (rawHistory && Array.isArray(rawHistory)) ? rawHistory : [];
    const hasOptionsData = !!(options.title || options.duration || options.distance || options.speed || options.calories);

    // 确保history是数组
    if (!Array.isArray(history)) {
      console.warn('treadmill_history is not an array');
    }

    let record = null;
    if (hasOptionsData) {
      record = this.buildRecordFromOptions(options);
    } else if (id) {
      const localRecord = Array.isArray(history)
        ? history.find(item => item.id === id)
        : null;
      if (localRecord) {
        record = this.normalizeLocalRecord(localRecord, options);
      }
    }

    if (!record) {
      this.setData({
        showEmptyState: true,
        record: null
      });
      ty.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      return;
    }

    this.setData({
      record: record,
      showEmptyState: false
    });
    
    // 设置 dp 点监听（在数据加载后）
    this.setupDpListener();
  },
  
  goBack() {
    try {
      ty.navigateBack({
        delta: 1,
        success: () => {
          console.log('返回成功');
        },
        fail: (err) => {
          console.error('返回失败:', err);
          // 如果返回失败，尝试跳转到历史记录页
          ty.navigateTo({
            url: '/pages/history/history'
          });
        }
      });
    } catch (error) {
      console.error('返回异常:', error);
      // 如果出现异常，尝试跳转到历史记录页
      ty.navigateTo({
        url: '/pages/history/history'
      });
    }
  }
});

