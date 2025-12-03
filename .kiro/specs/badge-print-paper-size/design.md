# Design Document: Badge Print Paper Size Selection

## Overview

This feature enhances the badge printing system by adding comprehensive paper size selection capabilities. Currently, users can design badges but cannot effectively control the paper size used for printing, resulting in print previews that don't match the selected dimensions. This design introduces a paper size configuration system that integrates with the existing BadgeDesigner component and ensures accurate print output through CSS @page rules and @media print styles.

The solution extends the existing badge template system to include paper size configuration (size type, custom dimensions, and orientation), adds a UI for paper size selection, implements CSS-based print styling that respects the selected paper size, and provides visual preview of how badges will be arranged on the selected paper.

## Architecture

### Component Structure

```
BadgeDesigner (existing)
├── BadgePrintSettings (new)
│   ├── PaperSizeSelector
│   ├── OrientationSelector
│   ├── CustomDimensionInputs
│   └── PrintPreviewPanel
├── BadgeCanvas (existing)
└── ComponentStylingPanel (existing)
```

### Data Flow

1. User selects paper size/orientation in BadgePrintSettings
2. Configuration updates badge template state
3. Badge template persisted to Supabase events.badge_template
4. Print styles generated dynamically based on configuration
5. Print preview applies @media print CSS with @page rules
6. Actual printing uses the configured dimensions

### Integration Points

- **BadgeDesigner**: Extended to include print settings panel
- **Supabase events table**: badge_template field stores print configuration
- **Print system**: Browser print dialog receives CSS @page rules
- **ParticipantManagement**: Uses saved print configuration when printing badges

## Components and Interfaces

### 1. PaperSizeConfiguration Interface

```typescript
interface PaperSizeConfiguration {
  sizeType: 'CR80' | 'A4' | 'A6' | 'A7' | 'Letter' | 'Custom';
  orientation: 'portrait' | 'landscape';
  customWidth?: number;  // in mm
  customHeight?: number; // in mm
  margins: {
    top: number;    // in mm
    right: number;  // in mm
    bottom: number; // in mm
    left: number;   // in mm
  };
}
```

### 2. BadgePrintSettings Component

New component that provides UI for configuring print settings:

```typescript
interface BadgePrintSettingsProps {
  configuration: PaperSizeConfiguration;
  onConfigurationChange: (config: PaperSizeConfiguration) => void;
  badgeTemplate: BadgeTemplate;
}
```

Features:
- Radio group for standard paper sizes
- Toggle for portrait/landscape orientation
- Input fields for custom dimensions with validation
- Visual preview of paper with badge layout
- Real-time validation feedback

### 3. PrintStyleGenerator Utility

Generates CSS for print media:

```typescript
interface PrintStyleGenerator {
  generatePageRules(config: PaperSizeConfiguration): string;
  generateMediaPrintStyles(config: PaperSizeConfiguration, badgeTemplate: BadgeTemplate): string;
  calculateBadgesPerPage(config: PaperSizeConfiguration, badgeSize: { width: number; height: number }): number;
}
```

### 4. Extended BadgeTemplate Interface

```typescript
interface BadgeTemplate {
  // ... existing fields
  printConfiguration?: PaperSizeConfiguration;
}
```

## Data Models

### Paper Size Definitions

```typescript
const PAPER_SIZES = {
  CR80: { width: 85.6, height: 53.98, label: 'CR80 (Credit Card)' },
  A4: { width: 210, height: 297, label: 'A4' },
  A6: { width: 105, height: 148, label: 'A6' },
  A7: { width: 74, height: 105, label: 'A7' },
  Letter: { width: 215.9, height: 279.4, label: 'Letter (US)' },
  Custom: { width: 100, height: 150, label: 'Custom Size' }
};
```

### Default Configuration

```typescript
const DEFAULT_PRINT_CONFIG: PaperSizeConfiguration = {
  sizeType: 'A4',
  orientation: 'portrait',
  margins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
};
```

