import { TimerConfig, TimerError, TimerException, defaultConfig } from '../types';

/**
 * 配置服务类 - 管理用户配置的保存、加载和验证
 */
export class ConfigService {
  private static readonly CONFIG_KEY = 'flexible-pomodoro-config';
  private static readonly CONFIG_VERSION = '1.0.0';

  /**
   * 验证配置对象是否有效
   */
  private static validateConfig(config: Partial<TimerConfig>): void {
    const errors: string[] = [];

    // 验证时长配置（必须为正整数）
    if (config.focusDuration !== undefined) {
      if (!Number.isInteger(config.focusDuration) || config.focusDuration <= 0) {
        errors.push('专注时长必须为正整数');
      }
    }

    if (config.restDuration !== undefined) {
      if (!Number.isInteger(config.restDuration) || config.restDuration <= 0) {
        errors.push('休息时长必须为正整数');
      }
    }

    if (config.reflectionDuration !== undefined) {
      if (!Number.isInteger(config.reflectionDuration) || config.reflectionDuration <= 0) {
        errors.push('反思时长必须为正整数');
      }
    }

    if (config.focusFailureTime !== undefined) {
      if (!Number.isInteger(config.focusFailureTime) || config.focusFailureTime <= 0) {
        errors.push('专注失败时间必须为正整数');
      }
    }

    // 验证布尔值配置
    if (config.enableSound !== undefined && typeof config.enableSound !== 'boolean') {
      errors.push('声音提醒设置必须为布尔值');
    }

    if (config.enableNotification !== undefined && typeof config.enableNotification !== 'boolean') {
      errors.push('桌面通知设置必须为布尔值');
    }

    // 验证专注失败时间不能大于专注时长
    if (config.focusFailureTime !== undefined && config.focusDuration !== undefined) {
      if (config.focusFailureTime >= config.focusDuration) {
        errors.push('专注失败时间不能大于或等于专注时长');
      }
    }

    if (errors.length > 0) {
      throw new TimerException(
        TimerError.CONFIG_VALIDATION_ERROR,
        `配置验证失败: ${errors.join(', ')}`,
        true
      );
    }
  }

  /**
   * 合并配置，确保所有必需字段都存在
   */
  private static mergeWithDefaults(config: Partial<TimerConfig>): TimerConfig {
    return {
      ...defaultConfig,
      ...config
    };
  }

  /**
   * 加载用户配置
   * @returns 完整的配置对象
   */
  static loadConfig(): TimerConfig {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      
      if (!stored) {
        return { ...defaultConfig };
      }

      const parsed = JSON.parse(stored);
      
      // 检查版本兼容性
      if (parsed.version !== this.CONFIG_VERSION) {
        console.warn('配置版本不匹配，使用默认配置');
        return { ...defaultConfig };
      }

      // 验证并合并配置
      this.validateConfig(parsed.config);
      return this.mergeWithDefaults(parsed.config);
      
    } catch (error) {
      console.error('加载配置失败:', error);
      
      if (error instanceof TimerException) {
        throw error;
      }
      
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '加载配置时发生错误，将使用默认配置',
        true
      );
    }
  }

  /**
   * 保存用户配置
   * @param config 要保存的配置（可以是部分配置）
   */
  static saveConfig(config: Partial<TimerConfig>): void {
    try {
      // 验证配置
      this.validateConfig(config);
      
      // 加载当前配置并合并
      const currentConfig = this.loadConfig();
      const newConfig = this.mergeWithDefaults({ ...currentConfig, ...config });
      
      // 再次验证合并后的完整配置
      this.validateConfig(newConfig);
      
      // 保存到 localStorage
      const toStore = {
        version: this.CONFIG_VERSION,
        config: newConfig,
        updatedAt: Date.now()
      };
      
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(toStore));
      
    } catch (error) {
      console.error('保存配置失败:', error);
      
      if (error instanceof TimerException) {
        throw error;
      }
      
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '保存配置时发生错误',
        true
      );
    }
  }

  /**
   * 重置配置为默认值
   */
  static resetConfig(): void {
    try {
      localStorage.removeItem(this.CONFIG_KEY);
    } catch (error) {
      console.error('重置配置失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '重置配置时发生错误',
        true
      );
    }
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig(): TimerConfig {
    return { ...defaultConfig };
  }

  /**
   * 检查配置是否为默认配置
   */
  static isDefaultConfig(config: TimerConfig): boolean {
    return JSON.stringify(config) === JSON.stringify(defaultConfig);
  }

  /**
   * 导出配置为 JSON 字符串
   */
  static exportConfig(): string {
    const config = this.loadConfig();
    return JSON.stringify({
      version: this.CONFIG_VERSION,
      config,
      exportedAt: Date.now()
    }, null, 2);
  }

  /**
   * 从 JSON 字符串导入配置
   */
  static importConfig(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString);
      
      if (!imported.config) {
        throw new Error('无效的配置格式');
      }
      
      this.saveConfig(imported.config);
      
    } catch (error) {
      console.error('导入配置失败:', error);
      throw new TimerException(
        TimerError.CONFIG_VALIDATION_ERROR,
        '导入配置失败，请检查配置格式',
        true
      );
    }
  }
}