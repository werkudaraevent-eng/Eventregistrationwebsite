# Design System Documentation

## Overview

This document describes the color system and design tokens used in the Event Registration Website. All colors should use CSS variables defined in `src/styles/globals.css` for consistency and easy theming.

## Color Palette

### Primary Colors (Professional Blue)

Use for main actions, links, and brand elements.

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | #2563eb | Main brand color, buttons, links |
| `--primary-50` | #eff6ff | Very light backgrounds |
| `--primary-100` | #dbeafe | Light backgrounds, hover states |
| `--primary-200` | #bfdbfe | Borders, dividers |
| `--primary-300` | #93c5fd | Disabled states |
| `--primary-400` | #60a5fa | Secondary elements |
| `--primary-500` | #3b82f6 | Standard primary |
| `--primary-600` | #2563eb | Main primary (default) |
| `--primary-700` | #1d4ed8 | Hover states |
| `--primary-800` | #1e40af | Active states |
| `--primary-900` | #1e3a8a | Dark text on light bg |

### Semantic Status Colors

Use these for feedback and status indicators.

#### Success (Green)
| Token | Value | Usage |
|-------|-------|-------|
| `--success` | #10b981 | Success icons, checkmarks |
| `--success-light` | #d1fae5 | Success backgrounds |
| `--success-dark` | #065f46 | Success text |

#### Warning (Amber)
| Token | Value | Usage |
|-------|-------|-------|
| `--warning` | #f59e0b | Warning icons |
| `--warning-light` | #fef3c7 | Warning backgrounds |
| `--warning-dark` | #92400e | Warning text |

#### Error (Red)
| Token | Value | Usage |
|-------|-------|-------|
| `--error` | #ef4444 | Error icons, destructive |
| `--error-light` | #fee2e2 | Error backgrounds |
| `--error-dark` | #991b1b | Error text |

#### Info (Blue)
| Token | Value | Usage |
|-------|-------|-------|
| `--info` | #3b82f6 | Info icons |
| `--info-light` | #dbeafe | Info backgrounds |
| `--info-dark` | #1e40af | Info text |

### Neutral Colors

Use for text, backgrounds, and borders.

| Token | Value | Usage |
|-------|-------|-------|
| `--neutral-50` | #f8fafc | Page backgrounds |
| `--neutral-100` | #f1f5f9 | Card backgrounds |
| `--neutral-200` | #e2e8f0 | Borders, dividers |
| `--neutral-300` | #cbd5e1 | Disabled borders |
| `--neutral-400` | #94a3b8 | Placeholder text |
| `--neutral-500` | #64748b | Secondary text |
| `--neutral-600` | #475569 | Body text |
| `--neutral-700` | #334155 | Headings |
| `--neutral-800` | #1e293b | Primary text |
| `--neutral-900` | #0f172a | Darkest text |

## CSS Utility Classes

### Text Colors
```css
.text-success      /* Green text for success */
.text-warning      /* Amber text for warnings */
.text-error        /* Red text for errors */
.text-info         /* Blue text for info */
.text-primary-600  /* Primary blue text */
.text-neutral-600  /* Standard body text */
```

### Background Colors
```css
.bg-success-light  /* Light green background */
.bg-warning-light  /* Light amber background */
.bg-error-light    /* Light red background */
.bg-info-light     /* Light blue background */
.bg-primary-50     /* Very light primary background */
.bg-neutral-100    /* Light gray background */
```

### Border Colors
```css
.border-success    /* Green border */
.border-warning    /* Amber border */
.border-error      /* Red border */
.border-info       /* Blue border */
.border-primary-200 /* Light primary border */
.border-neutral-200 /* Standard border */
```

### Alert Boxes
```css
.alert-success  /* Green alert box */
.alert-warning  /* Amber alert box */
.alert-error    /* Red alert box */
.alert-info     /* Blue alert box */
```

### Status Dots
```css
.status-dot              /* Base dot style */
.status-dot-success      /* Green dot */
.status-dot-warning      /* Amber dot */
.status-dot-error        /* Red dot */
.status-dot-info         /* Blue dot */
.status-dot-pulse        /* Add pulse animation */
```

### Shadows
```css
.shadow-primary     /* Medium primary shadow */
.shadow-primary-sm  /* Small primary shadow */
.shadow-primary-lg  /* Large primary shadow */
```

### Gradients
```css
.gradient-primary      /* Primary gradient (blue) */
.gradient-primary-soft /* Soft primary gradient */
```

## Usage Examples

### ✅ Correct Usage

```tsx
// Success message
<div className="bg-success-light border-success text-success-dark p-4 rounded">
  Operation completed successfully!
</div>

// Primary button
<Button className="gradient-primary shadow-primary">
  Submit
</Button>

// Status indicator
<span className="status-dot status-dot-success status-dot-pulse"></span>

// Info box
<div className="alert-info p-4 rounded-lg">
  <Info className="text-info" />
  <span>Important information here</span>
</div>
```

### ❌ Avoid This

```tsx
// Don't use hardcoded Tailwind colors
<div className="bg-green-100 border-green-500 text-green-800">...</div>
<div className="bg-blue-50 text-blue-600">...</div>
<span className="text-gray-600">...</span>

// Use semantic classes instead
<div className="bg-success-light border-success text-success-dark">...</div>
<div className="bg-info-light text-info">...</div>
<span className="text-neutral-600">...</span>
```

## When to Use Each Color

| Scenario | Color to Use |
|----------|--------------|
| Check-in successful | `success` |
| Form validation passed | `success` |
| Warning about small margins | `warning` |
| Pending action | `warning` |
| Form validation error | `error` |
| Delete confirmation | `error` |
| Informational message | `info` |
| Highlighted selection | `primary` |
| Primary actions (buttons) | `primary` |
| Secondary text | `neutral-500` |
| Body text | `neutral-600` |
| Headings | `neutral-800` |
| Borders | `neutral-200` |

## Changing the Theme

To change the primary color scheme, update these variables in `src/styles/globals.css`:

```css
:root {
  --primary: #YOUR_COLOR;
  --primary-gradient-from: #YOUR_COLOR;
  --primary-gradient-to: #YOUR_SECONDARY_COLOR;
  --primary-50 through --primary-900: /* Generate shades */
}
```

Use a tool like [Tailwind CSS Color Generator](https://uicolors.app/create) to generate consistent color shades.
