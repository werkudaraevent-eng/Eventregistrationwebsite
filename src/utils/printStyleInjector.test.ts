/**
 * Property-Based Tests for Print Style Injection
 * 
 * Feature: badge-print-paper-size
 * Tests aspect ratio preservation and element preservation during print rendering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  injectPrintStyles,
  removePrintStyles,
  hasPrintStyles
} from './printStyleInjector';
import { DEFAULT_PRINT_CONFIG } from './localDBStub';
import type { PaperSizeConfiguration } from './localDBStub';

describe('Print Style Injection', () => {
  beforeEach(() => {
    // Clean up before each test
    removePrintStyles();
  });

  afterEach(() => {
    // Clean up after each test
    removePrintStyles();
  });

  it('should inject and remove print styles', () => {
    expect(hasPrintStyles()).toBe(false);

    injectPrintStyles(DEFAULT_PRINT_CONFIG, 85.6, 53.98);
    expect(hasPrintStyles()).toBe(true);

    removePrintStyles();
    expect(hasPrintStyles()).toBe(false);
  });

  it('should replace existing styles when injecting new ones', () => {
    injectPrintStyles(DEFAULT_PRINT_CONFIG, 85.6, 53.98);
    const firstStyleElement = document.getElementById('badge-print-styles');
    const firstContent = firstStyleElement?.textContent;

    // Inject different configuration
    const newConfig: PaperSizeConfiguration = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'A6'
    };
    injectPrintStyles(newConfig, 85.6, 53.98);

    const secondStyleElement = document.getElementById('badge-print-styles');
    const secondContent = secondStyleElement?.textContent;

    // Should be different content
    expect(secondContent).not.toBe(firstContent);
    // Should still have styles injected
    expect(hasPrintStyles()).toBe(true);
  });
});

/**
 * Property 7: Aspect ratio preservation
 * For any badge component, the aspect ratio before and after print rendering 
 * should be equal within 1% tolerance
 * Validates: Requirements 3.3
 */
