/**
 * 性能优化工具
 */

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 内存化缓存
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * 带过期时间的缓存
 */
export class TimedCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 默认5分钟
    this.defaultTTL = defaultTTL;
  }

  set(key: K, value: V, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }
}

/**
 * 批处理工具
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => void;
  private batchSize: number;
  private delay: number;

  constructor(
    processor: (items: T[]) => void,
    batchSize: number = 10,
    delay: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    this.timer = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.batch.length > 0) {
      const items = [...this.batch];
      this.batch = [];
      this.processor(items);
    }
  }

  destroy(): void {
    this.flush();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * 虚拟滚动工具
 */
export class VirtualScroller<T> {
  private items: T[];
  private itemHeight: number;
  private containerHeight: number;
  private scrollTop: number = 0;
  private overscan: number;

  constructor(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    overscan: number = 5
  ) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.overscan = overscan;
  }

  updateScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getVisibleRange(): { start: number; end: number; items: T[] } {
    const visibleStart = Math.floor(this.scrollTop / this.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.containerHeight / this.itemHeight),
      this.items.length
    );

    const start = Math.max(0, visibleStart - this.overscan);
    const end = Math.min(this.items.length, visibleEnd + this.overscan);

    return {
      start,
      end,
      items: this.items.slice(start, end)
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  getOffsetY(): number {
    const { start } = this.getVisibleRange();
    return start * this.itemHeight;
  }
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private observers = new Map<string, PerformanceObserver>();

  /**
   * 开始监控指标
   */
  startMonitoring(name: string, type: 'measure' | 'navigation' | 'resource' = 'measure'): void {
    if (this.observers.has(name)) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const values = this.metrics.get(name) || [];
      
      entries.forEach(entry => {
        values.push(entry.duration || ((entry as any).responseEnd - (entry as any).responseStart));
      });
      
      this.metrics.set(name, values);
    });

    observer.observe({ entryTypes: [type] });
    this.observers.set(name, observer);
  }

  /**
   * 停止监控指标
   */
  stopMonitoring(name: string): void {
    const observer = this.observers.get(name);
    if (observer) {
      observer.disconnect();
      this.observers.delete(name);
    }
  }

  /**
   * 记录性能标记
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * 测量性能
   */
  measure(name: string, startMark: string, endMark?: string): void {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
  }

  /**
   * 获取指标统计
   */
  getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  /**
   * 清理所有监控
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

/**
 * 内存使用监控
 */
export class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private samples: number[] = [];
  private maxSamples: number;

  constructor(maxSamples: number = 100) {
    this.maxSamples = maxSamples;
  }

  start(intervalMs: number = 1000): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      const memory = this.getCurrentMemoryUsage();
      if (memory > 0) {
        this.samples.push(memory);
        
        if (this.samples.length > this.maxSamples) {
          this.samples.shift();
        }
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  getMemoryStats(): { current: number; avg: number; max: number; trend: 'up' | 'down' | 'stable' } {
    const current = this.getCurrentMemoryUsage();
    
    if (this.samples.length === 0) {
      return { current, avg: current, max: current, trend: 'stable' };
    }

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const max = Math.max(...this.samples);
    
    // 计算趋势
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (this.samples.length >= 10) {
      const recent = this.samples.slice(-5);
      const earlier = this.samples.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      
      const change = (recentAvg - earlierAvg) / earlierAvg;
      if (change > 0.05) trend = 'up';
      else if (change < -0.05) trend = 'down';
    }

    return { current, avg, max, trend };
  }

  isMemoryLeaking(threshold: number = 0.1): boolean {
    const stats = this.getMemoryStats();
    return stats.trend === 'up' && (stats.current - stats.avg) / stats.avg > threshold;
  }
}

/**
 * 组件渲染优化工具
 */
export const RenderOptimizer = {
  /**
   * 浅比较对象
   */
  shallowEqual(obj1: any, obj2: any): boolean {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  },

  /**
   * 创建稳定的回调函数
   */
  createStableCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: any[]
  ): T {
    // 这个函数在实际使用中应该配合 React.useCallback 使用
    return callback;
  },

  /**
   * 优化列表渲染的key生成
   */
  generateStableKey(item: any, index: number, prefix: string = 'item'): string {
    if (item.id) return `${prefix}-${item.id}`;
    if (item.key) return `${prefix}-${item.key}`;
    
    // 使用内容哈希作为key（简化版）
    const content = JSON.stringify(item);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return `${prefix}-${hash}-${index}`;
  }
};

/**
 * 全局性能优化管理器
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private monitor: PerformanceMonitor;
  private memoryMonitor: MemoryMonitor;
  private caches = new Map<string, TimedCache<any, any>>();
  private batchProcessors = new Map<string, BatchProcessor<any>>();

  private constructor() {
    this.monitor = new PerformanceMonitor();
    this.memoryMonitor = new MemoryMonitor();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * 初始化性能优化
   */
  initialize(): void {
    // 开始监控关键指标
    this.monitor.startMonitoring('timer-operations');
    this.monitor.startMonitoring('data-operations');
    this.monitor.startMonitoring('ui-updates');
    
    // 开始内存监控
    this.memoryMonitor.start();
    
    // 定期清理缓存
    setInterval(() => {
      this.caches.forEach(cache => cache.cleanup());
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 获取或创建缓存
   */
  getCache<K, V>(name: string, ttl?: number): TimedCache<K, V> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new TimedCache<K, V>(ttl));
    }
    return this.caches.get(name)!;
  }

  /**
   * 获取或创建批处理器
   */
  getBatchProcessor<T>(
    name: string,
    processor: (items: T[]) => void,
    batchSize?: number,
    delay?: number
  ): BatchProcessor<T> {
    if (!this.batchProcessors.has(name)) {
      this.batchProcessors.set(name, new BatchProcessor(processor, batchSize, delay));
    }
    return this.batchProcessors.get(name)!;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    memory: ReturnType<MemoryMonitor['getMemoryStats']>;
    metrics: Record<string, ReturnType<PerformanceMonitor['getStats']>>;
    cacheStats: Record<string, number>;
  } {
    const memory = this.memoryMonitor.getMemoryStats();
    
    const metrics: Record<string, ReturnType<PerformanceMonitor['getStats']>> = {};
    ['timer-operations', 'data-operations', 'ui-updates'].forEach(name => {
      metrics[name] = this.monitor.getStats(name);
    });
    
    const cacheStats: Record<string, number> = {};
    this.caches.forEach((cache, name) => {
      cacheStats[name] = cache.size();
    });
    
    return { memory, metrics, cacheStats };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.monitor.cleanup();
    this.memoryMonitor.stop();
    this.caches.forEach(cache => cache.clear());
    this.batchProcessors.forEach(processor => processor.destroy());
    this.caches.clear();
    this.batchProcessors.clear();
  }
}