// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

Page({
  /**
   * 获取 I18n 实例的辅助方法
   */
  getI18n() {
    return global.I18n || I18nUtil;
  },
  data: {
    // 标签页
    activeTab: 'schedule', // 'tips' 或 'schedule'
    
    // Tips 标签页数据
    tipTitle: '',
    selectedDate: null, // Date 对象
    selectedTime: { hour: 15, minute: 0 },
    showDatePicker: false,
    showTimePicker: false,
    editingTipId: null, // 编辑模式下的 ID
    
    // 日期显示文本（初始化为空，在 onLoad 中根据系统语言设置）
    dateDisplayText: '',
    timeDisplayText: '15:00',
    
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    schedulesLabel: '',
    tipsLabel: '',
    dateLabel: '',
    timeLabel: '',
    titlePlaceholder: '',
    confirmLabel: '',
    chooseYearLabel: '',
    
    // 日历相关
    calendarCurrentDate: new Date(),
    calendarDays: [],
    currentMonthText: '',
    showYearPicker: false,
    yearPickerYears: [],
    yearPickerIndex: [0],
    selectedYear: null,
    
    // 时间选择器数据
    timePickerHours: [],
    timePickerMinutes: [],
    timePickerIndex: [15, 0], // [hourIndex, minuteIndex]
    
    // 日程列表
    tips: [], // 存储所有提醒事项
    
  },

  onLoad() {
    // 确保 I18n 已初始化（如果全局未定义，使用工具类实例）
    const currentI18n = global.I18n || I18nUtil;
    
    ty.hideMenuButton({ 
      success: () => {
        console.log('hideMenuButton success');
      }, 
      fail: (error) => {
        console.log('hideMenuButton fail', error);
      } 
    });
    
    // 初始化时间选择器数据
    this.initTimePicker();
    
    // 初始化当前日期和时间
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    this.setData({
      selectedDate: now,
      selectedTime: {
        hour: hour,
        minute: minute
      },
      timePickerIndex: [hour, minute],
      dateDisplayText: this.getDateDisplayText(now),
      timeDisplayText: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      // 根据系统语言初始化国际化文本
      schedulesLabel: currentI18n.t('schedules'),
      tipsLabel: currentI18n.t('tips'),
      dateLabel: currentI18n.t('date'),
      timeLabel: currentI18n.t('time'),
      titlePlaceholder: currentI18n.t('title_placeholder'),
      confirmLabel: currentI18n.t('confirm'),
      chooseYearLabel: currentI18n.t('choose_year')
    });
    
    this.loadTips();
    
    this.generateCalendar();
  
  },

  onShow() {
    this.loadTips();
  },

  // 初始化时间选择器数据
  initTimePicker() {
    const hours = [];
    const minutes = [];
    
    for (let i = 0; i < 24; i++) {
      hours.push(String(i).padStart(2, '0'));
    }
    
    for (let i = 0; i < 60; i++) {
      minutes.push(String(i).padStart(2, '0'));
    }
    
    this.setData({
      timePickerHours: hours,
      timePickerMinutes: minutes
    });
  },

  // 格式化提醒数据用于页面显示（提取为独立方法）
  formatTipsForDisplay(tips) {
    if (!Array.isArray(tips) || tips.length === 0) {
      return [];
    }

    // 按日期和时间排序（最新的在前）
    const sortedTips = [...tips].sort((a, b) => {
      const dateA = new Date(a.dateTime || a.date || 0).getTime();
      const dateB = new Date(b.dateTime || b.date || 0).getTime();
      return dateB - dateA;
    });

    // 格式化每个提醒的日期和时间用于显示
    const formattedTips = sortedTips.map(tip => {
      // 确保 tip 是有效对象
      if (!tip || typeof tip !== 'object') {
        return null;
      }
      
      const date = new Date(tip.dateTime || tip.date);
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('Invalid date for tip:', tip);
        return null;
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return {
        ...tip,
        formattedDate: `${year}.${month}.${day}`,
        formattedTime: `${hours}:${minutes}`
      };
    }).filter(tip => tip !== null); // 过滤掉无效的提醒

    return formattedTips;
  },

  // 加载提醒列表
  loadTips() {
    try {
      // 使用对象参数形式获取存储数据
      const storageResult = ty.getStorageSync({ key: 'tips' });
      let tips = (storageResult && storageResult.data !== undefined) ? storageResult.data : (storageResult || []);
      
      // 确保tips是数组
      if (!Array.isArray(tips)) {
        console.warn('tips is not an array, resetting to empty array');
        ty.setStorageSync({ key: 'tips', data: [] });
        tips = [];
      }
      
      // 使用统一的格式化方法
      const formattedTips = this.formatTipsForDisplay(tips);
      
      console.log('加载提醒列表，共', formattedTips.length, '条');
      this.setData({ tips: formattedTips });
    } catch (error) {
      console.error('加载提醒列表失败:', error);
      // 出错时设置为空数组
      this.setData({ tips: [] });
    }
  },


  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ 
      activeTab: tab,
      showDatePicker: false,
      showTimePicker: false
    });
    
    // 如果切换到"我的日程"，重新加载本地数据
    if (tab === 'schedule') {
      this.loadTips();
    }
  },

  // 跳转到创建提醒页面
  goToCreateTip() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    this.setData({
      activeTab: 'tips',
      tipTitle: '',
      editingTipId: null,
      selectedDate: now,
      selectedTime: {
        hour: hour,
        minute: minute
      },
      timePickerIndex: [hour, minute],
      dateDisplayText: this.getDateDisplayText(now),
      timeDisplayText: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      showDatePicker: false,
      showTimePicker: false
    });
    
    // 更新日历显示
    this.setData({
      calendarCurrentDate: new Date(now.getFullYear(), now.getMonth(), 1)
    });
    this.generateCalendar();
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({
      tipTitle: e.detail.value
    });
  },

  // 关闭所有选择器（点击外部区域）
  closeAllPickers() {
    if (this.data.showDatePicker || this.data.showTimePicker) {
      this.setData({
        showDatePicker: false,
        showTimePicker: false
      });
    }
  },

  // 切换日期选择器
  toggleDatePicker() {
    const newShowState = !this.data.showDatePicker;
    
    if (newShowState && this.data.selectedDate) {
      const date = new Date(this.data.selectedDate);
      this.setData({
        calendarCurrentDate: new Date(date.getFullYear(), date.getMonth(), 1),
        showDatePicker: true,
        showTimePicker: false,
        dateDisplayText: this.getDateDisplayText(date)
      });
      this.generateCalendar();
    } else {
      this.setData({
        showDatePicker: newShowState,
        showTimePicker: false
      });
      if (newShowState) {
        this.generateCalendar();
      }
    }
  },

  // 显示日期选择器（保留此方法以兼容其他可能的调用）
  showDatePicker() {
    // 如果已选择日期，设置日历显示为该日期所在月份，并更新日期显示文本
    if (this.data.selectedDate) {
      const date = new Date(this.data.selectedDate);
      this.setData({
        calendarCurrentDate: new Date(date.getFullYear(), date.getMonth(), 1),
        showDatePicker: true,
        showTimePicker: false, // 关闭时间选择器
        dateDisplayText: this.getDateDisplayText(date) // 确保显示完整日期格式
      });
    } else {
      this.setData({
        showDatePicker: true,
        showTimePicker: false // 关闭时间选择器
      });
    }
    this.generateCalendar();
  },

  // 隐藏日期选择器
  hideDatePicker() {
    this.setData({
      showDatePicker: false
    });
  },

  // 切换时间选择器
  toggleTimePicker() {
    this.setData({
      showTimePicker: !this.data.showTimePicker,
      showDatePicker: false
    });
  },

  // 显示时间选择器（保留此方法以兼容其他可能的调用）
  showTimePicker() {
    this.setData({
      showTimePicker: true,
      showDatePicker: false // 关闭日期选择器
    });
  },

  // 隐藏时间选择器
  hideTimePicker() {
    this.setData({
      showTimePicker: false
    });
  },

  // 生成日历
  generateCalendar() {
    const { calendarCurrentDate, selectedDate } = this.data;
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    // 格式化月份文本：使用国际化
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
    const startWeekday = firstDay.getDay(); // 用于日历布局对齐（不显示星期）

    const calendarDays = [];
    const today = new Date();

    // 只生成当前月的日期，但需要空位来对齐日历网格布局
    // 在当月第一天之前添加空位
    for (let i = 0; i < startWeekday; i++) {
      calendarDays.push({
        day: '',
        date: null,
        isEmpty: true
      });
    }

    // 当前月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      calendarDays.push({
        day: day,
        date: date,
        isToday: this.isSameDate(date, today),
        isSelected: this.isSameDate(date, selectedDate)
      });
    }

    this.setData({ calendarDays });
  },

  // 判断两个日期是否是同一天
  isSameDate(date1, date2) {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
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

  // 显示年份选择器
  showYearPicker() {
    const { calendarCurrentDate } = this.data;
    const currentYear = calendarCurrentDate.getFullYear();
    const years = [];
    const startYear = currentYear - 50;
    const endYear = currentYear + 50;
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    
    const selectedIndex = years.indexOf(currentYear);
    
    this.setData({
      yearPickerYears: years,
      yearPickerIndex: [selectedIndex],
      selectedYear: currentYear,
      showYearPicker: true
    });
  },

  // 隐藏年份选择器
  hideYearPicker() {
    this.setData({
      showYearPicker: false
    });
  },

  // 年份选择器滚动事件
  onYearPickerChange(e) {
    const values = e.detail.value;
    const yearIndex = values[0];
    const { yearPickerYears } = this.data;
    const selectedYear = yearPickerYears[yearIndex];
    
    this.setData({
      yearPickerIndex: [yearIndex],
      selectedYear: selectedYear
    });
  },

  // 确认年份选择
  confirmYear() {
    const { selectedYear, calendarCurrentDate } = this.data;
    if (selectedYear) {
      const newDate = new Date(selectedYear, calendarCurrentDate.getMonth(), 1);
      this.setData({ 
        calendarCurrentDate: newDate,
        showYearPicker: false
      });
      this.generateCalendar();
    }
  },

  // 从日历选择日期
  selectDateFromCalendar(e) {
    const isEmpty = e.currentTarget.dataset.isEmpty;
    if (isEmpty) return;
    
    const dateStr = e.currentTarget.dataset.date;
    if (!dateStr) return;
    
    const selectedDate = new Date(dateStr);

    // --- 关键修改：保留当前已经选好的时间 ---
    const { hour, minute } = this.data.selectedTime;
    selectedDate.setHours(hour);
    selectedDate.setMinutes(minute);

    this.setData({
      selectedDate: selectedDate,
      showDatePicker: false,
      dateDisplayText: this.getDateDisplayText(selectedDate)
    });
    this.generateCalendar();
  },

  // 时间选择器滚动事件
  onTimePickerChange(e) {
    const values = e.detail.value;
    const hour = parseInt(values[0]);
    const minute = parseInt(values[1]);
    
    // 同步更新 selectedDate 里的时间
    let newDate = this.data.selectedDate || new Date();
    newDate.setHours(hour);
    newDate.setMinutes(minute);

    this.setData({
      'selectedTime.hour': hour,
      'selectedTime.minute': minute,
      selectedDate: newDate,
      timePickerIndex: [hour, minute],
      timeDisplayText: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    });
  },

  // 格式化日期显示
  getDateDisplayText(date) {
    if (!date) return this.getI18n().t('today');
    
    const dateObj = new Date(date);
    const today = new Date();
    
    // 判断是否是Today
    if (this.isSameDate(dateObj, today)) {
      return this.getI18n().t('today');
    }
    
    // 格式化日期：2025.12.19（只显示年月日）
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}.${month}.${day}`;
  },

  // 保存提醒
  saveTip() {
    const { tipTitle, selectedDate, selectedTime, editingTipId } = this.data;
    
    // 验证标题
    if (!tipTitle || tipTitle.trim() === '') {
      ty.showToast({
        title: this.getI18n().t('please_enter_title'),
        icon: 'none'
      });
      return;
    }
    
    // 验证日期
    if (!selectedDate) {
      ty.showToast({
        title: this.getI18n().t('please_select_date'),
        icon: 'none'
      });
      return;
    }
    
    // 创建日期时间对象
    const dateTime = new Date(selectedDate);
    dateTime.setHours(selectedTime.hour);
    dateTime.setMinutes(selectedTime.minute);
    dateTime.setSeconds(0);
    dateTime.setMilliseconds(0);
    
    // 使用对象参数形式获取存储数据
    const storageResult = ty.getStorageSync({ key: 'tips' });
    let rawTips = (storageResult && storageResult.data !== undefined) ? storageResult.data : (storageResult || []);
    
    // 确保rawTips是数组
    if (!Array.isArray(rawTips)) {
      console.warn('tips is not an array, resetting to empty array');
      rawTips = [];
    }
    
    if (editingTipId) {
      // 编辑模式：更新现有提醒
      const index = rawTips.findIndex(t => t.id === editingTipId);
      if (index > -1) {
        rawTips[index] = {
          ...rawTips[index],
          title: tipTitle.trim(),
          date: selectedDate.toISOString ? selectedDate.toISOString() : selectedDate,
          time: { ...selectedTime },
          dateTime: dateTime.toISOString()
        };
      }
    } else {
      // 新建模式：创建新提醒
      const newTip = {
        id: Date.now().toString(),
        title: tipTitle.trim(),
        date: selectedDate.toISOString ? selectedDate.toISOString() : selectedDate,
        time: { ...selectedTime },
        dateTime: dateTime.toISOString()
      };
      rawTips.push(newTip);
    }
    
    // 重置表单并跳转的辅助函数
    const resetFormAndNavigate = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      this.setData({
        tipTitle: '',
        editingTipId: null,
        selectedDate: now,
        selectedTime: {
          hour: hour,
          minute: minute
        },
        timePickerIndex: [hour, minute],
        dateDisplayText: this.getDateDisplayText(now),
        timeDisplayText: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        activeTab: 'schedule' // 跳转到我的日程页面
      });
      
      // 切换标签页后，重新加载数据（确保在页面切换后加载）
      setTimeout(() => {
        this.loadTips();
      }, 50);
      
      // 显示保存成功提示
      ty.showToast({
        title: this.getI18n().t('saved_successfully'),
        icon: 'success',
        duration: 2000
      });
    };
    
    // 参照 exercise.js 第774-785行：保存到storage，使用setStorage确保UTF-8编码正确处理
    try {
      ty.setStorage({
        key: 'tips',
        data: rawTips,
        success: (res) => {
          console.log('提醒保存到本地存储成功');
          // 先重置表单并跳转到我的日程页面
          resetFormAndNavigate();
        },
        fail: (err) => {
          console.error('提醒保存到本地存储失败:', err);
          // 降级方案：使用 setStorageSync（对象参数形式）
          try {
            ty.setStorageSync({ key: 'tips', data: rawTips });
            // 先重置表单并跳转到我的日程页面
            resetFormAndNavigate();
          } catch (syncError) {
            console.error('setStorageSync 也失败:', syncError);
            ty.showToast({
              title: this.getI18n().t('save_failed'),
              icon: 'none'
            });
            return;
          }
        }
      });
    } catch (error) {
      console.error('保存提醒到本地存储失败:', error);
      ty.showToast({
        title: this.getI18n().t('save_failed'),
        icon: 'none'
      });
      return;
    }
  },

  // 编辑提醒
  editTip(e) {
    const id = e.currentTarget.dataset.id;
    const tip = this.data.tips.find(t => t.id === id);
    
    if (!tip) return;
    
    const date = new Date(tip.date);
    const { hour, minute } = tip.time;
    
    this.setData({
      activeTab: 'tips',
      tipTitle: tip.title,
      selectedDate: date,
      selectedTime: { ...tip.time },
      editingTipId: id,
      timePickerIndex: [hour, minute],
      dateDisplayText: this.getDateDisplayText(date),
      timeDisplayText: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    });
    
    // 更新日历显示
    this.setData({
      calendarCurrentDate: new Date(date.getFullYear(), date.getMonth(), 1)
    });
    this.generateCalendar();
  },
  
  // 删除提醒
  deleteTip(e) {
    // 1. 获取要删除的 ID
    const deleteId = e.currentTarget.dataset.id || this.data.editingTipId;
    if (!deleteId) return;

    // 2. 准备数据
    const originalTips = JSON.parse(JSON.stringify(this.data.tips || []));
    const updatedTips = originalTips.filter(t => t.id !== deleteId);
    
    // 使用对象参数形式获取原始非格式化的存储数据用于持久化
    const storageResult = ty.getStorageSync({ key: 'tips' });
    let rawTips = (storageResult && storageResult.data !== undefined) ? storageResult.data : (storageResult || []);
    const newRawTips = rawTips.filter(t => t.id !== deleteId);

    // 3. 立即更新 UI
    this.setData({ 
      tips: updatedTips,
      activeTab: 'schedule', 
      editingTipId: null,
      tipTitle: '',
      showDatePicker: false,
      showTimePicker: false
    });

    // 4. 保存到本地存储
    try {
      ty.setStorage({
        key: 'tips',
        data: newRawTips,
        success: () => {
          console.log('✓ 提醒已从本地存储删除');
        },
        fail: (err) => {
          console.error('✗ 本地存储失败:', err);
          // 降级方案：使用 setStorageSync（对象参数形式）
          try {
            ty.setStorageSync({ key: 'tips', data: newRawTips });
            console.log('✓ 提醒已从本地存储删除（使用同步方法）');
          } catch (syncError) {
            console.error('setStorageSync 也失败:', syncError);
            // 回滚 UI
            this.setData({ tips: originalTips });
            ty.showToast({
              title: this.getI18n().t('delete_failed'),
              icon: 'none'
            });
          }
        }
      });
    } catch (error) {
      console.error('删除提醒失败:', error);
      // 回滚 UI
      this.setData({ tips: originalTips });
      ty.showToast({
        title: this.getI18n().t('delete_failed'),
        icon: 'none'
      });
    }
  },
  // 返回
  onBack() {
    const { activeTab } = this.data;
    
    // 如果在 Tips 标签页（创建/编辑页面），先切换到日程列表
    if (activeTab === 'tips') {
      this.setData({ 
        activeTab: 'schedule',
        showDatePicker: false,
        showTimePicker: false
      });
    } else {
      // 如果在日程列表页，才真正返回
      ty.navigateBack();
    }
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    // catchtap 本身已经阻止了冒泡，这个方法只需要是空函数
    // 不需要调用 e.stopPropagation()，因为在涂鸦小程序框架中这不是一个有效的方法
  }
});
