/**
 * 云端同步工具模块（已废弃）
 * 此文件保留仅用于兼容性，所有云端同步功能已移除
 * 历史记录现在完全使用本地存储（treadmill_history）
 */

function normalizePublishError(error) {
  if (!error || typeof error !== 'object') {
    return error;
  }
  const normalized = { ...error };
  const code = error.errorCode || error.code;
  const inner = error.innerError || error.inner_error || {};
  if (code === 20028 && (inner.errorCode === '11001' || inner.code === 11001)) {
    normalized.humanMessage = 'DP下发失败：设备繁忙或数据格式/长度不符合 DP 限制';
    normalized.isPublishDpsInvalidParam = true;
  }
  return normalized;
}

function getBleConnectedFlag(deviceInfo) {
  if (!deviceInfo) return undefined;
  if (deviceInfo.isBleConnected !== undefined) return deviceInfo.isBleConnected;
  if (deviceInfo.bleConnected !== undefined) return deviceInfo.bleConnected;
  if (deviceInfo.bluetoothConnected !== undefined) return deviceInfo.bluetoothConnected;
  if (deviceInfo.btConnected !== undefined) return deviceInfo.btConnected;
  return undefined;
}

function isDeviceReadyForPublish(deviceInfo) {
  if (!deviceInfo) return true;
  if (deviceInfo.online === false) return false;
  const bleConnected = getBleConnectedFlag(deviceInfo);
  if (bleConnected === false) return false;
  return true;
}

function utf8ByteLength(str) {
  if (typeof str !== 'string') return 0;
  let bytes = 0;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
      continue;
    }
    if (code <= 0x7ff) {
      bytes += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 1;
      continue;
    }
    bytes += 3;
  }
  return bytes;
}

function safeNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeInt(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 格式化时长为 "HH:MM:SS" 格式
 * @param {Number} seconds - 秒数
 * @returns {String} 格式化后的时长字符串
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = secs.toString().padStart(2, '0');
  
  return `${h}:${m}:${s}`;
}

/**
 * 验证历史记录数据的有效性
 * @param {Object} record - 历史记录对象
 * @returns {Boolean} 是否有效
 */
function validateHistoryRecord(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }
  
  // 至少需要有id字段
  if (record.id === undefined || record.id === null) {
    return false;
  }
  
  return true;
}

/**
 * 验证提醒记录数据的有效性
 * @param {Object} tip - 提醒记录对象
 * @returns {Boolean} 是否有效
 */
function validateTipRecord(tip) {
  if (!tip || typeof tip !== 'object') {
    return false;
  }
  
  // 至少需要有id字段
  if (tip.id === undefined || tip.id === null) {
    return false;
  }
  
  return true;
}

/**
 * 将历史记录数组或单条记录格式化为 DP 点 113 需要的 JSON 字符串格式
 * @param {Array|Object} historyData - 历史记录数组或单条记录对象
 * @returns {String} JSON 字符串
 */
