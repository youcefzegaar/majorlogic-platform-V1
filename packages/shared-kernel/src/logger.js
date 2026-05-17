// packages/shared-kernel/src/logger.js
import pino from 'pino';

export function createLogger(name, options = {}) {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    ...options,
  });
}

export function shimConsoleLogger(pinoLogger) {
  return {
    log:   (...a) => pinoLogger.info(...a),
    info:  (...a) => pinoLogger.info(...a),
    warn:  (...a) => pinoLogger.warn(...a),
    error: (...a) => pinoLogger.error(...a),
    debug: (...a) => pinoLogger.debug(...a),
  };
}
