# ✅ Dynamic Add/Edit Participant Forms

## 🎯 Fitur Baru: Auto-Sync dengan Custom Columns

**Form Add/Edit Participant sekarang otomatis menampilkan custom columns yang Anda buat!**

---

## 🔄 Cara Kerja

### Sebelum (Static):
```
Add Participant Form:
- Full Name *
- Email *
- Phone
- Company
- Position
```
❌ Jika ada custom column "DOB" atau "Hobby", tidak muncul di form!

### Sesudah (Dynamic):
```
Add Participant Form:
- Full Name *
- Email *
- Phone
- Company  
- Position

─── Additional Fields ───
- DOB *        (custom field)
- Hobby        (custom field)
- Dietary Req  (custom field)
```
✅ Semua custom columns otomatis muncul di form!

---

## 📝 Cara Menggunakan

### 1. Buat Custom Column
1. Go to **Column Management** (ikon kolom di toolbar)
2. Klik **"Add Custom Field"**
3. Isi form:
   - **Field Name**: `dob` (internal name, lowercase)
   - **Display Label**: `DOB` (yang tampil di form)
   - **Field Type**: `text`, `email`, `number`, `textarea`, atau `select`
   - **Required**: Centang jika wajib diisi
   - **Options**: (untuk type `select`)
4. **Save**

### 2. Add/Edit Participant
1. Klik **"Add Participant"** atau **Edit** participant yang ada
2. Form akan **otomatis menampilkan**:
   - ✅ **Standard fields**: Name, Email, Phone, Company, Position
   - ✅ **Custom fields**: Semua yang Anda buat di Column Management
3. Custom fields muncul di section **"Additional Fields"**
4. Jika field **required**, akan ada tanda ***** merah

### 3. Submit
- Data standard → Tersimpan di columns biasa
- Data custom → Tersimpan di `customData` JSON

---

## 🎨 Tampilan Form

### Add Participant Dialog:
```
┌─ Add Participant Manually ─────────────────┐
│                                              │
│ Full Name *                                  │
│ [John Doe________________]                   │
│                                              │
│ Email *                                      │
│ [john@example.com________]                   │
│                                              │
│ Phone                                        │
│ [+1234567890_____________]                   │
│                                              │
│ Company                                      │
│ [Acme Inc._______________]                   │
│                                              │
│ Position                                     │
│ [Software Engineer_______]                   │
│                                              │
│ ─── Additional Fields ───                    │
│                                              │
│ DOB *                                        │
│ [1990-01-01______________]                   │
│                                              │
│ Hobby                                        │
│ [Reading_________________]                   │
│                                              │
│ Dietary Requirements                         │
│ [Vegetarian______________]                   │
│                                              │
│        [Add Participant]                     │
└──────────────────────────────────────────────┘
```

---

## 🔧 Supported Field Types

### 1. **Text** (`type: 'text'`)
```tsx
<Input type="text" placeholder="Enter name" />
```
- Untuk data text biasa (nama, alamat, dll)

### 2. **Email** (`type: 'email'`)
```tsx
<Input type="email" placeholder="Enter email" />
```
- Auto-validasi email format

### 3. **Phone** (`type: 'tel'`)
```tsx
<Input type="tel" placeholder="+1234567890" />
```
- Untuk nomor telepon

### 4. **Number** (`type: 'number'`)
```tsx
<Input type="number" placeholder="Enter age" />
```
- Hanya accept angka

### 5. **Textarea** (`type: 'textarea'`)
```tsx
<textarea rows={4}>Multi-line text</textarea>
```
- Untuk text panjang (notes, alamat lengkap, dll)

### 6. **Select/Dropdown** (`type: 'select'`)
```tsx
<select>
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```
- Pilihan dropdown (misal: T-Shirt Size, Dietary, dll)
- Perlu isi `options` array

---

## 📊 Data Storage

### Standard Fields → Table Columns:
```sql
participants (
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  ...
)
```

### Custom Fields → JSON Column:
```sql
participants (
  customData JSONB
)
```

Example stored data:
```json
{
  "customData": {
    "dob": "1990-01-01",
    "hobby": "Reading",
    "dietary": "Vegetarian",
    "tshirt_size": "L"
  }
}
```

---

## 🔍 Validation

### Required Fields:
- Standard fields: `name` dan `email` **always required**
- Custom fields: Bisa set required via checkbox di Column Management
- Form tidak bisa submit jika required fields kosong

### Field Types:
- Email: Auto-validate email format
- Number: Hanya accept numeric input
- Select: Must choose dari options yang ada

---

## 🎯 Use Cases

### 1. Event Registration dengan Custom Data
```
Custom Fields:
- T-Shirt Size (select: S, M, L, XL)
- Dietary Requirements (select: None, Vegetarian, Vegan)
- Allergies (textarea)
- Emergency Contact (tel)
```

### 2. Corporate Event
```
Custom Fields:
- Department (select: IT, HR, Finance, Sales)
- Employee ID (text)
- Arrival Time (text)
- Special Needs (textarea)
```

### 3. Conference
```
Custom Fields:
- Session Preference (select)
- Speaking Request (textarea)
- Accommodation Needed (select: Yes, No)
- Group Registration (text)
```

---

## ✅ Benefits

1. **No Code Changes**: Tambah custom field tanpa edit code
2. **Auto-Sync**: Form langsung update saat tambah/edit column
3. **Flexible**: Support berbagai field types
4. **Validation**: Built-in required field validation
5. **Consistent**: Same fields di Add & Edit form

---

## 🚀 Quick Test

1. **Add custom column "DOB"**:
   - Column Management → Add Field
   - Field Name: `dob`
   - Label: `DOB`
   - Type: `text`
   - Required: ✅

2. **Open Add Participant**:
   - Klik "Add Participant"
   - **DOB field** otomatis muncul di "Additional Fields"
   - Required (ada tanda *)

3. **Fill & Submit**:
   - Isi semua required fields
   - Submit → Data tersimpan di `customData.dob`

4. **Edit Participant**:
   - Klik Edit pada participant
   - **DOB field** muncul dengan value yang tersimpan
   - Update → Changes saved

---

## 🎉 Ready!

Form Add/Edit Participant sekarang **auto-sync** dengan custom columns yang Anda buat. Tidak perlu edit code lagi! 🚀
