/**
 * Design System Utility Functions
 * 
 * Helper functions for applying design system tokens consistently
 */

import { SPACING, TYPOGRAPHY, type SpacingKey, type TypographyKey } from './designSystem';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6') // 'py-2 bg-blue-500 px-6'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Get spacing value from design system scale
 * 
 * @param key - Spacing key from SPACING constant
 * @returns Spacing value in pixels
 * 
 * @example
 * getSpacing('lg') // 16
 * getSpacing('2xl') // 24
 */
export function getSpacing(key: SpacingKey): number {
  return SPACING[key];
}

/**
 * Get typography value from design system scale
 * 
 * @param key - Typography key from TYPOGRAPHY constant
 * @returns Font size in rem units
 * 
 * @example
 * getTypography('base') // '1rem'
 * getTypography('xl') // '1.25rem'
 */
export function getTypography(key: TypographyKey): string {
  return TYPOGRAPHY[key];
}

/**
 * Convert spacing key to Tailwind CSS class
 * Useful for dynamic class generation
 * 
 * @param property - CSS property (e.g., 'p', 'px', 'py', 'm', 'gap')
 * @param key - Spacing key
 * @returns Tailwind class string
 * 
 * @example
 * spacingClass('p', 'lg') // 'p-4'
 * spacingClass('gap', '2xl') // 'gap-6'
 */
export function spacingClass(property: string, key: SpacingKey): string {
  const spacingMap: Record<SpacingKey, string> = {
    xs: '1',
    sm: '2',
    md: '3',
    lg: '4',
    xl: '5',
    '2xl': '6',
    '3xl': '8',
    '4xl': '10'
  };
  
  return `${property}-${spacingMap[key]}`;
}

/**
 * Convert typography key to Tailwind CSS class
 * 
 * @param key - Typography key
 * @returns Tailwind class string
 * 
 * @example
 * typographyClass('base') // 'text-base'
 * typographyClass('xl') // 'text-xl'
 */
export function typographyClass(key: TypographyKey): string {
  const typographyMap: Record<TypographyKey, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  };
  
  return typographyMap[key];
}

/**
 * Check if an element meets minimum click target size
 * Based on WCAG 2.1 Level AAA (44x44px)
 * 
 * @param width - Element width in pixels
 * @param height - Element height in pixels
 * @param minSize - Minimum size (default: 44px)
 * @returns True if element meets minimum size
 * 
 * @example
 * meetsClickTargetSize(48, 48) // true
 * meetsClickTargetSize(40, 40) // false
 */
export function meetsClickTargetSize(
  width: number,
  height: number,
  minSize: number = 44
): boolean {
  return width >= minSize && height >= minSize;
}

/**
 * Calculate proportional padding based on font size
 * Maintains visual balance by scaling padding with text size
 * 
 * @param fontSize - Font size in pixels
 * @param ratio - Padding to font size ratio (default: 0.75)
 * @returns Padding value in pixels
 * 
 * @example
 * proportionalPadding(16) // 12
 * proportionalPadding(24) // 18
 */
export function proportionalPadding(fontSize: number, ratio: number = 0.75): number {
  return Math.round(fontSize * ratio);
}

/**
 * Get nested spacing based on nesting level
 * Increases spacing proportionally with depth
 * 
 * @param level - Nesting level (1-based)
 * @param baseSpacing - Base spacing key (default: 'md')
 * @returns Spacing value in pixels
 * 
 * @example
 * nestedSpacing(1) // 12 (md)
 * nestedSpacing(2) // 16 (lg)
 * nestedSpacing(3) // 20 (xl)
 */
export function nestedSpacing(level: number, baseSpacing: SpacingKey = 'md'): number {
  const spacingKeys: SpacingKey[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const baseIndex = spacingKeys.indexOf(baseSpacing);
  const targetIndex = Math.min(baseIndex + level - 1, spacingKeys.length - 1);
  
  return SPACING[spacingKeys[targetIndex]];
}