function formatHistoryForDp112(historyData) {
  try {
    // 支持单条记录对象或数组
    let historyArray = [];
    if (Array.isArray(historyData)) {
      historyArray = historyData;
    } else if (typeof historyData === 'object' && historyData !== null) {
      // 单条记录，转换为数组
      historyArray = [historyData];
    } else {
      console.warn('formatHistoryForDp112: historyData 格式不正确');
      return JSON.stringify([]);
    }
    
    if (historyArray.length === 0) {
      console.warn('formatHistoryForDp112: historyArray is empty');
      return JSON.stringify([]);
    }
    
    // 格式化每条记录，只保留必要字段（避免触发 DP 字符串长度限制）
    const formattedRecords = [];
    historyArray.forEach((record, index) => {
      try {
        // 验证记录有效性
        if (!validateHistoryRecord(record)) {
          console.warn(`formatHistoryForDp112: 跳过无效记录 [${index}]:`, record);
          return;
        }
        
        // 计算时长（可能是秒数或已格式化的字符串）
        let durationSeconds = 0;
        if (typeof record.duration === 'number') {
          durationSeconds = record.duration;
        } else if (typeof record.duration === 'string') {
          // 尝试解析已格式化的时长字符串 "HH:MM:SS"
          const parts = record.duration.split(':');
          if (parts.length === 3) {
            durationSeconds = parseInt(parts[0]) * 3600 + 
                             parseInt(parts[1]) * 60 + 
                             parseInt(parts[2]);
          } else {
            durationSeconds = parseInt(record.duration) || 0;
          }
        }
        
        const formattedDuration = formatTime(durationSeconds);
       
        const distanceValue = safeNumber(record.distance, 0);
        const caloriesValue = safeInt(record.calories, 0);
        const heartRateValue = safeInt(record.heartRate, safeInt(record.hrBpm, 0));
        const speedKmhValue = safeNumber(record.speedKmh, Number.isFinite(safeNumber(record.speed, NaN)) ? safeNumber(record.speed, 0) : 0);
        const inclineValue = safeNumber(
          record.incline !== undefined ? record.incline : (record.Load !== undefined ? record.Load : (record.load !== undefined ? record.load : 0)),
          0
        );
        const maxResistanceValue = safeInt(record.maxResistance, 0);
        const minResistanceValue = safeInt(record.minResistance, 0);
        const maxSpeedValue = safeNumber(record.maxSpeed, 0);
        const minSpeedValue = safeNumber(record.minSpeed, 0);
        const maxInclineValue = safeNumber(record.maxIncline, 0);
        const minInclineValue = safeNumber(record.minIncline, 0);

        let dateMs = null;
        if (record.date !== undefined && record.date !== null) {
          const ms = typeof record.date === 'number' ? record.date : Date.parse(record.date);
          if (Number.isFinite(ms)) dateMs = ms;
        }
        if (dateMs === null && record.dateFormatted) {
          const ms = Date.parse(record.dateFormatted);
          if (Number.isFinite(ms)) dateMs = ms;
        }
        if (dateMs === null && record.id) {
          const ms = typeof record.id === 'number' ? record.id : parseInt(record.id, 10);
          if (Number.isFinite(ms)) dateMs = ms;
        }
        if (dateMs === null) {
          dateMs = Date.now();
        }

        const formattedRecord = {
          id: record.id || Date.now(),
          duration: durationSeconds,
          date: dateMs,
          distance: Number(distanceValue.toFixed(2)),
          calories: caloriesValue,
          heartRate: heartRateValue,
          speedKmh: Number(speedKmhValue.toFixed(1)),
          incline: Number(inclineValue.toFixed(1)),
          isGoalMode: record.isGoalMode === true,
          maxSpeed: Number(maxSpeedValue.toFixed(1)),
          minSpeed: Number(minSpeedValue.toFixed(1)),
          maxIncline: Number(maxInclineValue.toFixed(1)),
          minIncline: Number(minInclineValue.toFixed(1))
        };

        if (maxResistanceValue !== 0) {
          formattedRecord.maxResistance = maxResistanceValue;
        }
        if (minResistanceValue !== 0) {
          formattedRecord.minResistance = minResistanceValue;
        }
        
        formattedRecords.push(formattedRecord);
      } catch (error) {
        console.error(`formatHistoryForDp112: 处理记录 [${index}] 时出错:`, error, record);
      }
    });
    
    if (formattedRecords.length === 0) {
      console.warn('formatHistoryForDp112: 没有有效的记录可以格式化');
      return JSON.stringify([]);
    }
    
    const jsonString = JSON.stringify(formattedRecords);
    
    // 验证JSON字符串是否有效
    try {
      JSON.parse(jsonString);
      const bytes = utf8ByteLength(jsonString);
      console.log(`formatHistoryForDp112: 成功格式化 ${formattedRecords.length} 条记录，JSON长度: ${bytes} bytes`);
    } catch (error) {
      console.error('formatHistoryForDp112: 生成的JSON字符串无效:', error);
      return JSON.stringify([]);
    }
    
    return jsonString;
  } catch (error) {
    console.error('formatHistoryForDp112 error:', error);
    return JSON.stringify([]);
  }
}

