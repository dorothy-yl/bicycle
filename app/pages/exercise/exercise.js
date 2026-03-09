// 导入 I18n（如果全局 I18n 未定义，则从工具类导入）
const I18nUtil = require('../../utils/i18n.js');
// 使用全局 I18n 或工具类实例
const I18n = global.I18n || I18nUtil;

function formatDpState(dpState) {
    return Object.keys(dpState).map(dpCode => ({ code: Number(dpCode), value: dpState[dpCode] }));
}


const DP = {
  sportState: 106, // 运动状态（枚举）
  speed: 112,
  distance: 103,
  calories: 105,
  workoutTime: 108,
  heartRate: 110,
  resistance: 107, // 阻力
  incline: 114 // 扬升/坡度
};

const SPORT_STATE_DP_VALUE_NUMBER = {
  START: 0,
  PAUSE: 1,
  STOP: 2
};

const SPORT_STATE_DP_VALUE_STRING = {
  START: 'Start',
  PAUSE: 'Pause',
  STOP: 'Stop'
};

Page({
  data: {
    isPaused: false,
    elapsedTime: 0, 
    heartRate: 0,
    distance: 0,
    formattedTime: '00:00:00',
    calories: 0,
    watt: 0,
    speed: 0.5,
    load: 1,
    incline: 0,
    gaugeProgressStyle: '',
    knobAngle: 220, // Start angle
    // 目标模式相关
    isGoalMode: false,
    goalType: null, // 'time', 'distance', 'calories'
    goalValue: 0,
    // 页面标题（初始化为空，在 onLoad 中根据系统语言设置）
    pageTitle: '',
    // 倒计时相关
    countdownTime: 0, // 倒计时剩余时间（秒）
    // 初始值记录（用于计算从0开始的距离和卡路里）
    initialDistance: 0,
    initialCalories: 0,
    goalCompleted: false, // 目标是否已完成
    // 速度限制（从dp点获取）
    maxSpeed: 999999, // 默认值，将从dp点115获取
    minSpeed: 0, // 默认值，将从dp点116获取
    // 扬升限制（从dp点获取）
    maxAscension: 15, // 默认值，将从dp点117获取
    minAscension: 0, // 默认值，将从dp点118获取
    // 国际化文本（初始化为空，在 onLoad 中根据系统语言设置）
    speedKmhLabel: '',
    caloriesKcalLabel: '',
    workoutTimeLabel: '',
    hrBpmLabel: '',
    powerWLabel: '',
    distanceKmLabel: '',
    loadLabel: '',
    inclineLabel: '',
    startHoldStopLabel: '',
    // 按钮点击状态
    isDecreaseSpeedPressed: false,
    isIncreaseSpeedPressed: false
  },
  timer: null,
  tempLoad: null, // 临时存储滑动过程中的load值
  throttleTimer: null, // 节流定时器
  throttledUpdateVisual: null, // 节流后的视觉更新函数
  maxResistance: null, // 最大阻力值
  minResistance: null, // 最小阻力值
  resistanceSum: 0, // 阻力总和
  resistanceCount: 0 ,// 阻力计数
  isStopping: false, // 防止重复处理停止逻辑
  deviceInfo: null, // 设备信息缓存（在线/蓝牙状态）
  publishInFlightMap: null, // DP下发队列锁
  publishQueueMap: null, // DP下发待发送缓存
  publishDebounceTimers: null, // DP下发防抖计时器
  dpMaxResistance: null, // 设备上报的最大阻力
  deviceId: '',
  mainActionLocked: false,
  longPressTriggered: false,
  maxSpeedDuring: null,
  minSpeedDuring: null,
  maxInclineDuring: null,
  minInclineDuring: null,
  endingWorkout: false,
  sportStateDpMode: null,
  sportStateValueMap: { ...SPORT_STATE_DP_VALUE_STRING, END: SPORT_STATE_DP_VALUE_STRING.STOP },
  gaugeDpId: DP.resistance,
  speedUiLocked: false,
  pendingSpeedValue: null,
  speedUnlockTimer: null,
  lastDeviceSpeedValue: null,
  inclineUiLocked: false,
  pendingInclineValue: null,
  inclineUnlockTimer: null,
  

  /**
   * 获取 I18n 实例的辅助方法
   * 优先使用全局 I18n，如果未定义则使用工具类实例
   */
  getI18n() {
    return global.I18n || I18nUtil;
  },

  getDeviceId() {
    const launchOptions = ty.getLaunchOptionsSync();
    return this.deviceId || launchOptions.query?.deviceId || launchOptions.query?.devId;
  },

  getGaugeDpId() {
    return this.gaugeDpId || DP.resistance;
  },

  resetWorkoutStats() {
    this.maxSpeedDuring = null;
    this.minSpeedDuring = null;
    this.maxInclineDuring = null;
    this.minInclineDuring = null;
    this.endingWorkout = false;
    this.isStopping = false;
  },

  trackSpeed(value) {
    if (!this.isRunning) return;
    const speedValue = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(speedValue) || speedValue <= 0) return;
    if (this.maxSpeedDuring === null || speedValue > this.maxSpeedDuring) {
      this.maxSpeedDuring = speedValue;
    }
    if (this.minSpeedDuring === null || speedValue < this.minSpeedDuring) {
      this.minSpeedDuring = speedValue;
    }
  },

  trackIncline(value) {
    if (!this.isRunning) return;
    const inclineValue = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(inclineValue)) return;
    if (this.maxInclineDuring === null || inclineValue > this.maxInclineDuring) {
      this.maxInclineDuring = inclineValue;
    }
    if (this.minInclineDuring === null || inclineValue < this.minInclineDuring) {
      this.minInclineDuring = inclineValue;
    }
  },

  getInclineValue() {
    const inclineRaw = this.data.incline !== undefined ? this.data.incline : this.data.load;
    const inclineValue = typeof inclineRaw === 'number' ? inclineRaw : parseFloat(inclineRaw);
    return Number.isFinite(inclineValue) ? inclineValue : 0;
  },

  getWorkoutSummaryForUpload() {
    const speedValue = parseFloat(this.data.speed) || 0;
    const inclineValue = this.getInclineValue();
    const maxSpeed = this.maxSpeedDuring ?? (speedValue > 0 ? speedValue : 0);
    const minSpeed = this.minSpeedDuring ?? (speedValue > 0 ? speedValue : 0);
    const maxIncline = this.maxInclineDuring ?? inclineValue;
    const minIncline = this.minInclineDuring ?? inclineValue;
    const gaugeType = this.getGaugeDpId() === DP.incline ? 'incline' : 'resistance';
    return {
      speed: speedValue,
      maxSpeed,
      minSpeed,
      incline: inclineValue,
      maxIncline,
      minIncline,
      gaugeType,
      speedLimitMax: this.data.maxSpeed,
      speedLimitMin: this.data.minSpeed,
      inclineLimitMax: this.data.maxAscension,
      inclineLimitMin: this.data.minAscension
    };
  },

  updateSportStateDpMode(rawState) {
    if (rawState === undefined || rawState === null) return;
    if (typeof rawState === 'number') {
      this.sportStateDpMode = 'number';
      return;
    }
    const str = String(rawState);
    if (/^-?\d+$/.test(str)) {
      this.sportStateDpMode = 'number';
      return;
    }
    this.sportStateDpMode = 'string';
  },

  normalizeSportStateKey(rawState) {
    if (rawState === undefined || rawState === null) return null;
    if (typeof rawState === 'number') {
      if (rawState === 0) return 'START';
      if (rawState === 1) return 'PAUSE';
      if (rawState === 2) return 'STOP';
      return null;
    }
    const upper = String(rawState).toUpperCase();
    if (upper === '0') return 'START';
    if (upper === '1') return 'PAUSE';
    if (upper === '2') return 'STOP';
    if (upper === 'START') return 'START';
    if (upper === 'PAUSE') return 'PAUSE';
    if (upper === 'STOP' || upper === 'END') return 'STOP';
    return null;
  },

  getSportStateDpValue(stateKey) {
    const key = String(stateKey || '').toUpperCase();
    if (this.sportStateDpMode === 'number') {
      return SPORT_STATE_DP_VALUE_NUMBER[key];
    }
    if (this.sportStateValueMap && this.sportStateValueMap[key] !== undefined) {
      return this.sportStateValueMap[key];
    }
    return SPORT_STATE_DP_VALUE_STRING[key];
  },

  getBleConnectedFlag(deviceInfo) {
    if (!deviceInfo) return undefined;
    if (deviceInfo.isBleConnected !== undefined) return deviceInfo.isBleConnected;
    if (deviceInfo.bleConnected !== undefined) return deviceInfo.bleConnected;
    if (deviceInfo.bluetoothConnected !== undefined) return deviceInfo.bluetoothConnected;
    if (deviceInfo.btConnected !== undefined) return deviceInfo.btConnected;
    return undefined;
  },

  isDeviceReady(deviceInfo, label) {
    if (!deviceInfo) return true;
    if (deviceInfo.online === false) {
      console.warn('设备离线，DP下发被拦截', label || '', deviceInfo);
      ty.showToast({ title: this.getI18n().t('device_not_connected'), icon: 'none' });
      return false;
    }
    const bleConnected = this.getBleConnectedFlag(deviceInfo);
    if (bleConnected === false) {
      console.warn('蓝牙未连接，DP下发被拦截', label || '', deviceInfo);
      ty.showToast({ title: this.getI18n().t('device_not_connected'), icon: 'none' });
      return false;
    }
    return true;
  },

  refreshDeviceInfo(callback) {
    const deviceId = this.getDeviceId();
    if (!deviceId || !ty.device || !ty.device.getDeviceInfo) {
      callback && callback(this.deviceInfo);
      return;
    }
    ty.device.getDeviceInfo({
      deviceId,
      success: (info) => {
        this.deviceInfo = info;
        callback && callback(info);
      },
      fail: (err) => {
        console.warn('获取设备信息失败，继续使用缓存', err);
        callback && callback(this.deviceInfo);
      }
    });
  },

  queuePublishDps(dps, options = {}, debounceMs = 120) {
    const queueKey = options.queueKey || 'default';
    if (!this.publishDebounceTimers) this.publishDebounceTimers = {};
    if (this.publishDebounceTimers[queueKey]) {
      clearTimeout(this.publishDebounceTimers[queueKey]);
    }
    this.publishDebounceTimers[queueKey] = setTimeout(() => {
      this.publishDpsSafe(dps, { ...options, queueKey });
    }, debounceMs);
  },

  publishDpsSafe(dps, { success, fail, label, mode, pipelines, queueKey } = {}) {
    const deviceId = this.getDeviceId();
    if (!deviceId) {
      console.warn('deviceId不存在，DP下发被忽略', label || '');
      ty.showToast({ title: this.getI18n().t('device_not_found'), icon: 'none' });
      return;
    }

    const cleanedDps = {};
    Object.keys(dps || {}).forEach((key) => {
      const value = dps[key];
      if (value !== undefined && value !== null) {
        cleanedDps[key] = value;
      }
    });

    if (!Object.keys(cleanedDps).length) {
      console.warn('DP下发数据为空，已忽略', label || '');
      return;
    }

    if (queueKey) {
      if (!this.publishInFlightMap) this.publishInFlightMap = {};
      if (!this.publishQueueMap) this.publishQueueMap = {};
      if (this.publishInFlightMap[queueKey]) {
        this.publishQueueMap[queueKey] = {
          dps: cleanedDps,
          options: { success, fail, label, mode, pipelines, queueKey }
        };
        console.log('DP下发排队中', label || '', cleanedDps);
        return;
      }
    }

    const resolvedMode = mode !== undefined ? mode : 2; // 0: LAN, 1: Network, 2: Auto
    const resolvedPipelines = pipelines || [0, 1, 3]; // 优先使用 LAN/MQTT/BLE，减少无效通道

    const finalizeQueue = () => {
      if (!queueKey) return;
      this.publishInFlightMap[queueKey] = false;
      const pending = this.publishQueueMap[queueKey];
      if (pending) {
        delete this.publishQueueMap[queueKey];
        this.publishDpsSafe(pending.dps, pending.options);
      }
    };

    const doPublish = () => {
      if (queueKey) {
        this.publishInFlightMap[queueKey] = true;
      }
      ty.device.publishDps({
        deviceId,
        dps: cleanedDps,
        mode: resolvedMode,
        pipelines: resolvedPipelines,
        success: (res) => {
          success && success(res);
          finalizeQueue();
        },
        fail: (err) => {
          console.error('DP下发失败', label || '', {
            deviceId,
            dps: cleanedDps,
            err
          });
          fail && fail(err);
          finalizeQueue();
        }
      });
    };

    this.refreshDeviceInfo((info) => {
      if (!this.isDeviceReady(info, label)) {
        fail && fail({ errorCode: 'PRECHECK_BLOCK', errorMsg: 'device offline or bluetooth disconnected' });
        return;
      }
      doPublish();
    });
  },

  lockMainAction() {
    if (this.mainActionLocked) return true;
    this.mainActionLocked = true;
    clearTimeout(this.mainActionLockTimer);
    this.mainActionLockTimer = setTimeout(() => {
      this.mainActionLocked = false;
    }, 500);
    return false;
  },
  
  onLoad(options) {
    // 确保 I18n 已初始化（如果全局未定义，使用工具类实例）
    const currentI18n = this.getI18n();
    
    // 初始化所有翻译文本到 data 中
    this.setData({
      speedKmhLabel: currentI18n.t('speed_kmh'),
      caloriesKcalLabel: currentI18n.t('calories_kcal'),
      workoutTimeLabel: currentI18n.t('workout_time'),
      hrBpmLabel: currentI18n.t('hr_bpm'),
      powerWLabel: currentI18n.t('power_w'),
      distanceKmLabel: currentI18n.t('distance_km'),
      loadLabel: currentI18n.t('load'),
      inclineLabel: currentI18n.t('incline'),
      startHoldStopLabel: currentI18n.t('start_hold_stop')
    });
    
    // 如果页面标题未设置，根据系统语言设置默认标题
    if (!this.data.pageTitle) {
      this.setData({
        pageTitle: currentI18n.t('quick_start')
      });
    }
    
    ty.hideMenuButton({ success: () => {
      console.log('hideMenuButton success');
    }, fail: (error) => {
      console.log('hideMenuButton fail', error);
    } });
    console.log('Exercise Page Load', options);

    const launchOptions = ty.getLaunchOptionsSync();
    const resolvedDeviceId = options?.deviceId || launchOptions.query?.deviceId || launchOptions.query?.devId;
    if (resolvedDeviceId) {
      this.deviceId = resolvedDeviceId;
      this.refreshDeviceInfo();
    } else {
      console.warn('deviceId不存在，DP下发将失败');
    }
    
    // 检查是否是目标模式
    const goalType = options.goalType;
    const goalValue = parseFloat(options.goalValue);
    
    if (goalType && goalValue) {
      this.setData({
        isGoalMode: true,
        goalType: goalType,
        goalValue: goalValue,
        pageTitle: currentI18n.t('target_pattern')
      });
      
      // 如果是时间目标，初始化倒计时
      if (goalType === 'time') {
        const countdownSeconds = goalValue * 60; // 转换为秒
        this.setData({
          countdownTime: countdownSeconds,
          formattedTime: this.formatTime(countdownSeconds)
        });
      }
    }
    
    // 初始化停止标志
    this.isRunning = false,   // 是否正在运动
    this.isPausing = false,   // 是否处于暂停
    this.isStopping = false   // 是否正在结束
    this.resetWorkoutStats();
    
    // 初始化目标模式的初始值记录（用于从0开始计算）
    if (this.data.isGoalMode) {
      this.initialDistance = null; // 使用null表示尚未记录初始值
      this.initialCalories = null; // 使用null表示尚未记录初始值
    }
    
    this.startTimer();
    this.updateGauge(this.data.load);
    
    // 初始化阻力跟踪
    this.maxResistance = this.data.load;
    this.minResistance = this.data.load;
    this.resistanceSum = this.data.load;
    this.resistanceCount = 1;
    
    // 确保初始阻力值不为0，以便硬件开始上报RPM和Watt
    if (this.data.load === 0) {
      this.setData({ load: 1 });
      this.updateGauge(1);
    }
    
    // 初始化节流函数
    this.throttledUpdateVisual = this.throttle((value) => {
      this.updateGaugeVisual(value);
    }, 100);

    this.debouncedUpdateLoadNumber = this.debounce((finalLoad) => {
      // 这里的逻辑：松手后更新load对应的数字（如果有单独的数字展示，可在此处修改）
      // 若load本身就是要显示的数字，此函数内可无需额外逻辑（因为handleTouchEnd已更新load）
      // 若有其他数字需要同步更新，在此处添加 setData 即可，例如：
      // this.setData({ loadNumber: finalLoad });
    }, 200);
// 原生调用方式
const { onDpDataChange, registerDeviceListListener } = ty.device;
const deviceId = this.getDeviceId();
 
const _onDpDataChange = (event) => {
  // console.log(formatDpState(event.dps));
console.log('dp点数组:'+ JSON.stringify(formatDpState(event.dps)));
const dpID = formatDpState(event.dps);  //dpID 数组
dpID.forEach(element => {
  if (element.code === DP.sportState) { // 只判断code=106，再处理不同的value
    const rawState = element.value;
    this.updateSportStateDpMode(rawState);
    const sportStateKey = this.normalizeSportStateKey(rawState);
    console.log('硬件上报运动状态:', sportStateKey, rawState);

    // 避免重复处理（结合isStopping/isStarting等状态）
    switch (sportStateKey) {
      case 'START':
        if (!this.isRunning) {
          this.handleStartExercise(false); // false：硬件主动开始，软件不回发指令
        } else if (this.data.isPaused) {
          this.setData({ isPaused: false });
        }
        this.isRunning = true;
        this.isPausing = false;
        break;

      case 'PAUSE':
        if (this.isRunning && !this.isPausing) {
          this.handlePauseExercise(false); // 处理暂停逻辑
        } else {
          this.setData({ isPaused: true });
        }
        break;

      case 'STOP':
        this.isRunning = false;
        this.isPausing = false;
        this.setData({ isPaused: false });
        if (!this.isStopping && !this.endingWorkout) {
          this.handleStopExercise(false); // 处理结束逻辑
        }
        break;
    }
    return;
  }
  //速度
  if (element.code == DP.speed) {
    const rawSpeedValue = Number(element.value);
    if (!Number.isFinite(rawSpeedValue)) {
      return;
    }
    const speedValue = (rawSpeedValue % 1 !== 0 && rawSpeedValue <= 30)
      ? rawSpeedValue
      : rawSpeedValue / 10;
    if (Number.isFinite(speedValue)) {
      const pending = this.pendingSpeedValue;
      const pendingNum = pending === null || pending === undefined ? null : Number(pending);
      const tolerance = 0.11;
      
      if (this.speedUiLocked && pendingNum !== null) {
        // 在锁定期内，只接受与pendingSpeedValue匹配的值
        if (Math.abs(speedValue - pendingNum) <= tolerance) {
          this.lastDeviceSpeedValue = speedValue;  // 只有匹配时才更新
          this.unlockSpeedUi();
          this.setData({ speed: speedValue.toFixed(1) });
          this.trackSpeed(speedValue);
        }
        // 不匹配的值完全忽略，不更新UI，也不更新lastDeviceSpeedValue
        return;
      }
      
      // 未锁定状态，正常更新
      this.lastDeviceSpeedValue = speedValue;
      this.setData({ speed: speedValue.toFixed(1) });
      this.trackSpeed(speedValue);
    }
  }

  // 时间 - DP 108 (Workout Time)
  if(element.code == DP.workoutTime) {
    if (this.data.isGoalMode && this.data.goalType === 'time') {
      // 目标模式下的时间目标：使用倒计时，不直接使用硬件上报的时间
      // 但可以用于记录实际运动时间
      // 这里不做处理，由定时器控制倒计时
    } else {
      // 非目标模式或非时间目标：正常使用硬件上报的时间
      this.setData({
        elapsedTime: element.value,
        formattedTime: this.formatTime(element.value)
      });
    }
  }
  //心率 - DP 110
  if(element.code == DP.heartRate) {
    this.setData({
      heartRate: element.value
    });
  }
  // 距离 - DP 103 (里程)
  if (element.code == DP.distance) {
    const rawDistance = element.value / 100;
    if (this.data.isGoalMode) {
      // 目标模式：从0开始
      if (this.initialDistance === null) {
        this.initialDistance = rawDistance;
      }
      const currentDistance = Math.max(0, rawDistance - this.initialDistance);
      this.setData({
        distance: currentDistance.toFixed(2)
      });
      // 检查目标完成
      if (this.data.goalType === 'distance' && currentDistance >= this.data.goalValue) {
        this.checkGoalCompleted();
      }
    } else {
      this.setData({
        distance: rawDistance.toFixed(2)
      });
    }
  }
 // 卡路里 - DP 105
 if(element.code == DP.calories) {
  console.log('卡路里:', element.value);
  const rawCalories = element.value ;
  if (this.data.isGoalMode) {
    // 目标模式：从0开始
    if (this.initialCalories === null) {
      this.initialCalories = rawCalories;
    }
    const currentCalories = Math.max(0, rawCalories - this.initialCalories);
    this.setData({
      calories: currentCalories.toFixed(0)
    });
    // 检查目标完成
    if (this.data.goalType === 'calories' && currentCalories >= this.data.goalValue) {
      this.checkGoalCompleted();
    }
  } else {
    this.setData({
      calories: rawCalories.toFixed(0)
    });
  }
}
  //阻力 - DP 107
  if(element.code == DP.resistance) {
    console.log('阻力:', element.value);
    const loadValue = element.value;
    if (!this.gaugeDpId || this.gaugeDpId === DP.resistance) {
      this.gaugeDpId = DP.resistance;
      this.setData({
        load: loadValue
      });
    }
  }
  // 最大速度限制 (dp点115)
  if(element.code == 115) {
    console.log('最大速度限制:', element.value);
    const maxSpeedValue = Number(element.value);
    this.setData({
      maxSpeed: Number.isFinite(maxSpeedValue) ? (maxSpeedValue / 10) : this.data.maxSpeed
    });
  }
  // 最小速度限制 (dp点116)
  if(element.code == 116) {
    console.log('最小速度限制:', element.value);
    const minSpeedValue = Number(element.value);
    this.setData({
      minSpeed: Number.isFinite(minSpeedValue) ? (minSpeedValue / 10) : this.data.minSpeed
    });
  }
  // 最大扬升限制 (dp点117)
  if(element.code == 117) {
    console.log('最大扬升限制:', element.value);
    this.setData({
      maxAscension: element.value
    });
  }
  // 最小扬升限制 (dp点118)
  if(element.code == 118) {
    console.log('最小扬升限制:', element.value);
    this.setData({
      minAscension: element.value
    });
  }
  //扬升 - DP 114
  if(element.code == DP.incline) {
    console.log('扬升:', element.value);
    const inclineValue = Number(element.value);
    if (!Number.isFinite(inclineValue)) {
      return;
    }
    
    const pending = this.pendingInclineValue;
    const pendingNum = pending === null || pending === undefined ? null : Number(pending);
    const tolerance = 0.5; // 坡度容差
    
    if (this.inclineUiLocked && pendingNum !== null) {
      // 在锁定期内，只接受与pendingInclineValue匹配的值
      if (Math.abs(inclineValue - pendingNum) <= tolerance) {
        this.unlockInclineUi();
        this.gaugeDpId = DP.incline;
        this.setData({
          incline: inclineValue,
          load: inclineValue
        });
        // 同步更新视觉位置，确保显示值与滑块位置一致
        this.updateGauge(inclineValue);
        this.trackIncline(inclineValue);
      }
      // 不匹配的值完全忽略，不更新UI
      return;
    }
    
    // 未锁定状态，正常更新
    this.gaugeDpId = DP.incline;
    this.setData({
      incline: inclineValue,
      load: inclineValue
    });
    // 同步更新视觉位置，确保显示值与滑块位置一致
    this.updateGauge(inclineValue);
    this.trackIncline(inclineValue);
  }
  // DP 113 历史记录监听已移除 - 不再使用云端同步
});
}

if (deviceId) {
  registerDeviceListListener({
    deviceIdList: [deviceId],
    success: () => {
      console.log('registerDeviceListListener success');
    },
    fail: (error) => {
      console.log('registerDeviceListListener fail', error);
    }
    });
} else {
  console.warn('deviceId不存在，无法注册设备监听');
}
onDpDataChange(_onDpDataChange);
  },

  onShow() {
    if (!this.isRunning) {
      this.isStopping = false;
      this.endingWorkout = false;
    }
  },

  onUnload() {
    this.stopTimer();
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

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = secs.toString().padStart(2, '0');
    
    // 强制返回 HH:MM:SS 格式，不随小时是否为0变化
    return `${h}:${m}:${s}`; 
  },

  startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (!this.data.isPaused && !this.data.goalCompleted) {
        // 仅在「时间目标模式」下，使用本地定时器更新倒计时
        if (this.data.isGoalMode && this.data.goalType === 'time') {
          const newCountdown = this.data.countdownTime - 1;
          if (newCountdown <= 0) {
            this.setData({
              countdownTime: 0,
              formattedTime: this.formatTime(0),
              elapsedTime: this.data.goalValue * 60
            });
            this.checkGoalCompleted();
          } else {
            this.setData({
              countdownTime: newCountdown,
              formattedTime: this.formatTime(newCountdown),
              elapsedTime: this.data.goalValue * 60 - newCountdown
            });
          }
        }
        // 非时间目标模式下，不执行本地时间更新，避免与硬件上报冲突
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 处理开始运动
  handleStartExercise(sendCommand) {
    if (this.isRunning && !this.data.isPaused) {
      console.log('运动已在进行中，跳过重复开始');
      return;
    }
    
    const wasRunning = this.isRunning;
    const wasPaused = this.data.isPaused;
    if (!wasRunning) {
      this.resetWorkoutStats();
    }
    this.isRunning = true;
    this.isPausing = false;
    
    // 确保阻力值已设置（至少为1），这样硬件才能开始上报RPM和Watt
    const currentLoad = this.data.load || 1;
    
    // 先设置阻力，确保硬件开始上报数据
    this.publishDpsSafe(
      { [this.getGaugeDpId()]: currentLoad },
      {
        label: 'set_resistance_before_start',
        success: () => {
          console.log('阻力已设置:', currentLoad);
          this.updateGauge(currentLoad);

          // 阻力设置成功后再发送开始命令
          if (sendCommand) {
            this.publishDpsSafe(
              { [DP.sportState]: this.getSportStateDpValue('START') },
              {
                label: 'start_exercise',
                success: () => {
                  console.log('开始运动命令已发送');
                  this.setData({ isPaused: false });
                  if (wasPaused) {
                    ty.showToast({ title: this.getI18n().t('resumed'), icon: 'none' });
                  }
                }
              }
            );
          } else {
            this.setData({ isPaused: false });
          }
        },
        fail: () => {
          // 即使设置阻力失败，也继续发送开始命令
          if (sendCommand) {
            this.publishDpsSafe(
              { [DP.sportState]: this.getSportStateDpValue('START') },
              {
                label: 'start_exercise_after_resistance_fail',
                success: () => {
                  console.log('开始运动命令已发送');
                  this.setData({ isPaused: false });
                  if (wasPaused) {
                    ty.showToast({ title: this.getI18n().t('resumed'), icon: 'none' });
                  }
                }
              }
            );
          } else {
            this.setData({ isPaused: false });
          }
        }
      }
    );
  },

  // 处理暂停运动
  handlePauseExercise(sendCommand) {
    if (!this.isRunning) {
      console.log('运动未开始，无法暂停');
      return;
    }
    
    this.isPausing = true;
    
    if (sendCommand) {
      this.publishDpsSafe(
        { [DP.sportState]: this.getSportStateDpValue('PAUSE') },
        {
          label: 'pause_exercise',
          success: () => {
            console.log('暂停命令已发送');
            this.setData({ isPaused: true });
            ty.showToast({ title: this.getI18n().t('paused'), icon: 'none' });
          }
        }
      );
    } else {
      this.setData({ isPaused: true });
    }
  },

  togglePause() {
    this.handleMainActionTap();
  },

  handleMainActionTap() {
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }
    if (this.lockMainAction()) return;

    if (!this.isRunning || this.data.isPaused) {
      this.handleStartExercise(true);
    } else {
      this.handlePauseExercise(true);
    }
  },

  handleMainActionLongPress() {
    if (this.lockMainAction()) return;
    if (!this.isRunning) return;
    this.longPressTriggered = true;
    clearTimeout(this.longPressResetTimer);
    this.longPressResetTimer = setTimeout(() => {
      this.longPressTriggered = false;
    }, 600);
    ty.showModal({
      title: this.getI18n().t('end_workout'),
      content: this.getI18n().t('end_workout_confirm'),
      confirmText: this.getI18n().t('confirm'),
      cancelText: this.getI18n().t('cancel'),
      success: (res) => {
        if (res.confirm) {
          this.stopExercise();
        }
      }
    });
  },

  // 检查目标是否完成
  checkGoalCompleted() {
    if (this.data.goalCompleted) return; // 防止重复触发
    
    let completed = false;
    const { goalType, goalValue } = this.data;
    
    if (goalType === 'time') {
      // 时间目标：倒计时到0
      completed = this.data.countdownTime <= 0;
    } else if (goalType === 'distance') {
      // 距离目标：当前距离 >= 目标距离
      completed = parseFloat(this.data.distance) >= goalValue;
    } else if (goalType === 'calories') {
      // 卡路里目标：当前卡路里 >= 目标卡路里
      completed = parseFloat(this.data.calories) >= goalValue;
    }
    
    if (completed) {
      this.setData({ goalCompleted: true });
      // 暂停计时器
      this.setData({ isPaused: true });
      
      // 显示完成提示框
      ty.showModal({
        title: this.getI18n().t('goal_completed'),
        content: this.getI18n().t('goal_completed_message'),
        confirmText: this.getI18n().t('confirm'),
        cancelText: this.getI18n().t('cancel'),
        success: (res) => {
          if (res.confirm) {
            this.stopExercise();
          } else {
            // 取消：继续运动
            this.setData({ 
              goalCompleted: false,
              isPaused: false 
            });
          }
        }
      });
    }
  },

  stopExercise() {
    if (this.endingWorkout) return;
    this.endingWorkout = true;
    const currentI18n = this.getI18n();
    const now = new Date();
    const deviceId = this.getDeviceId();
    const exerciseRecord = this.buildExerciseRecord(now);

    try {
      ty.showLoading({ title: currentI18n.t('end_workout') });
    } catch (error) {}

    if (deviceId) {
      this.publishDpsSafe(
        { [DP.sportState]: this.getSportStateDpValue('STOP') },
        { label: 'stop_exercise', queueKey: 'sport_state' }
      );
    }

    this.isRunning = false;
    this.isPausing = false;
    this.setData({ isPaused: false });
    this.handleStopExercise(true, exerciseRecord);

    try {
      ty.hideLoading();
    } catch (error) {}
    this.endingWorkout = false;
  },

  // 处理停止运动的通用方法
  // sendCommand: true表示已经发送了命令（或不需要发送），false表示不需要发送命令（硬件触发的）
  handleStopExercise(sendCommand, preparedRecord) {
    // 防止重复处理
    if (this.isStopping) {
      console.log('停止逻辑已在处理中，跳过重复调用');
      return;
    }
    this.isStopping = true;

    // 停止计时器
    this.stopTimer();
    
    const exerciseRecord = preparedRecord || this.buildExerciseRecord(new Date());
    const timestamp = exerciseRecord.id;
    const elapsedSeconds = exerciseRecord.duration;
    const avgResistance = exerciseRecord.avgResistance;
    const speedKmh = typeof exerciseRecord.speedKmh === 'number'
      ? exerciseRecord.speedKmh.toFixed(1)
      : (parseFloat(exerciseRecord.speed) * 1.609).toFixed(1);

    if (!sendCommand) {
      // 仅本地存储，硬件触发停止不进行云端上报
    }
    
    // 验证数据完整性
    let saveSuccess = true;
    if (!exerciseRecord.id || exerciseRecord.duration < 0) {
      console.error('Invalid exercise record data');
      ty.showToast({
        title: this.getI18n().t('data_save_failed_incomplete'),
        icon: 'none'
      });
      saveSuccess = false;
    } else {
      // 保存到本地存储（treadmill_history）
      let history = [];
      let updatedHistory = null;
      
      try {
        // 使用对象参数形式获取存储数据
        const storageResult = ty.getStorageSync({ key: 'treadmill_history' });
        // 处理返回结果：可能是直接返回数据，也可能是 { data: ... } 格式
        let rawHistory = (storageResult && storageResult.data !== undefined) ? storageResult.data : storageResult;
        history = (rawHistory && Array.isArray(rawHistory)) ? rawHistory : [];
        
        // 确保history是数组
        if (!Array.isArray(history)) {
          console.warn('treadmill_history is not an array, resetting to empty array');
          ty.setStorageSync({ key: 'treadmill_history', data: [] });
          history = [];
        }
        
        // 添加到数组开头（最新的在前）
        updatedHistory = [exerciseRecord, ...history];
        
        // 缓存上限：如果超过100条，删除最老的一条
        if (updatedHistory.length > 100) {
          updatedHistory.pop(); // 删除最老的记录（数组末尾）
          console.log('历史记录超过100条，已删除最老的记录');
        }
        
        // 准备跳转参数
        const params = new URLSearchParams({
          id: timestamp.toString(),
          duration: elapsedSeconds.toString(),
          speed: String(parseFloat(exerciseRecord.speed) || 0),
          speedKmh: speedKmh,
          calories: String(exerciseRecord.calories ?? 0),
          distance: String(exerciseRecord.distance ?? 0),
          hrBpm: String(exerciseRecord.hrBpm ?? exerciseRecord.heartRate ?? 0),
          watt: String(exerciseRecord.watt ?? 0),
          heartRate: String(exerciseRecord.heartRate ?? 0),
          maxResistance: String(exerciseRecord.maxResistance ?? 0),
          minResistance: String(exerciseRecord.minResistance ?? 0),
          avgResistance: String(avgResistance ?? 0),
          maxSpeed: String(exerciseRecord.maxSpeed ?? 0),
          minSpeed: String(exerciseRecord.minSpeed ?? 0),
          incline: String(exerciseRecord.incline ?? 0),
          maxIncline: String(exerciseRecord.maxIncline ?? 0),
          minIncline: String(exerciseRecord.minIncline ?? 0),
          dateCongrats: String(exerciseRecord.dateCongrats || '')
        });
        
        // 保存到本地存储（treadmill_history），使用setStorageSync（对象参数形式）
        console.log('准备保存运动记录到本地存储，记录数量:', updatedHistory.length);
        console.log('当前记录ID:', exerciseRecord.id);
        console.log('准备保存的数据:', JSON.stringify(updatedHistory).substring(0, 200));
        
        try {
          // 使用对象参数形式，与 alarm/index/index.js 保持一致
          ty.setStorageSync({ key: 'treadmill_history', data: updatedHistory });
          console.log('本地存储成功');
          console.log('存储的日期格式:', exerciseRecord.dateFormatted);
          console.log('Exercise record saved successfully:', exerciseRecord.id);
          
          // 验证数据是否真的保存了
          const verifyStorageResult = ty.getStorageSync({ key: 'treadmill_history' });
          const verifyRawHistory = (verifyStorageResult && verifyStorageResult.data !== undefined) ? verifyStorageResult.data : verifyStorageResult;
          const verifyHistory = (verifyRawHistory && Array.isArray(verifyRawHistory)) ? verifyRawHistory : [];
          console.log('验证：存储后的记录数量:', verifyHistory.length);
          if (verifyHistory.length > 0) {
            console.log('验证：最新记录ID:', verifyHistory[0].id);
          } else {
            console.warn('警告：存储后验证发现记录数量为0，可能存储失败');
          }
          
          // 数据保存成功后，跳转到congrats页面
          ty.navigateTo({
            url: `/pages/congrats/congrats?${params.toString()}`
          });
        } catch (syncError) {
          console.error('setStorageSync 失败:', syncError);
          ty.showToast({
            title: this.getI18n().t('data_save_failed'),
            icon: 'none'
          });
          // 即使保存失败，也继续跳转到congrats页面（数据已通过URL参数传递）
          ty.navigateTo({
            url: `/pages/congrats/congrats?${params.toString()}`
          });
        }
      } catch (error) {
        console.error('Error saving exercise record to storage:', error);
        ty.showToast({
          title: this.getI18n().t('data_save_failed'),
          icon: 'none'
        });
        saveSuccess = false;
        
        // 即使保存失败，也继续跳转到congrats页面（数据已通过URL参数传递）
        ty.navigateTo({
          url: `/pages/congrats/congrats?${params.toString()}`
        });
      }
    }
  },

  buildExerciseRecord(now) {
    const timestamp = now.getTime();
    const elapsedSeconds = this.data.elapsedTime;
    const summary = this.getWorkoutSummaryForUpload();
    const avgResistance = this.resistanceCount > 0
      ? (this.resistanceSum / this.resistanceCount).toFixed(1)
      : this.data.load;

    const durationFormatted = this.formatTime(elapsedSeconds);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateCongrats = `${year}/${month}/${day}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateFormatted = `${month}月${day}日 ${hours}:${minutes}:${seconds}`;

    const finalMaxResistance = this.dpMaxResistance ?? this.maxResistance ?? 0;
    const isGoalMode = this.data.isGoalMode === true;
    const currentI18n = this.getI18n();
    const pageTitle = this.data.pageTitle || (isGoalMode ? currentI18n.t('target_pattern') : currentI18n.t('quick_start'));

    const speedRaw = parseFloat(this.data.speed) || 0;
    const speedKmhValue = parseFloat((speedRaw * 1.609).toFixed(1));
    const heartRate = parseFloat(this.data.heartRate) || 0;

    return {
      id: timestamp,
      duration: elapsedSeconds,
      durationFormatted: durationFormatted,
      date: now.toISOString(),
      dateFormatted: dateFormatted,
      dateCongrats: dateCongrats,
      speed: summary.speed,
      speedKmh: speedKmhValue,
      maxSpeed: summary.maxSpeed,
      minSpeed: summary.minSpeed,
      calories: parseFloat(this.data.calories) || 0,
      distance: parseFloat(this.data.distance) || 0,
      watt: this.data.watt || 0,
      hrBpm: heartRate,
      heartRate: heartRate,
      load: this.data.load || 0,
      incline: summary.incline,
      maxIncline: summary.maxIncline,
      minIncline: summary.minIncline,
      gaugeType: summary.gaugeType,
      speedLimitMax: summary.speedLimitMax,
      speedLimitMin: summary.speedLimitMin,
      inclineLimitMax: summary.inclineLimitMax,
      inclineLimitMin: summary.inclineLimitMin,
      maxResistance: finalMaxResistance,
      minResistance: this.minResistance || 0,
      avgResistance: parseFloat(avgResistance) || 0,
      isGoalMode: isGoalMode,
      pageTitle: pageTitle
    };
  },

  onReady() {
    const query = ty.createSelectorQuery();
    query.select('.gauge-wrapper').boundingClientRect((rect) => {
      if (rect) {
        this.gaugeRect = rect;
        this.gaugeCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    }).exec();
  },

// 节流函数，改为真正的固定间隔节流
throttle(func, delay) {
  let lastExecTime = 0; // 记录上一次执行时间
  return (...args) => {
    const now = Date.now();
    // 只有当前时间与上一次执行时间的间隔 >= delay，才执行函数
    if (now - lastExecTime >= delay) {
      func.apply(this, args);
      lastExecTime = now;
    }
  };
},

  debounce(func, delay) {
    let debounceTimer = null;
    return (...args) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  },

  // 仅更新视觉位置（不更新load数据和发送命令）
  updateGaugeVisual(value) {
    // 使用从dp点获取的最大/最小扬升限制
    const maxAscension = this.data.maxAscension || 15;
    const minAscension = this.data.minAscension || 0;
    // 应用最小和最大扬升限制
    const currentValue = Math.min(Math.max(value, minAscension), maxAscension);
    const maxAngle = 270;
    const progressAngle = (currentValue / maxAscension) * maxAngle;
    const startAngle = 220;
    const knobAngle = startAngle + progressAngle;

    this.setData({
      gaugeProgressStyle: `
        background: conic-gradient(from ${startAngle}deg, #ADFF2F 0deg, #ADFF2F ${progressAngle}deg, transparent ${progressAngle}deg);
      `,
      knobAngle: knobAngle
    });
  },
  handleTouchMove(e) {
    if (!this.gaugeCenter) return;
  
    const touch = e.touches[0];
    const dx = touch.clientX - this.gaugeCenter.x;
    const dy = touch.clientY - this.gaugeCenter.y;
  
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
  
    let adjustedAngle = angle;
    if (angle >= 0 && angle <= 220) {
      adjustedAngle = angle + 360;
    }
  
    const startAngle = 220;
    const maxSweep = 270;
    const endAngle = startAngle + maxSweep;
    if (adjustedAngle < startAngle) adjustedAngle = startAngle;
    if (adjustedAngle > endAngle) adjustedAngle = endAngle;
  
    const progress = (adjustedAngle - startAngle) / maxSweep;
    // 使用从dp点获取的最大/最小扬升限制
    const maxAscension = this.data.maxAscension || 15;
    const minAscension = this.data.minAscension || 0;
    const maxLoad = maxAscension; // 使用最大扬升作为上限
    const rawLoad = Math.floor(progress * maxLoad);
    // 应用最小和最大扬升限制
    const newLoad = Math.min(Math.max(rawLoad, minAscension), maxAscension);
  
    this.tempLoad = newLoad;
  
    // 仅执行视觉更新，不触发其他逻辑，避免冲突
    if (this.throttledUpdateVisual) {
      this.throttledUpdateVisual(newLoad);
    }
  },

  handleTouchEnd(e) {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    
    if (this.tempLoad !== null && this.tempLoad !== this.data.load) {
      const finalLoad = this.tempLoad;
      // 立即更新UI并锁定，避免设备上报旧值时跳回旧值
      this.updateGauge(finalLoad);
      this.lockInclineUi(finalLoad);
      
      // 设备命令发送逻辑不变
      this.queuePublishDps(
        { [this.getGaugeDpId()]: finalLoad },
        {
          label: 'update_load',
          queueKey: 'load',
          success: () => {
            console.log('Load updated to:', finalLoad);
            if (this.isRunning && !this.data.isPaused) {
              console.log('运动进行中，阻力已更新');
            } else if (!this.isRunning && !this.data.isPaused) {
              console.log('运动未开始，阻力设置后自动开始运动');
              this.handleStartExercise(true);
            }
          }
        },
        150
      );
    }
    
    this.tempLoad = null;
  },

  lockSpeedUi(targetSpeed) {
    this.speedUiLocked = true;
    const normalized = typeof targetSpeed === 'number' ? targetSpeed : parseFloat(targetSpeed);
    this.pendingSpeedValue = Number.isFinite(normalized) ? Number(normalized.toFixed(1)) : null;
    if (this.speedUnlockTimer) {
      clearTimeout(this.speedUnlockTimer);
      this.speedUnlockTimer = null;
    }
    this.speedUnlockTimer = setTimeout(() => {
      const tolerance = 0.11;
      if (this.pendingSpeedValue !== null
        && Number.isFinite(this.lastDeviceSpeedValue)
        && Math.abs(this.lastDeviceSpeedValue - this.pendingSpeedValue) > tolerance) {
        this.setData({ speed: Number(this.lastDeviceSpeedValue).toFixed(1) });
      }
      this.speedUiLocked = false;
      this.pendingSpeedValue = null;
      this.speedUnlockTimer = null;
    }, 2000);
  },

  unlockSpeedUi() {
    this.speedUiLocked = false;
    this.pendingSpeedValue = null;
    if (this.speedUnlockTimer) {
      clearTimeout(this.speedUnlockTimer);
      this.speedUnlockTimer = null;
    }
  },

  lockInclineUi(targetIncline) {
    this.inclineUiLocked = true;
    const normalized = typeof targetIncline === 'number' ? targetIncline : parseFloat(targetIncline);
    this.pendingInclineValue = Number.isFinite(normalized) ? Number(normalized) : null;
    if (this.inclineUnlockTimer) {
      clearTimeout(this.inclineUnlockTimer);
      this.inclineUnlockTimer = null;
    }
    this.inclineUnlockTimer = setTimeout(() => {
      const tolerance = 0.5; // 坡度容差
      if (this.pendingInclineValue !== null) {
        // 锁定期过后，如果设备还没上报匹配的值，解锁
        this.inclineUiLocked = false;
        this.pendingInclineValue = null;
      }
      this.inclineUnlockTimer = null;
    }, 2000);
  },

  unlockInclineUi() {
    this.inclineUiLocked = false;
    this.pendingInclineValue = null;
    if (this.inclineUnlockTimer) {
      clearTimeout(this.inclineUnlockTimer);
      this.inclineUnlockTimer = null;
    }
  },

  publishSpeedToDevice(newSpeed) {
    const deviceId = this.getDeviceId();
    if (!deviceId) return;
    const maxSpeed = Number.isFinite(parseFloat(this.data.maxSpeed)) ? parseFloat(this.data.maxSpeed) : 999999;
    const minSpeed = Number.isFinite(parseFloat(this.data.minSpeed)) ? parseFloat(this.data.minSpeed) : 0;
    const clampedSpeed = Math.min(Math.max(newSpeed, minSpeed), maxSpeed);
    const raw = Math.round(clampedSpeed * 10);
    this.queuePublishDps(
      { [DP.speed]: raw },
      {
        label: 'set_speed',
        queueKey: 'speed',
        fail: (err) => {
          this.unlockSpeedUi();
          if (err && (err.errorCode === 20028 || err.code === 20028)) {
            console.warn('速度下发失败，设备忙碌或速度超范围', err);
          }
          if (this.lastDeviceSpeedValue !== null && this.lastDeviceSpeedValue !== undefined) {
            this.setData({ speed: Number(this.lastDeviceSpeedValue).toFixed(1) });
          }
        }
      },
      80
    );
  },

  // 处理速度增加
  handleIncreaseSpeed() {
    // 设置按钮点击状态
    this.setData({
      isIncreaseSpeedPressed: true
    });
    
    const currentSpeed = parseFloat(this.data.speed) || 0;
    const maxSpeed = this.data.maxSpeed || 999999;
    // 应用最大速度限制（从dp点115获取）
    const newSpeed = Math.min(currentSpeed + 0.1, maxSpeed);
    this.lockSpeedUi(newSpeed);
    this.setData({
      speed: newSpeed.toFixed(1)
    });
    
    // 200ms后恢复按钮颜色
    setTimeout(() => {
      this.setData({
        isIncreaseSpeedPressed: false
      });
    }, 200);
    
    this.publishSpeedToDevice(newSpeed);
  },

  // 处理速度减少
  handleDecreaseSpeed() {
    // 设置按钮点击状态
    this.setData({
      isDecreaseSpeedPressed: true
    });
    
    const currentSpeed = parseFloat(this.data.speed) || 0;
    const minSpeed = this.data.minSpeed || 0;
    // 应用最小速度限制（从dp点116获取）
    const newSpeed = Math.max(currentSpeed - 0.1, minSpeed);
    this.lockSpeedUi(newSpeed);
    this.setData({
      speed: newSpeed.toFixed(1)
    });
    
    // 200ms后恢复按钮颜色
    setTimeout(() => {
      this.setData({
        isDecreaseSpeedPressed: false
      });
    }, 200);
    
    this.publishSpeedToDevice(newSpeed);
  },

  updateGauge(value) {
    // 使用从dp点获取的最大/最小扬升限制
    const maxAscension = this.data.maxAscension || 15;
    const minAscension = this.data.minAscension || 0;
    // 应用最小和最大扬升限制
    const currentValue = Math.min(Math.max(value, minAscension), maxAscension);
    const maxAngle = 270;
    const progressAngle = (currentValue / maxAscension) * maxAngle;
    const startAngle = 220;
    const knobAngle = startAngle + progressAngle;

    if (this.getGaugeDpId() === DP.incline) {
      this.trackIncline(currentValue);
    }
    if (this.maxResistance === null || currentValue > this.maxResistance) {
      this.maxResistance = currentValue;
    }
    if (this.minResistance === null || currentValue < this.minResistance) {
      this.minResistance = currentValue;
    }
    this.resistanceSum += currentValue;
    this.resistanceCount += 1;

    this.setData({
      load: currentValue,
      gaugeProgressStyle: `
        background: conic-gradient(from ${startAngle}deg, #ADFF2F 0deg, #ADFF2F ${progressAngle}deg, transparent ${progressAngle}deg);
      `,
      knobAngle: knobAngle
    });
  }
})
