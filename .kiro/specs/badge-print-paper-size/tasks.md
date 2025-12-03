# Implementation Plan

- [x] 1. Extend data models and type definitions


  - Add PaperSizeConfiguration interface to localDBStub.ts
  - Extend BadgeSettings interface to include printConfiguration field
  - Add PAPER_SIZES constant with all standard paper size definitions
  - Add DEFAULT_PRINT_CONFIG constant
  - _Requirements: 1.3, 4.3, 4.5_



- [x] 2. Create print utility functions

  - [x] 2.1 Implement unit conversion utilities


    - Create mmToPixels() function (1mm = 3.7795275591px at 96 DPI)



    - Create pixelsToMm() function for reverse conversion

    - _Requirements: 3.1_



  - [ ] 2.2 Write property test for unit conversion
    - **Property 6: Unit conversion accuracy**

    - **Validates: Requirements 3.1**


  - [ ] 2.3 Implement PrintStyleGenerator utility class
    - Create generatePageRules() method to generate CSS @page rules

    - Create generateMediaPrintStyles() method for @media print CSS

    - Create calculateBadgesPerPage() method for layout calculation
    - _Requirements: 2.1, 2.5, 3.2_


  - [ ] 2.4 Write property test for CSS @page rule generation
    - **Property 3: CSS @page rule generation**
    - **Validates: Requirements 2.1, 3.2, 5.3**


  - [x] 2.5 Write property test for badge layout calculation


    - **Property 10: Badge layout calculation**
    - **Validates: Requirements 2.5, 6.3**


- [ ] 3. Implement paper size validation logic
  - [x] 3.1 Create validation functions

    - Implement validateCustomDimensions() to check 50mm-500mm range
    - Implement validateMargins() to check margin constraints


    - Implement validateBadgeFitsOnPaper() to check badge fits in printable area

    - _Requirements: 1.5, 2.4_

  - [ ] 3.2 Write property test for custom dimension validation
    - **Property 2: Custom dimension validation**





    - **Validates: Requirements 1.5**

  - [ ] 3.3 Write property test for margin calculation
    - **Property 5: Margin calculation**
    - **Validates: Requirements 2.4**




- [ ] 4. Create PaperSizeSelector component
  - [ ] 4.1 Build PaperSizeSelector UI component
    - Create radio group for standard paper sizes (CR80, A4, A6, A7, Letter, Custom)

    - Add custom dimension input fields (width and height in mm)
    - Implement real-time validation with error messages

    - Add visual feedback for validation state

    - _Requirements: 1.1, 1.3, 1.4, 1.5_


  - [ ] 4.2 Write unit tests for PaperSizeSelector
    - Test that all standard paper sizes are displayed
    - Test custom dimension inputs appear when Custom is selected



    - Test validation error messages display correctly
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 5. Create OrientationSelector component
  - [x] 5.1 Build OrientationSelector UI component

    - Create toggle/radio group for Portrait and Landscape options

    - Implement orientation change handler


    - Add visual icons for orientation options

    - _Requirements: 5.1_

  - [ ] 5.2 Implement orientation dimension swap logic
    - Create swapDimensions() utility function
    - Update print configuration when orientation changes


    - _Requirements: 5.4_

  - [ ] 5.3 Write property test for orientation dimension swap
    - **Property 9: Orientation dimension swap**

    - **Validates: Requirements 5.4**


- [ ] 6. Create PrintPreviewPanel component
  - [ ] 6.1 Build PrintPreviewPanel UI component
    - Display visual preview of paper with badge layout
    - Show paper dimensions in millimeters

    - Indicate printable area with visual boundaries
    - Show badge count per page



    - Highlight issues (overflow, small margins) with warning indicators
    - Add hover tooltip with detailed print settings


    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.2 Write unit tests for PrintPreviewPanel
    - Test preview displays paper dimensions correctly

    - Test badge count calculation is displayed
    - Test warning indicators appear for issues
    - Test hover tooltip shows print settings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_



