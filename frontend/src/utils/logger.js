const isDevelopment = import.meta.env.DEV;
const logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn'; // 'debug', 'info', 'warn', 'error'

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = logLevels[logLevel] || logLevels.warn;

export const logger = {
  debug: (message, ...args) => {
    if (isDevelopment && currentLevel <= logLevels.debug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (isDevelopment && currentLevel <= logLevels.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (currentLevel <= logLevels.warn) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  error: (message, ...args) => {
    if (currentLevel <= logLevels.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  dev: (message, ...args) => {
    if (isDevelopment) {
      console.log(`[DEV] ${message}`, ...args);
    }
  }
};