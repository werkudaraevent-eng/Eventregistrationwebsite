# ID Generation System - Terstruktur

## Format ID yang Baru

Sistem ID sekarang menggunakan format yang lebih terstruktur dan mudah dipahami:

```
[PREFIX]-[TIMESTAMP]-[RANDOM8]
```

### Breakdown:

1. **PREFIX** (3 characters)
   - `evt` = Event
   - `prt` = Participant  
   - `agd` = Agenda Item
   - `fld` = Custom Field

2. **TIMESTAMP** (10 digits)
   - Unix timestamp dalam detik (bukan millisecond)
   - Memudahkan sorting berdasarkan waktu pembuatan
   - Contoh: `1730900000` = Nov 6, 2025, 2:13:20 PM UTC

3. **RANDOM8** (8 characters alphanumeric)
   - Random string untuk memastikan uniqueness
   - Hanya menggunakan: a-z, 0-9 (lowercase)
   - Contoh: `abc123d4`

## Contoh ID

```
Event ID:          evt-1730900000-abc123d4
Participant ID:    prt-1730900000-xyz789w2
Agenda ID:         agd-1730900000-efg456h8
Custom Field ID:   fld-1730900000-qwe123r5
```

## Keuntungan Format Baru

✅ **Readable** - Mudah dibaca siapa yang membuat ID apa
✅ **Sortable** - Bisa langsung sort berdasarkan timestamp
✅ **Debuggable** - Prefix jelas membedakan tipe entity
✅ **Scalable** - 8 karakter random = 36^8 kombinasi (2.8 trillion)
✅ **Timestamp** - Tahu kapan entity dibuat tanpa query ke DB
✅ **Short** - Lebih pendek dari UUID standard

## Struktur di Database

ID tetap disimpan sebagai `TEXT PRIMARY KEY` di Supabase:

```sql
-- Events Table
CREATE TABLE events (
    id TEXT PRIMARY KEY,  -- Format: evt-1730900000-abc123d4
    name TEXT NOT NULL,
    ...
);

-- Participants Table
CREATE TABLE participants (
    id TEXT PRIMARY KEY,  -- Format: prt-1730900000-xyz789w2
    event_id TEXT NOT NULL REFERENCES events(id),
    ...
);
```

## Utility Functions

### Generate IDs

```typescript
import { 
  generateEventId,
  generateParticipantId,
  generateAgendaId,
  generateCustomFieldId
} from './utils/supabaseDataLayer';

// Generate
const eventId = generateEventId();           // evt-1730900000-abc123d4
const participantId = generateParticipantId(); // prt-1730900000-xyz789w2
const agendaId = generateAgendaId();         // agd-1730900000-efg456h8
const fieldId = generateCustomFieldId();     // fld-1730900000-qwe123r5
```

### Parse ID

```typescript
import { parseId } from './utils/supabaseDataLayer';

const id = 'evt-1730900000-abc123d4';
const parsed = parseId(id);

// Result:
// {
//   prefix: 'evt',
//   timestamp: '1730900000',
//   random: 'abc123d4'
// }
```

### Get Date dari ID

```typescript
import { getIdDate } from './utils/supabaseDataLayer';

const id = 'evt-1730900000-abc123d4';
const date = getIdDate(id);

// Result: Date object → 2025-11-06T14:13:20.000Z
console.log(date?.toLocaleString()); // 11/6/2025, 2:13:20 PM (UTC)
```

## Migration dari Format Lama

Jika sudah ada data dengan format lama (E123456789ABC):

```typescript
// Untuk backward compatibility, fungsi bisa dimodifikasi:
export function generateEventId(): string {
  // Tetap support format lama jika diperlukan
  // return 'E' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // Gunakan format baru
  return `evt-${getTimestamp()}-${generateRandomSuffix(8)}`;
}
```

## Performance Notes

- **Timestamp sorting** - 10 digit timestamp lebih efisien untuk indexing
- **Index strategy** - Bisa buat index pada `created_at` text untuk sort by creation
- **Query performance** - ID string lookup sama cepatnya dengan UUID

```sql
-- Index untuk sorting by creation time
CREATE INDEX idx_events_created_by_id ON events(id DESC);
```

## Summary

| Aspek | Format Lama | Format Baru |
|-------|------------|------------|
| Format | E123456789ABC | evt-1730900000-abc123d4 |
| Length | 13 chars | 21 chars |
| Readability | Rendah | Tinggi |
| Sortable | Tidak | Ya ✓ |
| Prefix | Tidak jelas | Jelas (3 char) |
| Timestamp | Embedded | Explicit |
| Date extraction | Sulit | Mudah dengan parseId() |