- [x] 7. Create BadgePrintSettings component


  - [x] 7.1 Build BadgePrintSettings container component


    - Integrate PaperSizeSelector component


    - Integrate OrientationSelector component
    - Integrate PrintPreviewPanel component
    - Implement configuration state management

    - Add save/cancel buttons
    - _Requirements: 1.1, 5.1, 6.1_

  - [x] 7.2 Implement configuration change handlers


    - Handle paper size changes and update state
    - Handle orientation changes and update state
    - Handle custom dimension changes with validation


    - Trigger preview updates on any configuration change


    - _Requirements: 2.3, 5.2_

  - [x] 7.3 Write property test for print preview reactivity

    - **Property 4: Print preview reactivity**

    - **Validates: Requirements 2.3**

- [ ] 8. Integrate BadgePrintSettings into BadgeDesigner
  - [ ] 8.1 Add print settings panel to BadgeDesigner layout
    - Add new accordion section for "Print Settings" in left sidebar




    - Position BadgePrintSettings component in the accordion
    - Ensure responsive layout on smaller screens




    - _Requirements: 1.1_


  - [x] 8.2 Connect print configuration to badge template state




    - Initialize print configuration from badge template or defaults
    - Update badge template state when print configuration changes
    - _Requirements: 4.1, 4.5_


  - [x] 8.3 Write property test for configuration completeness

    - **Property 8: Configuration completeness**
    - **Validates: Requirements 4.3**



- [ ] 9. Implement print configuration persistence
  - [x] 9.1 Update badge template save logic


    - Include printConfiguration in badge template when saving to Supabase
    - Handle missing printConfiguration with default values
    - _Requirements: 4.1, 4.3_




  - [x] 9.2 Update badge template load logic


    - Load printConfiguration from Supabase badge_template field
    - Apply default configuration if none exists
    - _Requirements: 4.2, 4.5_




  - [ ] 9.3 Write property test for paper size persistence
    - **Property 1: Paper size persistence**

    - **Validates: Requirements 1.2, 4.1, 4.2**





- [x] 10. Implement dynamic print styles


  - [ ] 10.1 Create print stylesheet injection system
    - Generate CSS @page rules based on print configuration
    - Generate @media print styles for badge layout
    - Inject styles into document head when printing




    - Remove injected styles after printing
    - _Requirements: 2.1, 2.2, 3.2, 5.3_




  - [x] 10.2 Implement print trigger function

    - Create printBadges() function that applies print configuration


    - Handle browser print dialog invocation
    - Apply orientation CSS rules
    - _Requirements: 2.2, 5.3_









  - [ ] 10.3 Write property test for aspect ratio preservation
    - **Property 7: Aspect ratio preservation**
    - **Validates: Requirements 3.3**

  - [ ] 10.4 Write property test for element preservation
    - **Property 12: Element preservation in print**
    - **Validates: Requirements 3.5**

- [ ] 11. Add print functionality to ParticipantManagement
  - [ ] 11.1 Create print badges button in ParticipantManagement
    - Add "Print Badges" button to participant management toolbar
    - Implement badge selection (single or multiple participants)
    - _Requirements: 4.4_

  - [ ] 11.2 Implement print badges handler
    - Load badge template with print configuration from Supabase
    - Generate badge HTML for selected participants
    - Apply print configuration and trigger print
    - _Requirements: 4.4_

  - [ ] 11.3 Write property test for print configuration usage
    - **Property 11: Print configuration usage**
    - **Validates: Requirements 4.4**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Add error handling and user feedback
  - [ ] 13.1 Implement validation error display
    - Show inline error messages for invalid custom dimensions
    - Display warning for badge too large for paper
    - Show warning for excessive margins
    - _Requirements: 1.5_

  - [ ] 13.2 Implement print error handling
    - Add try-catch around print operations
    - Show user-friendly error messages for print failures
    - Provide fallback instructions if CSS @page not supported
    - Log errors for debugging

  - [ ] 13.3 Implement persistence error handling
    - Add retry mechanism for failed saves (up to 3 attempts)
    - Show error toast with retry button
    - Preserve user input on save failure
    - Show warning toast on load failure with default fallback

- [ ] 14. Browser compatibility and polyfills
  - [ ] 14.1 Add CSS @page support detection
    - Detect browser support for CSS @page rules
    - Show warning message if not supported
    - Provide alternative instructions for unsupported browsers

  - [ ] 14.2 Test across major browsers
    - Test print functionality in Chrome/Edge
    - Test print functionality in Firefox
    - Test print functionality in Safari
    - Document any browser-specific issues or limitations

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
