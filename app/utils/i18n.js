/**
 * I18n 国际化工具类
 * 根据涂鸦系统语言自动加载对应语言包
 */

// 导入语言包
const strings = require('../i18n/strings.json');

// I18n 类
class I18n {
  constructor() {
    this.currentLang = 'en'; // 默认语言为英文
    this.strings = strings;
  }

  /**
   * 初始化 I18n 实例
   * 根据涂鸦系统语言自动匹配语言包
   * @param {string} systemLang - 涂鸦系统返回的语言标识
   */
  init(systemLang) {
    // 标准化语言标识（兼容 zh/zh-CN 和 en/en-US 等格式）
    const normalizedLang = this.normalizeLanguage(systemLang);
    
    // 检查语言包是否存在，不存在则使用默认语言（en）
    if (this.strings[normalizedLang]) {
      this.currentLang = normalizedLang;
      console.log(`I18n initialized with language: ${normalizedLang}`);
    } else {
      console.warn(`Language pack for "${normalizedLang}" not found, using default: en`);
      this.currentLang = 'zh';
    }
  }

  /**
   * 标准化语言标识
   * 将 zh/zh-CN/zh-TW 统一识别为 zh
   * 将 en/en-US/en-GB 统一识别为 en
   * @param {string} lang - 原始语言标识
   * @returns {string} 标准化后的语言标识
   */
  normalizeLanguage(lang) {
    if (!lang || typeof lang !== 'string') {
      return 'en'; // 默认返回英文
    }

    const lowerLang = lang.toLowerCase().trim();
    
    // 中文相关语言标识统一为 zh
    if (lowerLang.startsWith('zh')) {
      return 'zh';
    }
    
    // 英文相关语言标识统一为 en
    if (lowerLang.startsWith('en')) {
      return 'en';
    }
    
    // 其他语言暂不支持，返回默认英文
    console.warn(`Unsupported language: ${lang}, using default: en`);
    return 'en';
  }

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键名
   * @param {object} params - 可选参数对象（用于格式化）
   * @returns {string} 翻译后的文本
   */
  t(key, params) {
    if (!key) {
      return '';
    }

    const currentStrings = this.strings[this.currentLang] || this.strings['zh'];
    let text = currentStrings[key] || key;

    // 如果提供了参数，进行简单的字符串替换
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g');
        text = text.replace(regex, params[paramKey]);
      });
    }

    return text;
  }

  /**
   * 获取当前语言
   * @returns {string} 当前语言标识
   */
  getCurrentLang() {
    return this.currentLang;
  }

  /**
   * 设置语言（用于手动切换，但根据需求，此功能暂不使用）
   * @param {string} lang - 语言标识
   */
  setLang(lang) {
    const normalizedLang = this.normalizeLanguage(lang);
    if (this.strings[normalizedLang]) {
      this.currentLang = normalizedLang;
    }
  }
}

// 创建全局 I18n 实例
const i18nInstance = new I18n();

module.exports = i18nInstance;
