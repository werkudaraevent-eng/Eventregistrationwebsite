/**
 * Unit Tests for PaperSizeSelector Component
 * 
 * Tests UI behavior and validation for paper size selection using dropdown.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaperSizeSelector } from './PaperSizeSelector';
import { DEFAULT_PRINT_CONFIG } from '../utils/localDBStub';

describe('PaperSizeSelector Component', () => {
  it('should display paper size dropdown with current value', () => {
    const mockOnChange = vi.fn();
    
    render(
      <PaperSizeSelector
        configuration={DEFAULT_PRINT_CONFIG}
        onConfigurationChange={mockOnChange}
      />
    );

    // Check that dropdown trigger shows current value (A4)
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('A4 Paper')).toBeInTheDocument();
  });

  it('should show custom dimension inputs when Custom is selected', () => {
    const mockOnChange = vi.fn();
    const customConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const
    };

    render(
      <PaperSizeSelector
        configuration={customConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    // Check that custom dimension inputs are visible
    expect(screen.getByLabelText('Width (mm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Height (mm)')).toBeInTheDocument();
  });

  it('should not show custom dimension inputs when standard size is selected', () => {
    const mockOnChange = vi.fn();

    render(
      <PaperSizeSelector
        configuration={DEFAULT_PRINT_CONFIG}
        onConfigurationChange={mockOnChange}
      />
    );

    // Custom dimension inputs should not be visible
    expect(screen.queryByLabelText('Width (mm)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Height (mm)')).not.toBeInTheDocument();
  });

  it('should display validation error for invalid custom width', () => {
    const mockOnChange = vi.fn();
    const invalidConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const,
      customWidth: 30, // Below minimum of 50mm
      customHeight: 150
    };

    render(
      <PaperSizeSelector
        configuration={invalidConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    // Check for error message
    expect(screen.getByText(/Width must be between/)).toBeInTheDocument();
  });

  it('should display validation error for invalid custom height', () => {
    const mockOnChange = vi.fn();
    const invalidConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const,
      customWidth: 100,
      customHeight: 600 // Above maximum of 500mm
    };

    render(
      <PaperSizeSelector
        configuration={invalidConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    // Check for error message
    expect(screen.getByText(/Height must be between/)).toBeInTheDocument();
  });


  it('should not display validation error for valid custom dimensions', () => {
    const mockOnChange = vi.fn();
    const validConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const,
      customWidth: 200,
      customHeight: 250
    };

    render(
      <PaperSizeSelector
        configuration={validConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    // Should not show error message
    expect(screen.queryByText(/must be between/)).not.toBeInTheDocument();
  });

  it('should call onConfigurationChange when custom width is changed', () => {
    const mockOnChange = vi.fn();
    const customConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const
    };

    render(
      <PaperSizeSelector
        configuration={customConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    const widthInput = screen.getByLabelText('Width (mm)');
    fireEvent.change(widthInput, { target: { value: '250' } });

    expect(mockOnChange).toHaveBeenCalledWith({ customWidth: 250 });
  });

  it('should call onConfigurationChange when custom height is changed', () => {
    const mockOnChange = vi.fn();
    const customConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const
    };

    render(
      <PaperSizeSelector
        configuration={customConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    const heightInput = screen.getByLabelText('Height (mm)');
    fireEvent.change(heightInput, { target: { value: '300' } });

    expect(mockOnChange).toHaveBeenCalledWith({ customHeight: 300 });
  });

  it('should apply error styling to inputs with invalid values', () => {
    const mockOnChange = vi.fn();
    const invalidConfig = {
      ...DEFAULT_PRINT_CONFIG,
      sizeType: 'Custom' as const,
      customWidth: 30,
      customHeight: 150
    };

    render(
      <PaperSizeSelector
        configuration={invalidConfig}
        onConfigurationChange={mockOnChange}
      />
    );

    const widthInput = screen.getByLabelText('Width (mm)');
    expect(widthInput).toHaveClass('border-red-500');
  });
});
