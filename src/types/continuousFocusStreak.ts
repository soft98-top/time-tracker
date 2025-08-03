/**
 * 连续专注次数接口
 */
export interface ContinuousFocusStreak {
  count: number;           // 当前连续专注次数
  lastUpdateTime: number;  // 最后更新时间戳
  lastSessionId?: string;  // 最后一次成功专注的会话ID（可选）
}

/**
 * 默认连续专注次数值
 */
export const defaultContinuousFocusStreak: ContinuousFocusStreak = {
  count: 0,
  lastUpdateTime: Date.now()
};