### Validation Rules

- Custom width: 50mm ≤ width ≤ 500mm
- Custom height: 50mm ≤ height ≤ 500mm
- Margins: 0mm ≤ margin ≤ 50mm
- Badge must fit within printable area (paper size - margins)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Paper size persistence

*For any* paper size configuration, when saved to the badge template, retrieving the badge template should return the same paper size configuration
**Validates: Requirements 1.2, 4.1, 4.2**

### Property 2: Custom dimension validation

*For any* custom dimension input, the system should accept values between 50mm and 500mm inclusive, and reject values outside this range
**Validates: Requirements 1.5**

### Property 3: CSS @page rule generation

*For any* paper size configuration, the generated CSS @page rules should specify page dimensions that exactly match the configured paper size (accounting for orientation)
**Validates: Requirements 2.1, 3.2, 5.3**

### Property 4: Print preview reactivity

*For any* paper size change, the print preview should update to reflect the new dimensions within the same render cycle
**Validates: Requirements 2.3**

### Property 5: Margin calculation

*For any* paper size configuration, the calculated margins should ensure that badge content fits within the printable area (paper size minus margins)
**Validates: Requirements 2.4**

### Property 6: Unit conversion accuracy

*For any* dimension in millimeters, converting to CSS units (using 1mm = 3.7795275591 pixels at 96 DPI) and back should preserve the original value within 0.1mm tolerance
**Validates: Requirements 3.1**

### Property 7: Aspect ratio preservation

*For any* badge component, the aspect ratio before and after print rendering should be equal within 1% tolerance
**Validates: Requirements 3.3**

### Property 8: Configuration completeness

*For any* saved badge template with print configuration, the configuration should include sizeType, orientation, and margins (and customWidth/customHeight if sizeType is Custom)
**Validates: Requirements 4.3**

### Property 9: Orientation dimension swap

*For any* paper size, when orientation changes from portrait to landscape (or vice versa), the effective width and height should be swapped
**Validates: Requirements 5.4**

### Property 10: Badge layout calculation

*For any* combination of paper size and badge size, the calculated number of badges per page should be the maximum number that fits within the printable area without overlap
**Validates: Requirements 2.5, 6.3**

### Property 11: Print configuration usage

*For any* event with a saved print configuration, printing badges from participant management should apply the same configuration as saved in the badge template
**Validates: Requirements 4.4**

### Property 12: Element preservation in print

*For any* badge template with components (QR codes, logos, text fields, custom components), all enabled components should be present in the generated print output
**Validates: Requirements 3.5**

## Error Handling

### Validation Errors

1. **Invalid Custom Dimensions**
   - Error: "Width must be between 50mm and 500mm"
   - Error: "Height must be between 50mm and 500mm"
   - Display inline validation message
   - Prevent saving until corrected

2. **Badge Too Large for Paper**
   - Warning: "Badge size exceeds printable area"
   - Suggest reducing badge size or increasing paper size
   - Show visual indicator in preview

3. **Margin Too Large**
   - Warning: "Margins reduce printable area significantly"
   - Show remaining printable area dimensions
   - Allow user to proceed with warning

### Print Errors

1. **Browser Print API Unavailable**
   - Fallback: Show instructions for manual print setup
   - Log error for debugging

2. **CSS @page Not Supported**
   - Detect browser support
   - Show warning: "Your browser may not respect custom paper sizes"
   - Provide alternative: Download PDF with correct dimensions

### Data Persistence Errors

1. **Failed to Save Configuration**
   - Retry mechanism (up to 3 attempts)
   - Show error toast with retry button
   - Preserve user input in component state

2. **Failed to Load Configuration**
   - Fall back to default A4 portrait
   - Log warning
   - Allow user to reconfigure

## Testing Strategy

### Unit Testing

We will use Vitest for unit testing with the following focus areas:

