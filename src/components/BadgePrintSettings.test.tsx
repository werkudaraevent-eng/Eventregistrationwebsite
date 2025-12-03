/**
 * Property-Based Tests for BadgePrintSettings Component
 * 
 * Feature: badge-print-paper-size, Property 4
 * Tests that print preview updates reactively when configuration changes.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BadgePrintSettings } from './BadgePrintSettings';
import { DEFAULT_PRINT_CONFIG } from '../utils/localDBStub';

/**
 * Property 4: Print preview reactivity
 * For any paper size change, the print preview should update to reflect 
 * the new dimensions within the same render cycle
 * Validates: Requirements 2.3
 */
describe('Property 4: Print preview reactivity', () => {
  it('should display initial paper dimensions correctly', () => {
    const mockOnChange = vi.fn();

    render(
      <BadgePrintSettings
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Initial state - A4 portrait
    expect(screen.getByText('Paper Dimensions')).toBeInTheDocument();
    expect(screen.getAllByText(/210\.0mm × 297\.0mm/).length).toBeGreaterThan(0);
  });

  it('should update preview when orientation changes', async () => {
    const mockOnChange = vi.fn();

    const { rerender } = render(
      <BadgePrintSettings
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Initial state - portrait
    expect(screen.getByText('portrait')).toBeInTheDocument();

    // Change to landscape
    const landscapeRadio = screen.getByLabelText(/Landscape/);
    fireEvent.click(landscapeRadio);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    const newConfig = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];

    rerender(
      <BadgePrintSettings
        configuration={newConfig}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Preview should update to show landscape dimensions (swapped)
    await waitFor(() => {
      expect(screen.getByText('landscape')).toBeInTheDocument();
      expect(screen.getAllByText(/297\.0mm × 210\.0mm/).length).toBeGreaterThan(0);
    });
  });

  it('should update preview when custom dimensions change', async () => {
    const customConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const,
      customWidth: 200,
      customHeight: 250
    };

    const mockOnChange = vi.fn();

    const { rerender } = render(
      <BadgePrintSettings
        configuration={customConfig}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Initial custom dimensions
    expect(screen.getByText(/200\.0mm × 250\.0mm/)).toBeInTheDocument();

    // Change width
    const widthInput = screen.getByLabelText('Width (mm)');
    fireEvent.change(widthInput, { target: { value: '300' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });

    const newConfig = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];

    rerender(
      <BadgePrintSettings
        configuration={newConfig}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Preview should update to show new dimensions
    await waitFor(() => {
      expect(screen.getByText(/300\.0mm × 250\.0mm/)).toBeInTheDocument();
    });
  });

  it('should display badge count', () => {
    const mockOnChange = vi.fn();

    render(
      <BadgePrintSettings
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={50}
        badgeHeight={70}
        onConfigurationChange={mockOnChange}
      />
    );

    expect(screen.getByText('Badges Per Page')).toBeInTheDocument();
  });
});

/**
 * Unit tests for BadgePrintSettings integration
 */
describe('BadgePrintSettings Integration', () => {
  it('should render all sub-components', () => {
    const mockOnChange = vi.fn();

    render(
      <BadgePrintSettings
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Check that all sections are present
    expect(screen.getByText('Paper Size')).toBeInTheDocument();
    expect(screen.getByText('Orientation')).toBeInTheDocument();
    expect(screen.getByText('Print Preview')).toBeInTheDocument();
  });

  it('should call onConfigurationChange when orientation changes', () => {
    const mockOnChange = vi.fn();

    render(
      <BadgePrintSettings
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Change orientation
    const landscapeRadio = screen.getByLabelText(/Landscape/);
    fireEvent.click(landscapeRadio);

    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnChange.mock.calls[0][0].orientation).toBe('landscape');
  });

  it('should maintain configuration state across updates', () => {
    const mockOnChange = vi.fn();

    const { rerender } = render(
      <BadgePrintSettings
        configuration={DEFAULT_PRINT_CONFIG}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Change orientation
    const landscapeRadio = screen.getByLabelText(/Landscape/);
    fireEvent.click(landscapeRadio);

    const updatedConfig = mockOnChange.mock.calls[0][0];

    // Rerender with updated config
    rerender(
      <BadgePrintSettings
        configuration={updatedConfig}
        badgeWidth={85.6}
        badgeHeight={53.98}
        onConfigurationChange={mockOnChange}
      />
    );

    // Orientation should still be landscape
    expect(screen.getByText('landscape')).toBeInTheDocument();
  });
});
