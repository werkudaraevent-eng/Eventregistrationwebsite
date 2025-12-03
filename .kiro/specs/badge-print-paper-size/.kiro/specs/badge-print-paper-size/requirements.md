# Requirements Document

## Introduction

Fitur ini bertujuan untuk memperbaiki sistem auto print badge ID agar pengguna dapat memilih ukuran kertas yang sesuai, dan ukuran kertas yang dipilih benar-benar diterapkan saat print preview. Saat ini, meskipun pengguna memilih ukuran kertas tertentu, hasil akhir pada print preview tidak menerapkan ukuran kertas yang dipilih tersebut.

## Glossary

- **Badge Designer**: Antarmuka visual untuk mendesain dan mengkustomisasi badge peserta event
- **Print Preview**: Tampilan pratinjau sebelum mencetak yang ditampilkan oleh browser
- **Paper Size**: Ukuran kertas standar untuk pencetakan (misalnya: A4, Letter, CR80, A6, A7)
- **Badge Template**: Template desain badge yang disimpan untuk sebuah event
- **Print Dialog**: Dialog sistem operasi yang muncul saat melakukan pencetakan
- **CSS @media print**: Aturan CSS khusus yang diterapkan saat mencetak dokumen
- **Page Setup**: Pengaturan halaman cetak termasuk ukuran kertas, orientasi, dan margin

## Requirements

### Requirement 1

**User Story:** Sebagai event organizer, saya ingin memilih ukuran kertas untuk mencetak badge, sehingga badge dapat dicetak sesuai dengan ukuran kertas yang tersedia.

#### Acceptance Criteria

1. WHEN a user accesses the badge print function THEN the system SHALL display a paper size selection interface with standard paper size options
2. WHEN a user selects a paper size option THEN the system SHALL store the selected paper size in the badge template configuration
3. THE system SHALL provide paper size options including CR80, A4, A6, A7, Letter, and Custom
4. WHEN a user selects Custom paper size THEN the system SHALL allow the user to input custom width and height dimensions in millimeters
5. THE system SHALL validate that custom dimensions are within reasonable printing limits (minimum 50mm, maximum 500mm for both width and height)

### Requirement 2

**User Story:** Sebagai event organizer, saya ingin print preview menampilkan ukuran kertas yang saya pilih, sehingga saya dapat memverifikasi hasil cetak sebelum mencetak secara fisik.

#### Acceptance Criteria

1. WHEN a user initiates print preview THEN the system SHALL apply CSS @media print rules that match the selected paper size
2. WHEN the print dialog opens THEN the system SHALL display the badge layout formatted according to the selected paper size dimensions
3. WHEN a user changes paper size selection THEN the system SHALL update the print preview to reflect the new paper size immediately
4. THE system SHALL set appropriate page margins based on the selected paper size to ensure badge content fits within printable area
5. WHEN printing multiple badges THEN the system SHALL arrange badges on the page according to the selected paper size to maximize paper usage

### Requirement 3

**User Story:** Sebagai event organizer, saya ingin badge dicetak dengan ukuran yang akurat, sehingga badge fisik sesuai dengan desain yang saya buat.

#### Acceptance Criteria

1. WHEN the system renders badge for printing THEN the system SHALL convert badge dimensions from millimeters to CSS units accurately using standard conversion ratios
2. WHEN applying print styles THEN the system SHALL use CSS @page rules to specify exact page dimensions matching the selected paper size
3. THE system SHALL maintain aspect ratio of badge components during print rendering
4. WHEN printing on different paper sizes THEN the system SHALL scale badge content proportionally to fit the target paper size while maintaining readability
5. THE system SHALL preserve all badge design elements including QR codes, logos, text fields, and custom components in the printed output

### Requirement 4

**User Story:** Sebagai event organizer, saya ingin menyimpan preferensi ukuran kertas untuk setiap event, sehingga saya tidak perlu memilih ulang setiap kali mencetak badge.

#### Acceptance Criteria

1. WHEN a user saves badge template THEN the system SHALL persist the selected paper size configuration in the event's badge_template field
2. WHEN a user reopens badge designer THEN the system SHALL load and apply the previously saved paper size configuration
3. THE system SHALL store paper size configuration including size type, custom dimensions if applicable, and orientation
4. WHEN a user prints badges from participant management THEN the system SHALL use the saved paper size configuration from the badge template
5. THE system SHALL provide a default paper size of A4 portrait orientation when no paper size has been previously configured

### Requirement 5

**User Story:** Sebagai event organizer, saya ingin memilih orientasi kertas (portrait atau landscape), sehingga badge dapat dicetak dalam orientasi yang paling sesuai dengan desain.

#### Acceptance Criteria

1. WHEN a user accesses paper size settings THEN the system SHALL display orientation options for Portrait and Landscape
2. WHEN a user selects an orientation THEN the system SHALL update the print preview to reflect the selected orientation
3. THE system SHALL apply the selected orientation using CSS @page orientation rules
4. WHEN orientation is changed THEN the system SHALL swap width and height dimensions accordingly for the print layout
5. THE system SHALL persist the selected orientation along with paper size in the badge template configuration

### Requirement 6

**User Story:** Sebagai event organizer, saya ingin melihat preview ukuran kertas sebelum mencetak, sehingga saya dapat memastikan badge akan tercetak dengan benar.

#### Acceptance Criteria

1. WHEN a user selects a paper size THEN the system SHALL display a visual preview showing how badges will be arranged on the selected paper
2. THE preview SHALL show paper dimensions in millimeters and indicate the printable area
3. WHEN multiple badges are to be printed THEN the preview SHALL show how many badges fit per page
4. THE system SHALL highlight any potential issues such as content overflow or margins that are too small
5. WHEN a user hovers over the preview THEN the system SHALL display additional information about the selected paper size and print settings
