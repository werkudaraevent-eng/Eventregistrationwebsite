/**
 * Design System Constants
 * 
 * Centralized design tokens for consistent spacing, typography, and theming
 * across the Badge Designer interface.
 */

/**
 * Spacing scale in pixels
 * Based on 4px base unit for consistent rhythm
 */
export const SPACING = {
  xs: 4,      // 0.25rem
  sm: 8,      // 0.5rem
  md: 12,     // 0.75rem
  lg: 16,     // 1rem
  xl: 20,     // 1.25rem
  '2xl': 24,  // 1.5rem
  '3xl': 32,  // 2rem
  '4xl': 40   // 2.5rem
} as const;

/**
 * Typography scale
 * Font sizes in rem units for accessibility
 */
export const TYPOGRAPHY = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem'   // 24px
} as const;

/**
 * Minimum click target size for accessibility
 * Based on WCAG 2.1 Level AAA guidelines
 */
export const MIN_CLICK_TARGET = 44; // pixels

/**
 * Color palette for consistent theming
 */
export const COLORS = {
  primary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87'
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  success: {
    500: '#10b981',
    600: '#059669'
  },
  error: {
    500: '#ef4444',
    600: '#dc2626'
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706'
  }
} as const;

/**
 * Border radius scale
 */
export const RADIUS = {
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  full: '9999px'
} as const;

/**
 * Shadow scale
 */
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
} as const;

/**
 * Transition durations
 */
export const TRANSITIONS = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms'
} as const;

/**
 * Z-index scale for layering
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
} as const;

// Type exports for TypeScript
export type SpacingKey = keyof typeof SPACING;
export type TypographyKey = keyof typeof TYPOGRAPHY;
export type ColorKey = keyof typeof COLORS;
export type RadiusKey = keyof typeof RADIUS;
export type ShadowKey = keyof typeof SHADOWS;
export type TransitionKey = keyof typeof TRANSITIONS;
export type ZIndexKey = keyof typeof Z_INDEX;
