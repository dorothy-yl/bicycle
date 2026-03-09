// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

Page({
  data: {
    activeButton: null, // 'time' | 'calories' | 'distance'
    showModal: false,
    statusBarHeight: 20, // Default fallback
    
    // Picker data
    range: [],
    pickerIndex: [0],
    unitText: '',
    currentValue: 0,
    titleText: '', // Title text for the blue box
    
    // Selected values
    selectedValues: {
      time: 1,
      calories: 100,
      distance: 0.5
    },
    
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    setGoalsLabel: '',
    timeLabel: '',
    caloriesLabel: '',
    distanceLabel: '',
    confirmLabel: ''
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
    
    // 初始化国际化文本
    this.setData({
      setGoalsLabel: currentI18n.t('set_goals'),
      timeLabel: currentI18n.t('time'),
      caloriesLabel: currentI18n.t('calories'),
      distanceLabel: currentI18n.t('distance'),
      confirmLabel: currentI18n.t('confirm')
    });
    
    // Get system info for status bar height
    try {
      ty.hideMenuButton({ success: () => {
        console.log('hideMenuButton success');
      }, fail: (error) => {
        console.log('hideMenuButton fail', error);
      } });
      
      const sysInfo = ty.getSystemInfoSync();
      if (sysInfo.statusBarHeight) {
        this.setData({ statusBarHeight: sysInfo.statusBarHeight });
      }
    } catch (e) {
      console.error('Failed to get system info', e);
    }
  },

  goBack() {
    if (this.data.showModal) {
      this.closeModal();
    } else {
      ty.navigateBack();
    }
  },

  showTimePicker() {
    this.setData({ 
      activeButton: 'time',
      showModal: true
    });
    this.updatePickerData('time');
  },

  showCaloriesPicker() {
    this.setData({ 
      activeButton: 'calories',
      showModal: true
    });
    this.updatePickerData('calories');
  },

  showDistancePicker() {
    this.setData({ 
      activeButton: 'distance',
      showModal: true
    });
    this.updatePickerData('distance');
  },
  updatePickerData(type) {
    const { selectedValues } = this.data;
    let selectedValue = selectedValues[type];
    let minValue = 0;
    let maxValue = 100;
    let step = 1;
    let unitText = '';
    let titleText = '';
    
    const currentI18n = this.getI18n();
    
    switch(type) {
      case 'time':
        minValue = 1;
        maxValue = 60;
        step = 1;
        unitText = 'min';
        titleText = currentI18n.t('time');
        if (!selectedValue) selectedValue = 1;
        break;
      case 'calories':
        minValue = 100;
        maxValue = 1500;
        step = 100;
        unitText = 'kcal';
        titleText = currentI18n.t('calories');
        if (!selectedValue) selectedValue = 100;
        break;
      case 'distance':
        minValue = 0.5;
        maxValue = 50.0;
        step = 0.5;
        unitText = 'km';
        titleText = currentI18n.t('distance');
        if (!selectedValue) selectedValue = 0.5;
        break;
    }
    
    // 1. 生成完整range（保留1~60完整可滚动范围）
    const range = this.generateRange(minValue, maxValue, step);
    
    // 2. 找到选中值在完整range中的索引
    let originalIndex = -1;
    const strValue = step < 1 ? selectedValue.toFixed(1) : Math.round(selectedValue).toString();
    originalIndex = range.indexOf(strValue);
    if (originalIndex === -1) originalIndex = 0;
  
    // 3. 关键：设置pickerIndex为选中项索引（选择器会自动滚动到该位置，且只显示5行）
    // 选择器的显示行数由UI层控制（比如picker组件设置`visible-item-count="5"`）
    this.setData({
      minValue,
      maxValue,
      step,
      unitText,
      titleText,
      currentValue: selectedValue,
      range, // 保留完整range，确保可滚动1~60
      pickerIndex: [originalIndex], // 选中项索引
      fullRange: range // 保留完整range备用（如果后续需要）
    });
  },

  generateRange(min, max, step) {
    let range = [];
    const count = Math.floor((max - min) / step) + 1;
    for (let i = 0; i < count; i++) {
      let val = min + i * step;
      if (step < 1) {
        range.push(val.toFixed(1));
      } else {
        range.push(Math.round(val).toString());
      }
    }
    return range;
  },

  onPickerChange(e) {
    const val = e.detail.value[0];
    const { range, activeButton, selectedValues, step } = this.data;
    
    if (val >= 0 && val < range.length) {
      const strValue = range[val];
      const numValue = parseFloat(strValue);
      
      this.setData({
        pickerIndex: [val],
        currentValue: numValue,
        selectedValues: {
          ...selectedValues,
          [activeButton]: numValue
        }
      });
    }
  },

  confirmGoal() {
    const { activeButton, currentValue } = this.data;
    console.log(`Set ${activeButton} goal to ${currentValue}`);
    
    // 关闭模态框
    this.closeModal();
    
    // 跳转到 exercise 页面，复用 target 页面的跳转逻辑
    ty.navigateTo({
      url: `/pages/exercise/exercise?goalType=${activeButton}&goalValue=${currentValue}`
    });
  },

  closeModal() {
    this.setData({ 
      showModal: false,
      activeButton: null
    });
  },

  stopPropagation() {
    // Prevent event bubbling to close modal when clicking on modal content
  }
});
