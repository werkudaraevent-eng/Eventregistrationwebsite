/**
 * Console utilities for development and production
 * Automatically disabled in production build
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log info messages - disabled in production
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log debug messages - disabled in production
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log warnings - shown in production too
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors - always shown
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log with component name prefix
   */
  component: (componentName: string, message: string, data?: any) => {
    if (isDev) {
      console.log(`[${componentName}]`, message, data || '');
    }
  },

  /**
   * Log API calls
   */
  api: (method: string, endpoint: string, status?: number) => {
    if (isDev) {
      const statusColor = status && status >= 400 ? 'color: red' : 'color: green';
      console.log(
        `%c[API] ${method} ${endpoint} ${status || ''}`,
        statusColor
      );
    }
  },
};

/**
 * Performance monitoring - only in development
 */
export const perf = {
  start: (label: string) => {
    if (isDev) {
      performance.mark(`${label}-start`);
    }
  },

  end: (label: string) => {
    if (isDev) {
      performance.mark(`${label}-end`);
      try {
        performance.measure(label, `${label}-start`, `${label}-end`);
        const measure = performance.getEntriesByName(label)[0];
        console.log(
          `%c⏱️ ${label}: ${(measure.duration).toFixed(2)}ms`,
          'color: blue'
        );
      } catch (e) {
        // Ignore if marks don't exist
      }
    }
  },
};
