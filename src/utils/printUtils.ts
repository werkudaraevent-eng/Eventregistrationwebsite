/**
 * Print Utilities for Badge Printing
 * 
 * Provides unit conversion and print style generation utilities
 * for accurate badge printing with custom paper sizes.
 */

import type { PaperSizeConfiguration } from './localDBStub';
import { PAPER_SIZES } from './localDBStub';

// Constants for unit conversion
// At 96 DPI (standard web resolution): 1 inch = 96 pixels, 1 inch = 25.4mm
// Therefore: 1mm = 96/25.4 = 3.7795275591 pixels
const MM_TO_PX_RATIO = 3.7795275591;

/**
 * Convert millimeters to pixels at 96 DPI
 * @param mm - Value in millimeters
 * @returns Value in pixels
 */
export function mmToPixels(mm: number): number {
  return mm * MM_TO_PX_RATIO;
}

/**
 * Convert pixels to millimeters at 96 DPI
 * @param pixels - Value in pixels
 * @returns Value in millimeters
 */
export function pixelsToMm(pixels: number): number {
  return pixels / MM_TO_PX_RATIO;
}

/**
 * Get paper dimensions in mm based on configuration
 * Accounts for orientation (swaps width/height for landscape)
 */
export function getPaperDimensions(config: PaperSizeConfiguration): { width: number; height: number } {
  let width: number;
  let height: number;

  if (config.sizeType === 'Custom') {
    width = config.customWidth || 100;
    height = config.customHeight || 150;
  } else {
    const paperSize = PAPER_SIZES[config.sizeType];
    width = paperSize.width;
    height = paperSize.height;
  }

  // Swap dimensions for landscape orientation
  if (config.orientation === 'landscape') {
    return { width: height, height: width };
  }

  return { width, height };
}

/**
 * Get printable area dimensions (paper size minus margins)
 */
export function getPrintableArea(config: PaperSizeConfiguration): { width: number; height: number } {
  const { width, height } = getPaperDimensions(config);
  const { margins } = config;

  return {
    width: width - margins.left - margins.right,
    height: height - margins.top - margins.bottom
  };
}

/**
 * Validate custom dimensions are within acceptable range
 */
export function validateCustomDimensions(width: number, height: number): { valid: boolean; error?: string } {
  const MIN_SIZE = 50; // mm
  const MAX_SIZE = 500; // mm

  if (width < MIN_SIZE || width > MAX_SIZE) {
    return {
      valid: false,
      error: `Width must be between ${MIN_SIZE}mm and ${MAX_SIZE}mm`
    };
  }

  if (height < MIN_SIZE || height > MAX_SIZE) {
    return {
      valid: false,
      error: `Height must be between ${MIN_SIZE}mm and ${MAX_SIZE}mm`
    };
  }

  return { valid: true };
}

/**
 * Validate margins are within acceptable range
 */
export function validateMargins(margins: PaperSizeConfiguration['margins']): { valid: boolean; error?: string } {
  const MIN_MARGIN = 0; // mm
  const MAX_MARGIN = 50; // mm

  const marginValues = [margins.top, margins.right, margins.bottom, margins.left];
  
  for (const margin of marginValues) {
    if (margin < MIN_MARGIN || margin > MAX_MARGIN) {
      return {
        valid: false,
        error: `Margins must be between ${MIN_MARGIN}mm and ${MAX_MARGIN}mm`
      };
    }
  }

  return { valid: true };
}

/**
 * Check if badge fits within printable area
 */
export function validateBadgeFitsOnPaper(
  badgeWidth: number,
  badgeHeight: number,
  config: PaperSizeConfiguration
): { valid: boolean; error?: string } {
  const printableArea = getPrintableArea(config);

  if (badgeWidth > printableArea.width || badgeHeight > printableArea.height) {
    return {
      valid: false,
      error: `Badge size (${badgeWidth.toFixed(1)}mm × ${badgeHeight.toFixed(1)}mm) exceeds printable area (${printableArea.width.toFixed(1)}mm × ${printableArea.height.toFixed(1)}mm)`
    };
  }

  return { valid: true };
}

/**
 * Calculate how many badges fit per page
 */
export function calculateBadgesPerPage(
  badgeWidth: number,
  badgeHeight: number,
  config: PaperSizeConfiguration
): number {
  const printableArea = getPrintableArea(config);

  const badgesPerRow = Math.floor(printableArea.width / badgeWidth);
  const badgesPerColumn = Math.floor(printableArea.height / badgeHeight);

  return badgesPerRow * badgesPerColumn;
}

/**
 * Swap dimensions for orientation change
 */
export function swapDimensions(width: number, height: number): { width: number; height: number } {
  return { width: height, height: width };
}

/**
 * PrintStyleGenerator - Generates CSS for print media
 */
export class PrintStyleGenerator {
  /**
   * Generate CSS @page rules for the specified paper size
   */
  static generatePageRules(config: PaperSizeConfiguration): string {
    const { width, height } = getPaperDimensions(config);
    const { margins } = config;

    return `
@page {
  size: ${width}mm ${height}mm;
  margin-top: ${margins.top}mm;
  margin-right: ${margins.right}mm;
  margin-bottom: ${margins.bottom}mm;
  margin-left: ${margins.left}mm;
}
    `.trim();
  }

  /**
   * Generate @media print styles for badge layout
   */
  static generateMediaPrintStyles(
    config: PaperSizeConfiguration,
    badgeWidth: number,
    badgeHeight: number
  ): string {
    return `
@media print {
  /* Hide everything except badge print container */
  body > *:not(#badge-print-container) {
    display: none !important;
  }

  body {
    margin: 0;
    padding: 0;
  }

  /* Show badge print container */
  #badge-print-container {
    display: block !important;
    position: static !important;
    z-index: auto !important;
  }

  .badge-container {
    width: ${badgeWidth}mm;
    height: ${badgeHeight}mm;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
  }

  /* Remove page break after last badge */
  .badge-container:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .no-print {
    display: none !important;
  }

  @page {
    size: ${config.orientation};
  }
}
    `.trim();
  }

  /**
   * Calculate badges per page (wrapper for standalone function)
   */
  static calculateBadgesPerPage(
    badgeWidth: number,
    badgeHeight: number,
    config: PaperSizeConfiguration
  ): number {
    return calculateBadgesPerPage(badgeWidth, badgeHeight, config);
  }
}