/**
 * 将提醒记录数组或单条记录格式化为 DP 点 113 需要的 JSON 字符串格式
 * @param {Array|Object} tipsData - 提醒记录数组或单条记录对象
 * @returns {String} JSON 字符串
 */
function formatTipsForDp113(tipsData) {
  try {
    // 支持单条记录对象或数组
    let tipsArray = [];
    if (Array.isArray(tipsData)) {
      tipsArray = tipsData;
    } else if (typeof tipsData === 'object' && tipsData !== null) {
      // 单条记录，转换为数组
      tipsArray = [tipsData];
    } else {
      console.warn('formatTipsForDp113: tipsData 格式不正确');
      return JSON.stringify([]);
    }
    
    if (tipsArray.length === 0) {
      console.warn('formatTipsForDp113: tipsArray is empty');
      return JSON.stringify([]);
    }
    
    // 格式化每条记录，只保留必要字段
    const formattedTips = [];
    tipsArray.forEach((tip, index) => {
      try {
        // 验证记录有效性
        if (!validateTipRecord(tip)) {
          console.warn(`formatTipsForDp113: 跳过无效记录 [${index}]:`, tip);
          return;
        }
        
        // 处理日期时间字段
        let dateTime = tip.dateTime || tip.date || new Date().toISOString();
        
        // 确保 date 字段存在
        let date = tip.date;
        if (!date && dateTime) {
          try {
            const dateObj = new Date(dateTime);
            date = dateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
          } catch (error) {
            date = new Date().toISOString();
          }
        }
        
        // 确保 time 字段存在且格式正确
        let time = tip.time;
        if (!time || typeof time !== 'object') {
          try {
            const dateObj = new Date(dateTime);
            time = {
              hour: dateObj.getHours(),
              minute: dateObj.getMinutes()
            };
          } catch (error) {
            time = { hour: 0, minute: 0 };
          }
        }
        
        // 确保 time 对象包含 hour 和 minute
        if (typeof time.hour !== 'number') {
          time.hour = 0;
        }
        if (typeof time.minute !== 'number') {
          time.minute = 0;
        }
        
        // 生成可读的显示文本，用于设备日志页面显示
        const displayText = [
          `标题：${tip.title || ''}`,
          `日期：${date}`,
          `时间：${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`
        ].join(' | ');
        
        const formattedTip = {
          id: tip.id || Date.now().toString(),
          title: tip.title || '',
          date: date,
          time: {
            hour: time.hour,
            minute: time.minute
          },
          dateTime: dateTime,
          // 添加可读的显示文本字段，用于设备日志页面显示
          displayText: displayText
        };
        
        formattedTips.push(formattedTip);
      } catch (error) {
        console.error(`formatTipsForDp113: 处理记录 [${index}] 时出错:`, error, tip);
      }
    });
    
    if (formattedTips.length === 0) {
      console.warn('formatTipsForDp113: 没有有效的记录可以格式化');
      return JSON.stringify([]);
    }
    
    const jsonString = JSON.stringify(formattedTips);
    
    // 验证JSON字符串是否有效
    try {
      JSON.parse(jsonString);
      console.log(`formatTipsForDp113: 成功格式化 ${formattedTips.length} 条记录，JSON长度: ${jsonString.length} 字节`);
    } catch (error) {
      console.error('formatTipsForDp113: 生成的JSON字符串无效:', error);
      return JSON.stringify([]);
    }
    
    return jsonString;
  } catch (error) {
    console.error('formatTipsForDp113 error:', error);
    return JSON.stringify([]);
  }
}

// saveHistoryToCloud 函数已删除 - 不再使用云端同步

// getHistoryFromCloud 函数已删除 - 不再使用云端同步

// getDpReportLog 函数已删除 - 不再使用云端同步

// findHistoryRecordFromCloud 函数已删除 - 不再使用云端同步

// 导出函数（已废弃，保留仅用于兼容性）
module.exports = {
  // 所有云端同步功能已移除
  // 历史记录现在完全使用本地存储（treadmill_history）
};
