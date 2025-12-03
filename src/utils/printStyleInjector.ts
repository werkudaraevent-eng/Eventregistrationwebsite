/**
 * Print Style Injector
 * 
 * Manages dynamic injection and removal of print styles for badge printing.
 */

import type { PaperSizeConfiguration } from './localDBStub';
import { PrintStyleGenerator } from './printUtils';

const PRINT_STYLE_ID = 'badge-print-styles';

/**
 * Inject print styles into document head
 */
export function injectPrintStyles(
  config: PaperSizeConfiguration,
  badgeWidth: number,
  badgeHeight: number
): void {
  // Remove existing print styles if any
  removePrintStyles();

  // Generate CSS
  const pageRules = PrintStyleGenerator.generatePageRules(config);
  const mediaRules = PrintStyleGenerator.generateMediaPrintStyles(config, badgeWidth, badgeHeight);

  // Combine CSS
  const css = `${pageRules}\n\n${mediaRules}`;

  // Create style element
  const styleElement = document.createElement('style');
  styleElement.id = PRINT_STYLE_ID;
  styleElement.textContent = css;

  // Inject into head
  document.head.appendChild(styleElement);
}

/**
 * Remove injected print styles from document head
 */
export function removePrintStyles(): void {
  const existingStyle = document.getElementById(PRINT_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }
}

/**
 * Trigger print dialog with configured styles
 */
export function printWithConfiguration(
  config: PaperSizeConfiguration,
  badgeWidth: number,
  badgeHeight: number
): { success: boolean; error?: string } {
  try {
    // Check if print is supported
    if (typeof window.print !== 'function') {
      return {
        success: false,
        error: 'Print functionality is not supported in this browser'
      };
    }

    // Check if badge print container exists
    const badgePrintContainer = document.getElementById('badge-print-container');
    if (!badgePrintContainer) {
      return {
        success: false,
        error: 'No badges to print. Please ensure badge template is configured.'
      };
    }

    // Inject styles
    injectPrintStyles(config, badgeWidth, badgeHeight);

    // Trigger print
    window.print();

    // Clean up after print dialog closes
    // Note: We keep styles injected until user closes print dialog
    // They will be removed on next print or page unload

    return { success: true };
  } catch (error) {
    console.error('Error during print operation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown print error'
    };
  }
}

/**
 * Check if print styles are currently injected
 */
export function hasPrintStyles(): boolean {
  return document.getElementById(PRINT_STYLE_ID) !== null;
}


/**
 * Detect if browser supports CSS @page rules
 */
export function detectPageRuleSupport(): boolean {
  try {
    // Create a temporary style element
    const style = document.createElement('style');
    style.textContent = '@page { margin: 0; }';
    document.head.appendChild(style);

    // Check if the rule was parsed
    const sheet = style.sheet as CSSStyleSheet;
    const hasPageRule = sheet && sheet.cssRules.length > 0;

    // Clean up
    document.head.removeChild(style);

    return hasPageRule;
  } catch (error) {
    console.warn('Could not detect @page support:', error);
    // Assume supported if detection fails
    return true;
  }
}

/**
 * Get browser-specific print instructions
 */
export function getBrowserPrintInstructions(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') || userAgent.includes('edge')) {
    return 'In Chrome/Edge: Go to Print > More settings > Paper size';
  } else if (userAgent.includes('firefox')) {
    return 'In Firefox: Go to Print > Page Setup > Format & Options';
  } else if (userAgent.includes('safari')) {
    return 'In Safari: Go to Print > Show Details > Paper Size';
  }
  
  return 'Please check your browser\'s print settings to adjust paper size';
}
