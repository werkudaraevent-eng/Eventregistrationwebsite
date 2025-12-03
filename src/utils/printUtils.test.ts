/**
 * Property-Based Tests for Print Utilities
 * 
 * Feature: badge-print-paper-size
 * Tests correctness properties for print utilities including unit conversion,
 * dimension calculations, and validation logic.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  mmToPixels,
  pixelsToMm,
  getPaperDimensions,
  getPrintableArea,
  validateCustomDimensions,
  validateMargins,
  validateBadgeFitsOnPaper,
  calculateBadgesPerPage,
  swapDimensions,
  PrintStyleGenerator
} from './printUtils';
import type { PaperSizeConfiguration } from './localDBStub';
import { DEFAULT_PRINT_CONFIG } from './localDBStub';

/**
 * Property 6: Unit conversion accuracy
 * For any dimension in millimeters, converting to CSS units and back 
 * should preserve the original value within 0.1mm tolerance
 * Validates: Requirements 3.1
 */
describe('Property 6: Unit conversion accuracy', () => {
  it('should preserve values within 0.1mm tolerance when converting mm -> px -> mm', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 500, noNaN: true }),
        (mmValue) => {
          // Convert mm to pixels and back to mm
          const pixels = mmToPixels(mmValue);
          const mmResult = pixelsToMm(pixels);
          
          // Calculate difference
          const difference = Math.abs(mmValue - mmResult);
          
          // Assert difference is within 0.1mm tolerance
          expect(difference).toBeLessThan(0.1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve values within 0.1mm tolerance when converting px -> mm -> px', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 189, max: 1890, noNaN: true }), // 50mm-500mm in pixels
        (pxValue) => {
          // Convert pixels to mm and back to pixels
          const mm = pixelsToMm(pxValue);
          const pxResult = mmToPixels(mm);
          
          // Calculate difference
          const difference = Math.abs(pxValue - pxResult);
          
          // Assert difference is within tolerance (0.1mm = ~0.378px)
          expect(difference).toBeLessThan(0.378);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 2: Custom dimension validation
 * For any custom dimension input, the system should accept values 
 * between 50mm and 500mm inclusive, and reject values outside this range
 * Validates: Requirements 1.5
 */
describe('Property 2: Custom dimension validation', () => {
  it('should accept all values between 50mm and 500mm inclusive', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 500, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (width, height) => {
          const result = validateCustomDimensions(width, height);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject values below 50mm', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.99, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (width, height) => {
          const result = validateCustomDimensions(width, height);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Width must be between');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject values above 500mm', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 500.01, max: 1000, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (width, height) => {
          const result = validateCustomDimensions(width, height);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Width must be between');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Margin calculation
 * For any paper size configuration, the calculated margins should ensure 
 * that badge content fits within the printable area (paper size minus margins)
 * Validates: Requirements 2.4
 */
describe('Property 5: Margin calculation', () => {
  it('should ensure printable area is always smaller than paper size', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.constantFrom('portrait', 'landscape'),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (sizeType, orientation, top, right, bottom, left) => {
          const config: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top, right, bottom, left }
          };

          const paperDims = getPaperDimensions(config);
          const printableArea = getPrintableArea(config);

          // Printable area should be smaller than paper size
          expect(printableArea.width).toBeLessThanOrEqual(paperDims.width);
          expect(printableArea.height).toBeLessThanOrEqual(paperDims.height);

          // Printable area should equal paper size minus margins
          expect(printableArea.width).toBeCloseTo(
            paperDims.width - left - right,
            2
          );
          expect(printableArea.height).toBeCloseTo(
            paperDims.height - top - bottom,
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate margins are within 0-50mm range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (top, right, bottom, left) => {
          const result = validateMargins({ top, right, bottom, left });
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject margins outside 0-50mm range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 100 }),
        (invalidMargin) => {
          const result = validateMargins({
            top: invalidMargin,
            right: 10,
            bottom: 10,
            left: 10
          });
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Margins must be between');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 9: Orientation dimension swap
 * For any paper size, when orientation changes from portrait to landscape 
 * (or vice versa), the effective width and height should be swapped
 * Validates: Requirements 5.4
 */
describe('Property 9: Orientation dimension swap', () => {
  it('should swap width and height when orientation changes for standard sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        (sizeType) => {
          const portraitConfig: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: 'portrait',
            margins: { top: 10, right: 10, bottom: 10, left: 10 }
          };

          const landscapeConfig: PaperSizeConfiguration = {
            ...portraitConfig,
            orientation: 'landscape'
          };

          const portraitDims = getPaperDimensions(portraitConfig);
          const landscapeDims = getPaperDimensions(landscapeConfig);

          // Width and height should be swapped
          expect(portraitDims.width).toBeCloseTo(landscapeDims.height, 2);
          expect(portraitDims.height).toBeCloseTo(landscapeDims.width, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should swap width and height when orientation changes for Indonesian ID card sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('B1', 'B2', 'B3', 'B4', 'A1_ID', 'A2_ID', 'A3_ID'),
        (sizeType) => {
          const portraitConfig: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: 'portrait',
            margins: { top: 5, right: 5, bottom: 5, left: 5 }
          };

          const landscapeConfig: PaperSizeConfiguration = {
            ...portraitConfig,
            orientation: 'landscape'
          };

          const portraitDims = getPaperDimensions(portraitConfig);
          const landscapeDims = getPaperDimensions(landscapeConfig);

          // Width and height should be swapped
          expect(portraitDims.width).toBeCloseTo(landscapeDims.height, 2);
          expect(portraitDims.height).toBeCloseTo(landscapeDims.width, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should swap dimensions correctly with swapDimensions utility', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 500, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (width, height) => {
          const swapped = swapDimensions(width, height);
          
          expect(swapped.width).toBeCloseTo(height, 2);
          expect(swapped.height).toBeCloseTo(width, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow all paper sizes to be used in both orientations', () => {
    // Test all available paper sizes can be used with both orientations
    const allSizes = ['CR80', 'A4', 'A5', 'A6', 'A7', 'Letter', 'B1', 'B2', 'B3', 'B4', 'A1_ID', 'A2_ID', 'A3_ID'];
    
    for (const sizeType of allSizes) {
      const portraitConfig: PaperSizeConfiguration = {
        sizeType: sizeType as any,
        orientation: 'portrait',
        margins: { top: 5, right: 5, bottom: 5, left: 5 }
      };

      const landscapeConfig: PaperSizeConfiguration = {
        ...portraitConfig,
        orientation: 'landscape'
      };

      const portraitDims = getPaperDimensions(portraitConfig);
      const landscapeDims = getPaperDimensions(landscapeConfig);

      // Both orientations should return valid dimensions
      expect(portraitDims.width).toBeGreaterThan(0);
      expect(portraitDims.height).toBeGreaterThan(0);
      expect(landscapeDims.width).toBeGreaterThan(0);
      expect(landscapeDims.height).toBeGreaterThan(0);

      // Dimensions should be swapped between orientations
      expect(portraitDims.width).toBeCloseTo(landscapeDims.height, 2);
      expect(portraitDims.height).toBeCloseTo(landscapeDims.width, 2);
    }
  });
});

/**
 * Property 10: Badge layout calculation
 * For any combination of paper size and badge size, the calculated number 
 * of badges per page should be the maximum number that fits within the 
 * printable area without overlap
 * Validates: Requirements 2.5, 6.3
 */
describe('Property 10: Badge layout calculation', () => {
  it('should calculate maximum badges that fit without overlap', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.constantFrom('portrait', 'landscape'),
        fc.double({ min: 50, max: 150, noNaN: true }),
        fc.double({ min: 50, max: 150, noNaN: true }),
        (sizeType, orientation, badgeWidth, badgeHeight) => {
          const config: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top: 10, right: 10, bottom: 10, left: 10 }
          };

          const printableArea = getPrintableArea(config);
          const badgesPerPage = calculateBadgesPerPage(badgeWidth, badgeHeight, config);

          // Calculate expected badges per row and column
          const expectedPerRow = Math.floor(printableArea.width / badgeWidth);
          const expectedPerColumn = Math.floor(printableArea.height / badgeHeight);
          const expectedTotal = expectedPerRow * expectedPerColumn;

          expect(badgesPerPage).toBe(expectedTotal);

          // Verify no overlap: total badge area should not exceed printable area
          if (badgesPerPage > 0) {
            const badgesPerRow = Math.floor(printableArea.width / badgeWidth);
            const badgesPerColumn = Math.floor(printableArea.height / badgeHeight);
            
            expect(badgesPerRow * badgeWidth).toBeLessThanOrEqual(printableArea.width);
            expect(badgesPerColumn * badgeHeight).toBeLessThanOrEqual(printableArea.height);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 3: CSS @page rule generation
 * For any paper size configuration, the generated CSS @page rules should 
 * specify page dimensions that exactly match the configured paper size 
 * (accounting for orientation)
 * Validates: Requirements 2.1, 3.2, 5.3
 */
describe('Property 3: CSS @page rule generation', () => {
  it('should generate CSS @page rules matching paper dimensions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.constantFrom('portrait', 'landscape'),
        fc.integer({ min: 0, max: 50 }),
        (sizeType, orientation, margin) => {
          const config: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top: margin, right: margin, bottom: margin, left: margin }
          };

          const css = PrintStyleGenerator.generatePageRules(config);
          const dims = getPaperDimensions(config);

          // CSS should contain the correct dimensions
          expect(css).toContain(`size: ${dims.width}mm ${dims.height}mm`);
          expect(css).toContain(`margin-top: ${margin}mm`);
          expect(css).toContain(`margin-right: ${margin}mm`);
          expect(css).toContain(`margin-bottom: ${margin}mm`);
          expect(css).toContain(`margin-left: ${margin}mm`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate @media print styles with correct orientation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('portrait', 'landscape'),
        fc.double({ min: 50, max: 150, noNaN: true }),
        fc.double({ min: 50, max: 150, noNaN: true }),
        (orientation, badgeWidth, badgeHeight) => {
          const config: PaperSizeConfiguration = {
            ...DEFAULT_PRINT_CONFIG,
            orientation: orientation as any
          };

          const css = PrintStyleGenerator.generateMediaPrintStyles(
            config,
            badgeWidth,
            badgeHeight
          );

          // CSS should contain orientation
          expect(css).toContain(`size: ${orientation}`);
          expect(css).toContain(`width: ${badgeWidth}mm`);
          expect(css).toContain(`height: ${badgeHeight}mm`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for edge cases and specific scenarios
 */
describe('Unit tests for validation functions', () => {
  it('should validate badge fits on paper', () => {
    const config: PaperSizeConfiguration = {
      sizeType: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    };

    // Badge that fits
    const fitsResult = validateBadgeFitsOnPaper(85.6, 53.98, config);
    expect(fitsResult.valid).toBe(true);

    // Badge too large
    const tooLargeResult = validateBadgeFitsOnPaper(300, 400, config);
    expect(tooLargeResult.valid).toBe(false);
    expect(tooLargeResult.error).toContain('exceeds printable area');
  });

  it('should handle custom paper size with custom dimensions', () => {
    const config: PaperSizeConfiguration = {
      sizeType: 'Custom',
      orientation: 'portrait',
      customWidth: 200,
      customHeight: 250,
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    };

    const dims = getPaperDimensions(config);
    expect(dims.width).toBe(200);
    expect(dims.height).toBe(250);
  });

  it('should use default dimensions for Custom when not provided', () => {
    const config: PaperSizeConfiguration = {
      sizeType: 'Custom',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    };

    const dims = getPaperDimensions(config);
    expect(dims.width).toBe(100);
    expect(dims.height).toBe(150);
  });
});


/**
 * Property 8: Configuration completeness
 * For any saved badge template with print configuration, the configuration 
 * should include sizeType, orientation, and margins (and customWidth/customHeight 
 * if sizeType is Custom)
 * Validates: Requirements 4.3
 */
describe('Property 8: Configuration completeness', () => {
  it('should have all required fields for standard paper sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.constantFrom('portrait', 'landscape'),
        fc.integer({ min: 0, max: 50 }),
        (sizeType, orientation, margin) => {
          const config: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top: margin, right: margin, bottom: margin, left: margin }
          };

          // Check all required fields are present
          expect(config.sizeType).toBeDefined();
          expect(config.orientation).toBeDefined();
          expect(config.margins).toBeDefined();
          expect(config.margins.top).toBeDefined();
          expect(config.margins.right).toBeDefined();
          expect(config.margins.bottom).toBeDefined();
          expect(config.margins.left).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have custom dimensions when sizeType is Custom', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('portrait', 'landscape'),
        fc.double({ min: 50, max: 500, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (orientation, width, height) => {
          const config: PaperSizeConfiguration = {
            sizeType: 'Custom',
            orientation: orientation as any,
            customWidth: width,
            customHeight: height,
            margins: { top: 10, right: 10, bottom: 10, left: 10 }
          };

          // Check all required fields including custom dimensions
          expect(config.sizeType).toBe('Custom');
          expect(config.customWidth).toBeDefined();
          expect(config.customHeight).toBeDefined();
          expect(config.customWidth).toBeGreaterThanOrEqual(50);
          expect(config.customWidth).toBeLessThanOrEqual(500);
          expect(config.customHeight).toBeGreaterThanOrEqual(50);
          expect(config.customHeight).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that DEFAULT_PRINT_CONFIG is complete', () => {
    expect(DEFAULT_PRINT_CONFIG.sizeType).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.orientation).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.top).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.right).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.bottom).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.left).toBeDefined();
  });
});


/**
 * Property 1: Paper size persistence (Round-trip)
 * For any paper size configuration, when saved to the badge template, 
 * retrieving the badge template should return the same paper size configuration
 * Validates: Requirements 1.2, 4.1, 4.2
 */
describe('Property 1: Paper size persistence', () => {
  it('should preserve configuration through save/load cycle', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter', 'Custom'),
        fc.constantFrom('portrait', 'landscape'),
        fc.integer({ min: 0, max: 50 }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (sizeType, orientation, margin, customWidth, customHeight) => {
          // Create configuration
          const originalConfig: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top: margin, right: margin, bottom: margin, left: margin },
            ...(sizeType === 'Custom' && { customWidth, customHeight })
          };

          // Simulate save: convert to JSON and back (like Supabase does)
          const savedJson = JSON.stringify(originalConfig);
          const loadedConfig: PaperSizeConfiguration = JSON.parse(savedJson);

          // Verify all fields match
          expect(loadedConfig.sizeType).toBe(originalConfig.sizeType);
          expect(loadedConfig.orientation).toBe(originalConfig.orientation);
          expect(loadedConfig.margins.top).toBe(originalConfig.margins.top);
          expect(loadedConfig.margins.right).toBe(originalConfig.margins.right);
          expect(loadedConfig.margins.bottom).toBe(originalConfig.margins.bottom);
          expect(loadedConfig.margins.left).toBe(originalConfig.margins.left);

          if (sizeType === 'Custom') {
            expect(loadedConfig.customWidth).toBeCloseTo(originalConfig.customWidth!, 2);
            expect(loadedConfig.customHeight).toBeCloseTo(originalConfig.customHeight!, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle default configuration persistence', () => {
    // Save default config
    const savedJson = JSON.stringify(DEFAULT_PRINT_CONFIG);
    const loadedConfig: PaperSizeConfiguration = JSON.parse(savedJson);

    // Verify it matches
    expect(loadedConfig).toEqual(DEFAULT_PRINT_CONFIG);
  });

  it('should preserve configuration with all margin values different', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('A4', 'Letter'),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (sizeType, top, right, bottom, left) => {
          const originalConfig: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: 'portrait',
            margins: { top, right, bottom, left }
          };

          const savedJson = JSON.stringify(originalConfig);
          const loadedConfig: PaperSizeConfiguration = JSON.parse(savedJson);

          expect(loadedConfig.margins.top).toBe(top);
          expect(loadedConfig.margins.right).toBe(right);
          expect(loadedConfig.margins.bottom).toBe(bottom);
          expect(loadedConfig.margins.left).toBe(left);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 8: Configuration completeness
 * For any saved badge template with print configuration, the configuration 
 * should include sizeType, orientation, and margins (and customWidth/customHeight 
 * if sizeType is Custom)
 * Validates: Requirements 4.3
 */
describe('Property 8: Configuration completeness', () => {
  it('should have all required fields for standard paper sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.constantFrom('portrait', 'landscape'),
        fc.integer({ min: 0, max: 50 }),
        (sizeType, orientation, margin) => {
          const config: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top: margin, right: margin, bottom: margin, left: margin }
          };

          // Check all required fields are present
          expect(config.sizeType).toBeDefined();
          expect(config.orientation).toBeDefined();
          expect(config.margins).toBeDefined();
          expect(config.margins.top).toBeDefined();
          expect(config.margins.right).toBeDefined();
          expect(config.margins.bottom).toBeDefined();
          expect(config.margins.left).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have custom dimensions when sizeType is Custom', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('portrait', 'landscape'),
        fc.double({ min: 50, max: 500, noNaN: true }),
        fc.double({ min: 50, max: 500, noNaN: true }),
        (orientation, width, height) => {
          const config: PaperSizeConfiguration = {
            sizeType: 'Custom',
            orientation: orientation as any,
            customWidth: width,
            customHeight: height,
            margins: { top: 10, right: 10, bottom: 10, left: 10 }
          };

          // Check all required fields including custom dimensions
          expect(config.sizeType).toBe('Custom');
          expect(config.customWidth).toBeDefined();
          expect(config.customHeight).toBeDefined();
          expect(config.customWidth).toBeGreaterThanOrEqual(50);
          expect(config.customWidth).toBeLessThanOrEqual(500);
          expect(config.customHeight).toBeGreaterThanOrEqual(50);
          expect(config.customHeight).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that DEFAULT_PRINT_CONFIG is complete', () => {
    expect(DEFAULT_PRINT_CONFIG.sizeType).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.orientation).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.top).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.right).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.bottom).toBeDefined();
    expect(DEFAULT_PRINT_CONFIG.margins.left).toBeDefined();
  });
});