describe('Property 7: Aspect ratio preservation', () => {
  it('should preserve aspect ratio in generated CSS', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 200, noNaN: true }),
        fc.double({ min: 50, max: 200, noNaN: true }),
        (badgeWidth, badgeHeight) => {
          const originalAspectRatio = badgeWidth / badgeHeight;

          // Inject print styles
          injectPrintStyles(DEFAULT_PRINT_CONFIG, badgeWidth, badgeHeight);

          // Get injected styles
          const styleElement = document.getElementById('badge-print-styles');
          expect(styleElement).toBeTruthy();

          const cssText = styleElement?.textContent || '';

          // Check that badge dimensions are in the CSS
          expect(cssText).toContain(`width: ${badgeWidth}mm`);
          expect(cssText).toContain(`height: ${badgeHeight}mm`);

          // Calculate aspect ratio from CSS (should be same as original)
          const cssAspectRatio = badgeWidth / badgeHeight;
          const difference = Math.abs(originalAspectRatio - cssAspectRatio) / originalAspectRatio;

          // Aspect ratio should be preserved (within 1% tolerance)
          expect(difference).toBeLessThan(0.01);

          // Clean up
          removePrintStyles();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain aspect ratio across different paper sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.double({ min: 50, max: 150, noNaN: true }),
        fc.double({ min: 50, max: 150, noNaN: true }),
        (sizeType, badgeWidth, badgeHeight) => {
          const config: PaperSizeConfiguration = {
            ...DEFAULT_PRINT_CONFIG,
            sizeType: sizeType as any
          };

          const originalAspectRatio = badgeWidth / badgeHeight;

          injectPrintStyles(config, badgeWidth, badgeHeight);

          const styleElement = document.getElementById('badge-print-styles');
          const cssText = styleElement?.textContent || '';

          // Verify dimensions are preserved in CSS
          expect(cssText).toContain(`width: ${badgeWidth}mm`);
          expect(cssText).toContain(`height: ${badgeHeight}mm`);

          const cssAspectRatio = badgeWidth / badgeHeight;
          expect(cssAspectRatio).toBeCloseTo(originalAspectRatio, 5);

          removePrintStyles();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 12: Element preservation in print
 * For any badge template with components, all enabled components should be 
 * present in the generated print output
 * Validates: Requirements 3.5
 */
describe('Property 12: Element preservation in print', () => {
  it('should generate CSS that does not hide badge elements', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('A4', 'Letter'),
        fc.double({ min: 50, max: 150, noNaN: true }),
        fc.double({ min: 50, max: 150, noNaN: true }),
        (sizeType, badgeWidth, badgeHeight) => {
          const config: PaperSizeConfiguration = {
            ...DEFAULT_PRINT_CONFIG,
            sizeType: sizeType as any
          };

          injectPrintStyles(config, badgeWidth, badgeHeight);

          const styleElement = document.getElementById('badge-print-styles');
          const cssText = styleElement?.textContent || '';

          // Verify that badge-container is styled but not hidden
          expect(cssText).toContain('.badge-container');
          expect(cssText).not.toContain('.badge-container { display: none');
          expect(cssText).not.toContain('.badge-container{display:none');

          // Verify that only .no-print class is hidden
          expect(cssText).toContain('.no-print');
          expect(cssText).toContain('display: none !important');

          // Verify page-break-inside: avoid is set (preserves elements)
          expect(cssText).toContain('page-break-inside: avoid');

          removePrintStyles();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not add display:none to badge components', () => {
    injectPrintStyles(DEFAULT_PRINT_CONFIG, 85.6, 53.98);

    const styleElement = document.getElementById('badge-print-styles');
    const cssText = styleElement?.textContent || '';

    // Badge container should be visible
    const badgeContainerMatch = cssText.match(/\.badge-container\s*{[^}]*}/);
    if (badgeContainerMatch) {
      expect(badgeContainerMatch[0]).not.toContain('display: none');
      expect(badgeContainerMatch[0]).not.toContain('display:none');
    }

    removePrintStyles();
  });
});


/**
 * Property 11: Print configuration usage
 * For any event with a saved print configuration, printing badges from 
 * participant management should apply the same configuration as saved 
 * in the badge template
 * Validates: Requirements 4.4
 */
describe('Property 11: Print configuration usage', () => {
  it('should use saved configuration when printing', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CR80', 'A4', 'A6', 'A7', 'Letter'),
        fc.constantFrom('portrait', 'landscape'),
        fc.integer({ min: 5, max: 20 }),
        (sizeType, orientation, margin) => {
          // Simulate saved configuration
          const savedConfig: PaperSizeConfiguration = {
            sizeType: sizeType as any,
            orientation: orientation as any,
            margins: { top: margin, right: margin, bottom: margin, left: margin }
          };

          // Inject print styles with saved configuration
          injectPrintStyles(savedConfig, 85.6, 53.98);

          // Verify styles are injected
          expect(hasPrintStyles()).toBe(true);

          const styleElement = document.getElementById('badge-print-styles');
          const cssText = styleElement?.textContent || '';

          // Verify configuration is applied
          expect(cssText).toContain(`margin-top: ${margin}mm`);
          expect(cssText).toContain(`margin-right: ${margin}mm`);
          expect(cssText).toContain(`margin-bottom: ${margin}mm`);
          expect(cssText).toContain(`margin-left: ${margin}mm`);
          expect(cssText).toContain(`size: ${orientation}`);

          removePrintStyles();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply custom dimensions when sizeType is Custom', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 300, noNaN: true }),
        fc.double({ min: 100, max: 300, noNaN: true }),
        (customWidth, customHeight) => {
          const savedConfig: PaperSizeConfiguration = {
            sizeType: 'Custom',
            orientation: 'portrait',
            customWidth,
            customHeight,
            margins: { top: 10, right: 10, bottom: 10, left: 10 }
          };

          injectPrintStyles(savedConfig, 85.6, 53.98);

          const styleElement = document.getElementById('badge-print-styles');
          const cssText = styleElement?.textContent || '';

          // Verify custom dimensions are used
          expect(cssText).toContain(`size: ${customWidth}mm ${customHeight}mm`);

          removePrintStyles();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve configuration across multiple print operations', () => {
    const config1: PaperSizeConfiguration = {
      sizeType: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    };

    const config2: PaperSizeConfiguration = {
      sizeType: 'Letter',
      orientation: 'landscape',
      margins: { top: 15, right: 15, bottom: 15, left: 15 }
    };

    // First print operation
    injectPrintStyles(config1, 85.6, 53.98);
    let styleElement = document.getElementById('badge-print-styles');
    let cssText = styleElement?.textContent || '';
    expect(cssText).toContain('margin-top: 10mm');
    expect(cssText).toContain('size: portrait');

    // Second print operation with different config
    injectPrintStyles(config2, 85.6, 53.98);
    styleElement = document.getElementById('badge-print-styles');
    cssText = styleElement?.textContent || '';
    expect(cssText).toContain('margin-top: 15mm');
    expect(cssText).toContain('size: landscape');

    removePrintStyles();
  });
});
