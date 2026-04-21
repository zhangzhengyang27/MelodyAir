/**
 * 环境感知日志工具
 *
 * 开发环境：输出带前缀的调试日志到 console
 * 生产环境：自动降级，仅输出 warn/error，且脱敏处理
 */

const LOG_PREFIX = '[MelodyAir]'

/** 日志级别 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/** 当前日志级别：生产环境静默 DEBUG/INFO */
function getLogLevel(): LogLevel {
  if (import.meta.env?.PROD) return LogLevel.WARN
  return LogLevel.DEBUG
}

function formatMessage(module: string, ...args: unknown[]): string {
  const prefix = `${LOG_PREFIX}[${module}]`
  return `${prefix} ${args.map(arg => {
    if (typeof arg === 'string') return arg
    try {
      // 截断大型对象，避免控制台爆炸
      const str = JSON.stringify(arg)
      return str.length > 500 ? str.slice(0, 500) + '...[truncated]' : str
    } catch {
      return String(arg)
    }
  }).join(' ')}`
}

export const logger = {
  debug(module: string, ...args: unknown[]): void {
    if (getLogLevel() <= LogLevel.DEBUG) {
      console.debug(formatMessage(module, ...args))
    }
  },

  info(module: string, ...args: unknown[]): void {
    if (getLogLevel() <= LogLevel.INFO) {
      console.info(formatMessage(module, ...args))
    }
  },

  warn(module: string, ...args: unknown[]): void {
    if (getLogLevel() <= LogLevel.WARN) {
      console.warn(formatMessage(module, ...args))
    }
  },

  error(module: string, ...args: unknown[]): void {
    if (getLogLevel() <= LogLevel.ERROR) {
      console.error(formatMessage(module, ...args))
    }
  },

  /**
   * 安全地记录敏感信息（自动脱敏）
   * @param module 模块名
   * @param label 数据标签
   * @param data 敏感数据（URL、Cookie 等）
   */
  sensitive(module: string, label: string, data: string): void {
    if (getLogLevel() > LogLevel.WARN) return
    // 自动截断并隐藏中间部分
    const truncated = data.length > 100 ? data.slice(0, 50) + '***' + data.slice(-20) : data
    console.warn(formatMessage(module, `${label}=${truncated}`))
  },
}
