// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

Page({
  data: {
    userName: 'Dkkd',
    date: '',
    caloriesBurned: 128,
    duration: '00:01:36',
    hrBpm: 0,
    avgSpeed: '1.3',
    incline: 9,
    distance: '0.7',
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    pageTitle: '',
    kcalUnit: '',
    caloriesLabel: '',
    workoutTimeLabel: '',
    hrBpmLabel: '',
    speedLabel: '',
    inclineLabel: '',
    distanceLabel: ''
  },
  onLoad(options) {
    // 确保 I18n 已初始化（如果全局未定义，使用工具类实例）
    const currentI18n = global.I18n || I18nUtil;
    
    // 获取当天日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}/${month}/${day}`;
    
    // 根据系统语言初始化国际化文本
    this.setData({
      pageTitle: currentI18n.t('congratulations'),
      kcalUnit: currentI18n.t('kcal'),
      caloriesLabel: currentI18n.t('calories'),
      workoutTimeLabel: currentI18n.t('workout_time'),
      hrBpmLabel: currentI18n.t('hr_bpm'),
      speedLabel: currentI18n.t('speed_kmh_label'),
      inclineLabel: currentI18n.t('incline'),
      distanceLabel: currentI18n.t('distance_km_label'),
      date: todayStr
    });
    ty.hideMenuButton({ success: () => {
      console.log('hideMenuButton success');
    }, fail: (error) => {
      console.log('hideMenuButton fail', error);
    } });
    let exerciseData = null;
    
    // 优先从URL参数获取数据
    if (options.id) {


      const duration = parseInt(options.duration);
      const speed = parseFloat(options.speed);
      const speedKmh = parseFloat(options.speedKmh);
      const calories = parseFloat(options.calories);
      const distance = parseFloat(options.distance);
      const watt = parseFloat(options.watt);
      const hrBpmFromOptions = parseFloat(options.hrBpm);
      const heartRateFromOptions = parseFloat(options.heartRate);
      const inclineFromOptions = parseFloat(options.incline);
      
      exerciseData = {
        id: options.id,
        duration: !isNaN(duration) ? duration : 0,
        speed: !isNaN(speed) ? speed : 0,
        speedKmh: !isNaN(speedKmh) ? speedKmh : 0,
        calories: !isNaN(calories) ? calories : 0,
        distance: !isNaN(distance) ? distance : 0.00,
        watt: !isNaN(watt) ? watt : 0,
        hrBpm: !isNaN(hrBpmFromOptions) ? hrBpmFromOptions : (!isNaN(heartRateFromOptions) ? heartRateFromOptions : null),
        heartRate: !isNaN(heartRateFromOptions) ? heartRateFromOptions : null,
        incline: !isNaN(inclineFromOptions) ? inclineFromOptions : null,
        dateCongrats: options.dateCongrats || ''
      };
    } else {
      // 如果没有URL参数，从storage获取最新记录
      const storageResult = ty.getStorageSync({ key: 'treadmill_history' });
      // 处理返回结果：可能是直接返回数据，也可能是 { data: ... } 格式
      const rawHistory = (storageResult && storageResult.data !== undefined) ? storageResult.data : storageResult;
      const history = (rawHistory && Array.isArray(rawHistory)) ? rawHistory : [];
      if (Array.isArray(history) && history.length > 0) {
        exerciseData = history[0]; // 最新的记录
      }
    }
    
    if (exerciseData) {
      // 格式化时间：从秒转换为 "HH:MM:SS"
      const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = secs.toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      };
      
      // 获取用户名（可以从storage获取或使用默认值）
      const userName = ty.getStorageSync('userName') || 'Dkkd';
      
      // 格式化数据
      const durationFormatted = exerciseData.durationFormatted || formatTime(exerciseData.duration);
      const caloriesBurned = Math.round(exerciseData.calories);
      const hrBpm = exerciseData.hrBpm != null && !isNaN(exerciseData.hrBpm)
        ? exerciseData.hrBpm
        : (exerciseData.heartRate != null && !isNaN(exerciseData.heartRate)
          ? exerciseData.heartRate
          : (exerciseData.rpm != null && !isNaN(exerciseData.rpm) ? exerciseData.rpm : 0));
      const distance = exerciseData.distance ? exerciseData.distance.toFixed(2) : '0.7';
      
      // 优先使用传递的speed值，如果没有则使用speedKmh，最后才计算平均速度
      const durationInHours = exerciseData.duration > 0 ? exerciseData.duration / 3600 : 0;
      let avgSpeed = '1.3';
      if (exerciseData.speed && exerciseData.speed > 0) {
        // 优先使用传递的speed值（与exercise页面显示的值一致）
        avgSpeed = parseFloat(exerciseData.speed).toFixed(1);
      } else if (exerciseData.speedKmh && exerciseData.speedKmh > 0) {
        // 如果没有speed，使用speedKmh
        avgSpeed = parseFloat(exerciseData.speedKmh).toFixed(1);
      } else if (durationInHours > 0) {
        // 最后才使用计算的平均速度作为后备
        avgSpeed = (parseFloat(distance) / durationInHours).toFixed(1);
      }
      
      const incline = exerciseData.incline != null && !isNaN(exerciseData.incline) ? exerciseData.incline : 0;
      const date = exerciseData.dateCongrats || exerciseData.dateFormatted || todayStr;
      
      this.setData({
        userName: userName,
        date: date,
        caloriesBurned: caloriesBurned,
        duration: durationFormatted,
        hrBpm: hrBpm,
        avgSpeed: avgSpeed,
        incline: incline,
        distance: distance
      });
    }
  },
  goBack() {
    ty.navigateBack();
  }
});
