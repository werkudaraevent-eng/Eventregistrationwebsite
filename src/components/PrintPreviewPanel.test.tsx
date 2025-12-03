/**
 * Unit Tests for PrintPreviewPanel Component
 * 
 * Tests preview display, badge count calculation, and warning indicators.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrintPreviewPanel } from './PrintPreviewPanel';
import { DEFAULT_PRINT_CONFIG } from '../utils/localDBStub';

describe('PrintPreviewPanel Component', () => {
  it('should display paper dimensions correctly', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    // Check that paper dimensions are displayed
    expect(screen.getByText(/210\.0mm × 297\.0mm/)).toBeInTheDocument();
  });

  it('should display orientation', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    expect(screen.getByText('portrait')).toBeInTheDocument();
  });

  it('should display printable area dimensions', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    // Printable area = 210-10-10 x 297-10-10 = 190 x 277
    expect(screen.getByText(/190\.0mm × 277\.0mm/)).toBeInTheDocument();
  });

  it('should calculate and display badge count per page', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    // With A4 (190x277 printable), CR80 badges (85.6x53.98): 2x5 = 10 badges
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should display badge layout (rows x columns)', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    expect(screen.getByText(/2 × 5 layout/)).toBeInTheDocument();
  });

  it('should show warning when badge does not fit on paper', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={300}
        badgeHeight={400}
      />
    );

    expect(screen.getByText('Issue Detected')).toBeInTheDocument();
    expect(screen.getByText(/exceeds printable area/)).toBeInTheDocument();
  });

  it('should show warning for small margins', () => {
    const configWithSmallMargins = {
      ...DEFAULT_PRINT_CONFIG,
      margins: { top: 2, right: 2, bottom: 2, left: 2 }
    };

    render(
      <PrintPreviewPanel
        configuration={configWithSmallMargins}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    expect(screen.getByText('Small Margins')).toBeInTheDocument();
    expect(screen.getByText(/may cause printing issues/)).toBeInTheDocument();
  });

  it('should not show warnings when configuration is valid', () => {
    render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    expect(screen.queryByText('Issue Detected')).not.toBeInTheDocument();
    expect(screen.queryByText('Small Margins')).not.toBeInTheDocument();
  });

  it('should show tooltip on hover', () => {
    const { container } = render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    const previewElement = container.querySelector('.relative.bg-white');
    expect(previewElement).toBeInTheDocument();

    // Hover over preview
    if (previewElement) {
      fireEvent.mouseEnter(previewElement);
    }

    // Tooltip should appear with detailed info
    expect(screen.getByText(/Paper: 210\.0mm × 297\.0mm/)).toBeInTheDocument();
    expect(screen.getByText(/Printable: 190\.0mm × 277\.0mm/)).toBeInTheDocument();
    expect(screen.getByText(/Margins: 10mm/)).toBeInTheDocument();
  });

  it('should hide tooltip on mouse leave', () => {
    const { container } = render(
      <PrintPreviewPanel
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    const previewElement = container.querySelector('.relative.bg-white');
    
    if (previewElement) {
      // Show tooltip
      fireEvent.mouseEnter(previewElement);
      expect(screen.getByText(/Paper: 210\.0mm × 297\.0mm/)).toBeInTheDocument();

      // Hide tooltip
      fireEvent.mouseLeave(previewElement);
      expect(screen.queryByText(/Paper: 210\.0mm × 297\.0mm/)).not.toBeInTheDocument();
    }
  });

  it('should display landscape orientation correctly', () => {
    const landscapeConfig = {
      ...DEFAULT_PRINT_CONFIG,
      orientation: 'landscape' as const
    };

    render(
      <PrintPreviewPanel
        configuration={landscapeConfig}
        badgeWidth={85.6}
        badgeHeight={53.98}
      />
    );

    // Landscape A4: 297x210 (swapped)
    expect(screen.getByText(/297\.0mm × 210\.0mm/)).toBeInTheDocument();
    expect(screen.getByText('landscape')).toBeInTheDocument();
  });

  it('should calculate different badge counts for different paper sizes', () => {
    const a6Config = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'A6' as const
    };

    render(
      <PrintPreviewPanel
        configuration={a6Config}
        badgeWidth={50}
        badgeHeight={70}
      />
    );

    // A6 (85x128 printable): 1x1 = 1 badge with 50x70mm badges
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
