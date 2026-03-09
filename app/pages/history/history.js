// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;


Page({
  data: {
    currentDate: '',
    currentDateObj: null,
    selectedDateStr: '', // YYYY-MM-DD format for filtering
    records: [],
    showCalendar: false,
    // Calendar data
    calendarCurrentDate: new Date(),
    calendarDays: [],
    // 星期名称（初始化为空数组，在 onLoad 中根据系统语言设置）
    weekdays: [],
    currentMonthText: '',
    isRefreshing: false, // 下拉刷新状态
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    sportsRecordsLabel: '',
    workoutRecordsLabel: '',
    noRecordsTodayLabel: '',
    hrBpmLabel: '',
    inclineLabel: '',
    distanceKmLabel: '',
    maxSpeedLabel: '',
    minSpeedLabel: '',
    maxInclineLabel: '',
    minInclineLabel: ''
  },

  /**
   * 获取 I18n 实例的辅助方法
   */
  getI18n() {
    return global.I18n || I18nUtil;
  },
  
  onLoad() {
    // 确保 I18n 已初始化
    const currentI18n = this.getI18n();
    
    ty.hideMenuButton({ success: () => {
      console.log('hideMenuButton success');
    }, fail: (error) => {
      console.log('hideMenuButton fail', error);
    } });
    
    console.log('History Page Load');
    // 初始化当前日期为今天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.setData({
      currentDateObj: today.getTime(),
      selectedDateStr: this.formatDateString(today),
      // 根据系统语言初始化星期名称
      weekdays: [
        currentI18n.t('week_sunday'),
        currentI18n.t('week_monday'),
        currentI18n.t('week_tuesday'),
        currentI18n.t('week_wednesday'),
        currentI18n.t('week_thursday'),
        currentI18n.t('week_friday'),
        currentI18n.t('week_saturday')
      ],
      // 初始化国际化文本
      sportsRecordsLabel: currentI18n.t('sports_records'),
      workoutRecordsLabel: currentI18n.t('workout_records'),
      noRecordsTodayLabel: currentI18n.t('no_records_today'),
      hrBpmLabel: currentI18n.t('hr_bpm'),
      inclineLabel: currentI18n.t('incline'),
      distanceKmLabel: currentI18n.t('distance_km_simple'),
      maxSpeedLabel: currentI18n.t('max_speed'),
      minSpeedLabel: currentI18n.t('min_speed'),
      maxInclineLabel: currentI18n.t('max_incline'),
      minInclineLabel: currentI18n.t('min_incline')
    });
    this.updateDateDisplay(today);
    this.generateCalendar();
    
    // 仅从本地加载数据
    const selectedDate = new Date(this.data.currentDateObj);
    this.loadRecordsForDate(selectedDate);
  },

  onShow() {
    // 每次显示页面时从本地加载数据
    const selectedDate = new Date(this.data.currentDateObj);
    this.loadRecordsForDate(selectedDate);
  },

  // 下拉刷新
  onRefresherRefresh() {
    console.log('下拉刷新 history 页面');
    this.setData({ isRefreshing: true });
    // 仅从本地加载
    const selectedDate = new Date(this.data.currentDateObj);
    this.loadRecordsForDateFromLocal(selectedDate);
    
    // 如果日历已打开，重新生成日历以更新标记
    if (this.data.showCalendar) {
      this.generateCalendar();
    }
    
    // 刷新完成后停止下拉刷新动画
    this.setData({ isRefreshing: false });
  },

  // 格式化日期为 YYYY-MM-DD 字符串
  formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 格式化日期为显示格式 "12月29日" (中文) 或 "Dec 29" (英文)
  formatDateDisplay(date) {
    const monthKeys = [
      'month_january_short', 'month_february_short', 'month_march_short', 'month_april_short',
      'month_may_short', 'month_june_short', 'month_july_short', 'month_august_short',
      'month_september_short', 'month_october_short', 'month_november_short', 'month_december_short'
    ];
    const month = date.getMonth();
    const day = date.getDate();
    const monthText = this.getI18n().t(monthKeys[month]);
    // 检查翻译后的文本是否包含"月"字来判断是否为中文
    const isChinese = monthText.includes('月');
    if (isChinese) {
      return `${monthText}${day}日`;
    } else {
      return `${monthText} ${day}`;
    }
  },

  // 格式化日期时间为 "12月11日12:01:03" 格式 (中文) 或 "2025.10.05 12:01:03" 格式 (英文)
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const monthKeys = [
      'month_january_short', 'month_february_short', 'month_march_short', 'month_april_short',
      'month_may_short', 'month_june_short', 'month_july_short', 'month_august_short',
      'month_september_short', 'month_october_short', 'month_november_short', 'month_december_short'
    ];
    const monthText = this.getI18n().t(monthKeys[date.getMonth()]);
    // 检查翻译后的文本是否包含"月"字来判断是否为中文
    const isChinese = monthText.includes('月');
    if (isChinese) {
      return `${monthText}${day}日${hours}:${minutes}:${seconds}`;
    } else {
      const monthStr = month.toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      return `${year}.${monthStr}.${dayStr} ${hours}:${minutes}:${seconds}`;
    }
  },

  // 将 ISO 格式字符串转换为友好的显示格式
  formatDateStringForDisplay(dateString) {
    if (!dateString) {
      return dateString;
    }

    // 数字时间戳或数字字符串
    if (typeof dateString === 'number' || (/^\d+$/.test(dateString) && dateString.length >= 10)) {
      const date = new Date(Number(dateString));
      if (!isNaN(date.getTime())) {
        return this.formatDateTime(date);
      }
      return dateString;
    }

    if (typeof dateString !== 'string') {
      return dateString;
    }
    
    // 检测是否为 ISO 格式（包含 'T' 和 'Z' 或时区信息）
    const isISOFormat = dateString.includes('T') && (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/));
    
    if (isISOFormat) {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return dateString;
        }
        return this.formatDateTime(date);
      } catch (error) {
        console.warn('formatDateStringForDisplay: 解析日期失败', error, dateString);
        return dateString;
      }
    }

    // 处理 YYYY/MM/DD 或 YYYY.MM.DD（可包含时间）
    const normalized = dateString.replace(/\./g, '-').replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        return this.formatDateTime(date);
      }
    }
    
    return dateString;
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

  // 从本地记录中提取日期字符串（YYYY-MM-DD）
  getDateStringFromRecord(record) {
    if (!record) return '';

    const dateValue = record.date ?? record.dateFormatted ?? record.dateCongrats ?? record.timestamp ?? record.id;
    if (!dateValue) return '';

    // 直接处理 YYYY-MM-DD
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // 处理 ISO 字符串（如 "2025-12-05T15:23:00.000Z"）
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      const datePart = dateValue.substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
      }
    }

    // 处理 YYYY/MM/DD 或 YYYY.MM.DD
    if (typeof dateValue === 'string') {
      const normalized = dateValue.replace(/\./g, '-').replace(/\//g, '-');
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
      }
      const match = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        const [, y, m, d] = match;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const cnMatch = dateValue.match(/(\d{1,2})月(\d{1,2})日/);
      if (cnMatch) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(cnMatch[1]).padStart(2, '0');
        const day = String(cnMatch[2]).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    // 时间戳或其他格式
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error parsing date:', error);
      return '';
    }
  },

  // 更新日期显示
  updateDateDisplay(date) {
    this.setData({
      currentDate: this.formatDateDisplay(date),
      currentDateObj: date.getTime(),
      selectedDateStr: this.formatDateString(date)
    });
  },

  // 根据日期加载记录（仅本地）
  loadRecordsForDate(date) {
    this.loadRecordsForDateFromLocal(date);
  },

  // 格式化记录以匹配页面显示需求（仅本地记录）
  formatRecordsForDisplay(records) {
    const toNumber = (value, fallback = 0) => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      return Number.isFinite(num) ? num : fallback;
    };
    const toFixedString = (value, digits, fallback) => {
      return Number.isFinite(value) ? value.toFixed(digits) : fallback;
    };

    return records.map(record => {
      const durationSeconds = toNumber(record.duration || record.elapsedTime, 0);
      const durationFormatted = this.formatTime(durationSeconds);
      
      const rawDate = record.dateFormatted || record.date || record.dateCongrats;
      const formattedDate = this.formatDateStringForDisplay(rawDate);
      
      let title = record.pageTitle || record.title;
      if (!title || title === 'quick_start' || title === 'target_pattern') {
        if (title === 'quick_start' || (!record.pageTitle && !record.isGoalMode)) {
          title = this.getI18n().t('quick_start');
        } else if (title === 'target_pattern' || record.isGoalMode) {
          title = this.getI18n().t('target_pattern');
        } else {
          title = record.isGoalMode ? this.getI18n().t('target_pattern') : this.getI18n().t('quick_start');
        }
      }
      
      const speedValue = record.speedKmh !== undefined ? toNumber(record.speedKmh, 0) : toNumber(record.speed, 0);
      const caloriesValue = Math.round(toNumber(record.calories, 0)).toString();
      // 改进距离字段处理：支持多种数据格式和来源
      const distanceRaw = record.distance !== undefined && record.distance !== null 
        ? record.distance 
        : (record.distanceKm !== undefined && record.distanceKm !== null ? record.distanceKm : null);
      const distanceValue = toFixedString(toNumber(distanceRaw, NaN), 2, '0.00');
      const heartRateValue = Math.round(toNumber(record.heartRate, 0)).toString();
      const maxSpeedValue = toFixedString(toNumber(record.maxSpeed, NaN), 1, '0.0');
      const minSpeedValue = toFixedString(toNumber(record.minSpeed, NaN), 1, '0.0');
      const inclineValue = toFixedString(toNumber(record.incline, NaN), 1, '0.0');
      const maxInclineValue = toFixedString(toNumber(record.maxIncline, NaN), 1, '0.0');
      const minInclineValue = toFixedString(toNumber(record.minIncline, NaN), 1, '0.0');

      return {
        id: record.id,
        duration: durationFormatted,
        date: formattedDate,
        title: title,
        speed: toFixedString(speedValue, 2, '0.00'),
        calories: caloriesValue,
        distance: distanceValue,
        heartRate: heartRateValue,
        maxSpeed: maxSpeedValue,
        minSpeed: minSpeedValue,
        incline: inclineValue,
        maxIncline: maxInclineValue,
        minIncline: minInclineValue,
        fullRecord: record
      };
    });
  },

  // 从本地存储加载记录（treadmill_history）
  loadRecordsForDateFromLocal(date) {
    try {
      // 使用对象参数形式获取存储数据
      const storageResult = ty.getStorageSync({ key: 'treadmill_history' });
      // 处理返回结果：可能是直接返回数据，也可能是 { data: ... } 格式
      const rawHistory = (storageResult && storageResult.data !== undefined) ? storageResult.data : storageResult;
      const history = (rawHistory && Array.isArray(rawHistory)) ? rawHistory : [];
      
      // 确保history是数组
      if (!Array.isArray(history)) {
        console.warn('treadmill_history is not an array, resetting to empty array');
        this.setData({
          records: []
        });
        return;
      }
      
      const targetDateStr = this.formatDateString(date);
      
      // 筛选出当天的记录
      const dayRecords = history.filter(record => {
        if (!record) return false;
        try {
          const recordDateStr = this.getDateStringFromRecord(record);
          return recordDateStr === targetDateStr;
        } catch (err) {
          console.warn('Error processing record:', err, record);
          return false;
        }
      });
      
      const formattedRecords = this.formatRecordsForDisplay(dayRecords);
      
      // 按时间排序（最新的在前）
      formattedRecords.sort((a, b) => {
        try {
          const dateA = new Date(a.fullRecord?.date || 0).getTime();
          const dateB = new Date(b.fullRecord?.date || 0).getTime();
          return dateB - dateA;
        } catch (err) {
          return 0;
        }
      });
      
      this.setData({
        records: formattedRecords
      });
    } catch (error) {
      console.error('Error loading records from local:', error);
      this.setData({
        records: []
      });
    }
  },

  prevDate() {
    const currentDate = new Date(this.data.currentDateObj);
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    prevDate.setHours(0, 0, 0, 0);
    this.updateDateDisplay(prevDate);
    this.loadRecordsForDate(prevDate);
  },

  nextDate() {
    const currentDate = new Date(this.data.currentDateObj);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);
    this.updateDateDisplay(nextDate);
    this.loadRecordsForDate(nextDate);
  },

  // 显示日历弹窗
  showCalendar() {
    // 设置日历显示为当前选择的日期所在月份
    const selectedDate = new Date(this.data.currentDateObj);
    this.setData({
      showCalendar: true,
      calendarCurrentDate: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    });
    this.generateCalendar();
  },

  // 隐藏日历弹窗
  hideCalendar() {
    this.setData({
      showCalendar: false
    });
  },

  // 从日历选择日期
  selectDateFromCalendar(e) {
    const dateStr = e.currentTarget.dataset.date;
    if (!dateStr) return;
    
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);
    
    this.updateDateDisplay(selectedDate);
    this.loadRecordsForDate(selectedDate);
    this.hideCalendar();
  },

  // 检查指定日期是否有历史记录
  checkDateHasRecord(dateStr) {
    try {
      const storageResult = ty.getStorageSync({ key: 'treadmill_history' });
      const rawHistory = (storageResult && storageResult.data !== undefined) ? storageResult.data : storageResult;
      const history = (rawHistory && Array.isArray(rawHistory)) ? rawHistory : [];
      if (Array.isArray(history) && history.length > 0) {
        const hasRecord = history.some(record => {
          const recordDateStr = this.getDateStringFromRecord(record);
          return recordDateStr === dateStr;
        });
        if (hasRecord) return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking date has record:', error);
      return false;
    }
  },

  // 生成日历
  generateCalendar() {
    const { calendarCurrentDate, selectedDateStr } = this.data;
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const monthKeys = [
      'month_january', 'month_february', 'month_march', 'month_april',
      'month_may', 'month_june', 'month_july', 'month_august',
      'month_september', 'month_october', 'month_november', 'month_december'
    ];
    const monthText = `${this.getI18n().t(monthKeys[month])} ${year}`;
    this.setData({ currentMonthText: monthText });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const calendarDays = [];

    // 上个月的日期
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      const dateStr = this.formatDateString(date);
      calendarDays.push({
        day: day,
        date: dateStr,
        isCurrentMonth: false,
        isToday: false,
        isSelected: dateStr === selectedDateStr,
        hasRecord: this.checkDateHasRecord(dateStr)
      });
    }

    // 当前月的日期
    const today = new Date();
    const todayStr = this.formatDateString(today);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDateString(date);
      calendarDays.push({
        day: day,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        hasRecord: this.checkDateHasRecord(dateStr)
      });
    }

    // 下个月的日期（填满42个格子）
    const remainingCells = 42 - calendarDays.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      const dateStr = this.formatDateString(date);
      calendarDays.push({
        day: day,
        date: dateStr,
        isCurrentMonth: false,
        isToday: false,
        isSelected: dateStr === selectedDateStr,
        hasRecord: this.checkDateHasRecord(dateStr)
      });
    }

    this.setData({ calendarDays });
  },

  // 日历月份切换
  prevMonth() {
    const { calendarCurrentDate } = this.data;
    const newDate = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() - 1, 1);
    this.setData({ calendarCurrentDate: newDate });
    this.generateCalendar();
  },

  nextMonth() {
    const { calendarCurrentDate } = this.data;
    const newDate = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() + 1, 1);
    this.setData({ calendarCurrentDate: newDate });
    this.generateCalendar();
  },

  goToHome() {
    ty.navigateBack({
      delta: 1
    });
  },

  goToHistory() {
    // Already here
  },

  goToSettings() {
    ty.navigateTo({
      url: '/pages/congrats/congrats'
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(item => item.id === id);
    
    if (record && record.fullRecord) {
      const fullRecord = record.fullRecord;
      // 确定标题，优先使用 pageTitle，其次根据 isGoalMode 判断
      const title = fullRecord.pageTitle || (fullRecord.isGoalMode === true ? this.getI18n().t('target_pattern') : this.getI18n().t('quick_start'));
      
      const params = new URLSearchParams({
        id: id.toString(),
        duration: fullRecord.duration ? fullRecord.duration.toString() : '0',
        date: fullRecord.dateFormatted || fullRecord.date || '',
        speed: fullRecord.speedKmh ? fullRecord.speedKmh.toString() : (fullRecord.speed ? fullRecord.speed.toString() : '0'),
        calories: fullRecord.calories ? fullRecord.calories.toString() : '0',
        distance: fullRecord.distance ? fullRecord.distance.toFixed(1) : '0.0',
        maxResistance: fullRecord.maxResistance ? fullRecord.maxResistance.toString() : '0',
        minResistance: fullRecord.minResistance ? fullRecord.minResistance.toString() : '0',
        maxSpeed: fullRecord.maxSpeed ? fullRecord.maxSpeed.toString() : '0',
        minSpeed: fullRecord.minSpeed ? fullRecord.minSpeed.toString() : '0',
        incline: fullRecord.incline ? fullRecord.incline.toString() : '0',
        maxIncline: fullRecord.maxIncline ? fullRecord.maxIncline.toString() : '0',
        minIncline: fullRecord.minIncline ? fullRecord.minIncline.toString() : '0',
        heartRate: fullRecord.heartRate ? fullRecord.heartRate.toString() : '0',
        title: title
      });
      
      ty.navigateTo({
        url: `/pages/history-detail/history-detail?${params.toString()}`
      });
    }
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
          // 如果返回失败，尝试跳转到首页
          ty.navigateTo({
            url: '/pages/index/index'
          });
        }
      });
    } catch (error) {
      console.error('返回异常:', error);
      // 如果出现异常，尝试跳转到首页
      ty.navigateTo({
        url: '/pages/index/index'
      });
    }
  },

  // 阻止事件冒泡（用于日历弹窗内容区域）
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  }
});