1. **PaperSizeConfiguration Validation**
   - Test custom dimension validation (boundary values: 49mm, 50mm, 500mm, 501mm)
   - Test margin validation
   - Test configuration completeness

2. **PrintStyleGenerator**
   - Test CSS @page rule generation for each paper size
   - Test unit conversion (mm to px and back)
   - Test badge-per-page calculation with various combinations

3. **Orientation Logic**
   - Test dimension swapping when orientation changes
   - Test that portrait A4 (210x297) becomes landscape A4 (297x210)

4. **Default Configuration**
   - Test that missing configuration defaults to A4 portrait
   - Test that partial configuration is completed with defaults

### Property-Based Testing

We will use fast-check (JavaScript property-based testing library) for property-based tests. Each property-based test should run a minimum of 100 iterations.

1. **Property 1: Paper size persistence (Round-trip)**
   - Generate random valid PaperSizeConfiguration
   - Save to badge template
   - Load from badge template
   - Assert loaded config equals saved config

2. **Property 2: Custom dimension validation**
   - Generate random numbers (including edge cases)
   - Test validation accepts 50-500mm range
   - Test validation rejects outside range

3. **Property 3: CSS @page rule generation**
   - Generate random valid PaperSizeConfiguration
   - Generate CSS @page rules
   - Parse generated CSS
   - Assert dimensions match configuration

4. **Property 6: Unit conversion accuracy**
   - Generate random dimensions in mm (50-500 range)
   - Convert to pixels
   - Convert back to mm
   - Assert difference < 0.1mm

5. **Property 7: Aspect ratio preservation**
   - Generate random badge components with dimensions
   - Apply print rendering
   - Calculate aspect ratios before and after
   - Assert difference < 1%

6. **Property 9: Orientation dimension swap**
   - Generate random paper sizes
   - Apply orientation change
   - Assert width and height are swapped

7. **Property 10: Badge layout calculation**
   - Generate random paper sizes and badge sizes
   - Calculate badges per page
   - Verify no overlap and maximum utilization

### Integration Testing

1. **End-to-End Print Flow**
   - Create badge template with custom print configuration
   - Save template
   - Navigate to participant management
   - Initiate print
   - Verify print dialog shows correct paper size

2. **Configuration Persistence**
   - Configure print settings in badge designer
   - Save and close
   - Reopen badge designer
   - Verify configuration is restored

3. **Print Preview Accuracy**
   - Set various paper sizes
   - Capture print preview screenshots
   - Verify dimensions match configuration (visual regression testing)

### Browser Compatibility Testing

Test CSS @page support across:
- Chrome/Edge (Chromium)
- Firefox
- Safari

Document any browser-specific limitations or workarounds needed.

## Implementation Notes

### CSS @page Rules

The @page rule will be dynamically generated and injected:

```css
@page {
  size: 210mm 297mm; /* A4 portrait */
  margin: 10mm;
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }
  
  .badge-container {
    width: 85.6mm;
    height: 53.98mm;
    page-break-inside: avoid;
  }
}
```

### Unit Conversion

Standard conversion at 96 DPI:
- 1mm = 3.7795275591 pixels
- 1 inch = 25.4mm = 96 pixels

### Print Preview Implementation

Use a hidden iframe or separate print stylesheet to show accurate preview without affecting main UI.

### Responsive Considerations

Print settings panel should be:
- Collapsible on smaller screens
- Accessible via modal on mobile devices
- Keyboard navigable for accessibility

## Future Enhancements

1. **Print Templates**: Save multiple print configurations as templates
2. **Batch Printing**: Print multiple participants' badges with page breaks
3. **PDF Export**: Generate PDF with exact dimensions for professional printing
4. **Print Preview Modal**: Full-screen preview before printing
5. **Printer Profiles**: Save printer-specific settings (margins, color profiles)
6. **Multi-badge Layouts**: Arrange multiple different badge designs on one page
