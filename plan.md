# 📋 AHE TEPUS WETAN — Project Plan

> Aplikasi manajemen pusat les berbasis web: pendaftaran, murid, guru, absensi, poin, evaluasi, wisuda, pembayaran, dan tabungan.

---

## 1. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | Deploy di Vercel |
| **UI** | Tailwind CSS + shadcn/ui | Komponen konsisten |
| **Database** | Supabase (PostgreSQL) | |
| **Auth** | Supabase Auth | JWT + RLS, role: admin/guru/murid |
| **Backend** | Supabase Edge Functions | Deno runtime, tidak kena limit Vercel |
| **Storage** | Google Drive API (OAuth2 Refresh Token) | Foto, scan dokumen, piagam — hemat kuota Supabase |
| **Notifikasi WA** | Fonnte API | Kirim WA ke orang tua |
| **PDF/Cetak** | React-PDF + jsPDF | Formulir, piagam, kwitansi |
| **State Management** | TanStack Query + Zustand | Server state + client state |

---

## 2. Architecture Overview

```
[Browser]
    │
    ▼
[Next.js App — Vercel]
    ├── /daftar              ← Public (form pendaftaran)
    ├── /admin/*             ← Portal Admin
    ├── /guru/*              ← Portal Guru
    └── /murid/*             ← Portal Murid
           │
           ▼
   [Supabase Platform]
    ├── Auth          → JWT, session, RLS policies
    ├── PostgreSQL    → Semua data aplikasi (simpan Drive File ID)
    └── Edge Functions→ Business logic, PDF, WA, payment, Drive proxy
           │
           ▼
   [External Services]
    ├── Google Drive API → File storage (foto, dokumen, piagam)
    │     └── OAuth2 Refresh Token (disimpan di Edge Function secret)
    ├── Fonnte API       → WhatsApp Notification
    └── Vercel CDN       → Static assets & ISR
```

---

## 3. Database Schema

### 3.1 Auth & Profiles

```sql
-- Extends auth.users dari Supabase
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'murid')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.2 Registrations (Pendaftaran — Publik)

```sql
CREATE TABLE registrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  nickname         TEXT,
  gender           TEXT CHECK (gender IN ('L', 'P')),
  birth_place      TEXT,
  birth_date       DATE,
  address          TEXT,
  rt               TEXT,
  rw               TEXT,
  village          TEXT,       -- desa
  district         TEXT,       -- kecamatan
  regency          TEXT,       -- kabupaten
  father_name      TEXT,
  mother_name      TEXT,
  guardian_name    TEXT,       -- wali murid
  whatsapp         TEXT,
  school_origin    TEXT,       -- asal sekolah
  school_class     TEXT,       -- kelas sekolah
  les_types        TEXT[],     -- ['les_ahe','les_ase','les_mapel']
  les_mapel_detail TEXT,       -- detail mapel jika pilih les_mapel
  photo_url        TEXT,       -- Google Drive File ID foto pendaftaran
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','rejected')),
  submitted_at     TIMESTAMPTZ DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES profiles(id)
);
```

---

### 3.3 Students (Murid)

```sql
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis             TEXT UNIQUE NOT NULL,   -- auto-generate: AHE-2024-001
  nik             TEXT,
  full_name       TEXT NOT NULL,
  nickname        TEXT,
  gender          TEXT CHECK (gender IN ('L', 'P')),
  birth_place     TEXT,
  birth_date      DATE,
  address         TEXT,
  rt              TEXT,
  rw              TEXT,
  village         TEXT,
  district        TEXT,
  regency         TEXT,
  kk_number       TEXT,        -- nomor KK
  father_name     TEXT,
  mother_name     TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  school_origin   TEXT,
  school_class    TEXT,
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  photo_url       TEXT,        -- Google Drive File ID foto profil
  birth_cert_url  TEXT,        -- Google Drive File ID scan akta kelahiran
  kk_url          TEXT,        -- Google Drive File ID scan KK
  user_id         UUID REFERENCES auth.users(id), -- untuk login portal murid
  registration_id UUID REFERENCES registrations(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Enrollment murid di jenis les
CREATE TABLE student_les (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  les_type       TEXT NOT NULL CHECK (les_type IN ('les_ahe','les_ase','les_mapel')),
  les_mapel_name TEXT,          -- contoh: "Matematika", "IPA"
  current_level  INTEGER DEFAULT 1,
  max_level      INTEGER,       -- AHE:8, ASE:16, Mapel:flexible
  start_date     DATE DEFAULT CURRENT_DATE,
  graduated_at   DATE,
  status         TEXT DEFAULT 'active'
                 CHECK (status IN ('active','inactive','graduated')),
  UNIQUE(student_id, les_type, COALESCE(les_mapel_name,''))
);
```

---

### 3.4 Teachers (Guru)

```sql
CREATE TABLE teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nip         TEXT UNIQUE,
  full_name   TEXT NOT NULL,
  position    TEXT,             -- jabatan
  gender      TEXT CHECK (gender IN ('L', 'P')),
  birth_place TEXT,
  birth_date  DATE,
  nik         TEXT,
  address     TEXT,
  rt          TEXT,
  rw          TEXT,
  village     TEXT,
  district    TEXT,
  regency     TEXT,
  whatsapp    TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  photo_url   TEXT,        -- Google Drive File ID foto profil
  kk_url      TEXT,        -- Google Drive File ID scan KK
  ktp_url     TEXT,        -- Google Drive File ID scan KTP
  ijazah_url  TEXT,        -- Google Drive File ID scan ijazah
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.5 Classes (Kelas)

```sql
CREATE TABLE classes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,   -- "AHE Level 1", "ASE Level 3", "Mapel Mat"
  les_type       TEXT NOT NULL CHECK (les_type IN ('les_ahe','les_ase','les_mapel')),
  level          INTEGER,
  les_mapel_name TEXT,
  teacher_id     UUID REFERENCES teachers(id),
  schedule       TEXT,            -- "Senin & Rabu 15.00"
  room           TEXT,
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE class_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);
```

---

### 3.6 Attendance (Absensi)

```sql
CREATE TABLE student_attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id),
  class_id      UUID REFERENCES classes(id),
  les_type      TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL
                CHECK (status IN ('hadir','izin','alpha','sakit')),
  notes         TEXT,
  checked_by    UUID REFERENCES teachers(id),
  points_earned INTEGER DEFAULT 0,  -- 1 jika hadir
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, class_id, date)
);

CREATE TABLE teacher_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time   TIME,
  check_out_time  TIME,
  status          TEXT NOT NULL
                  CHECK (status IN ('hadir','izin','alpha','sakit')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, date)
);
```

---

### 3.7 Points System (Poin AHE)

```sql
-- Saldo poin per murid
CREATE TABLE student_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) UNIQUE,
  total_points    INTEGER DEFAULT 0,
  redeemed_points INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Riwayat semua transaksi poin
CREATE TABLE point_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id),
  type           TEXT NOT NULL CHECK (type IN ('earn','redeem')),
  points         INTEGER NOT NULL,
  description    TEXT,
  attendance_id  UUID REFERENCES student_attendance(id),
  redemption_id  UUID,          -- FK ke point_redemptions
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Daftar hadiah/merchandise
CREATE TABLE merchandise (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  points_required INTEGER NOT NULL,
  stock           INTEGER DEFAULT 0,
  image_url       TEXT,        -- Google Drive File ID foto merchandise
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Penukaran poin
CREATE TABLE point_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id),
  merchandise_id  UUID REFERENCES merchandise(id),
  points_used     INTEGER NOT NULL,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','claimed')),
  redeemed_at     TIMESTAMPTZ DEFAULT now(),
  processed_by    UUID REFERENCES profiles(id)
);
```

---

### 3.8 Achievements (Prestasi)

```sql
CREATE TABLE achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id),
  student_les_id UUID REFERENCES student_les(id),
  les_type       TEXT NOT NULL,
  level          INTEGER,
  module_page    TEXT,          -- modul halaman
  topic          TEXT,          -- pembahasan
  score          DECIMAL(5,2),  -- nilai
  notes          TEXT,          -- keterangan
  recorded_by    UUID REFERENCES teachers(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.9 Evaluations (Evaluasi & Kenaikan Level)

```sql
CREATE TABLE evaluations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_number    TEXT UNIQUE NOT NULL,   -- auto-generate: EVAL-2024-001
  student_id     UUID NOT NULL REFERENCES students(id),
  student_les_id UUID REFERENCES student_les(id),
  les_type       TEXT NOT NULL,
  current_level  INTEGER NOT NULL,
  target_level   INTEGER NOT NULL,
  start_date     DATE,
  end_date       DATE,
  duration_days  INTEGER,        -- masa tempuh
  status         TEXT DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','ongoing','passed','failed')),
  score          DECIMAL(5,2),
  notes          TEXT,
  photo_url      TEXT,           -- Google Drive File ID foto kenaikan level
  wa_notif_sent  BOOLEAN DEFAULT false,
  evaluated_by   UUID REFERENCES teachers(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.10 Graduations (Wisuda)

```sql
CREATE TABLE graduations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID NOT NULL REFERENCES students(id),
  student_les_id     UUID REFERENCES student_les(id),
  les_type           TEXT NOT NULL CHECK (les_type IN ('les_ahe','les_ase')),
  graduation_date    DATE NOT NULL,
  certificate_number TEXT UNIQUE,
  certificate_url    TEXT,       -- Google Drive File ID piagam PDF
  photo_url          TEXT,       -- Google Drive File ID foto wisuda
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.11 Payments (Pembayaran)

```sql
-- Jenis pembayaran: SPP, Buku, Seragam, dll
CREATE TABLE payment_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  amount       DECIMAL(12,2),
  is_recurring BOOLEAN DEFAULT false,  -- true untuk SPP bulanan
  les_type     TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Tagihan per murid
CREATE TABLE payment_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id),
  payment_type_id UUID REFERENCES payment_types(id),
  les_type        TEXT,
  bill_month      DATE,            -- untuk SPP bulanan
  amount          DECIMAL(12,2) NOT NULL,
  status          TEXT DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','paid','partial')),
  due_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Transaksi pembayaran
CREATE TABLE payment_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id        UUID REFERENCES payment_bills(id),
  student_id     UUID NOT NULL REFERENCES students(id),
  amount         DECIMAL(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('tunai','tabungan','transfer')),
  paid_at        TIMESTAMPTZ DEFAULT now(),
  received_by    UUID REFERENCES profiles(id),
  receipt_number TEXT UNIQUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.12 Savings (Tabungan)

```sql
-- Rekening tabungan per murid
CREATE TABLE savings_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) UNIQUE,
  balance    DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Riwayat transaksi tabungan
CREATE TABLE savings_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id             UUID NOT NULL REFERENCES students(id),
  savings_id             UUID NOT NULL REFERENCES savings_accounts(id),
  type                   TEXT NOT NULL
                         CHECK (type IN ('deposit','withdraw','deduction')),
  amount                 DECIMAL(12,2) NOT NULL,
  balance_after          DECIMAL(12,2),
  description            TEXT,    -- "Setoran", "Potong SPP Jan 2025"
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  processed_by           UUID REFERENCES profiles(id),
  created_at             TIMESTAMPTZ DEFAULT now()
);
```

---

### 3.13 Leave Requests (Izin Murid)

```sql
CREATE TABLE leave_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id),
  class_id     UUID REFERENCES classes(id),
  date         DATE NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  processed_by UUID REFERENCES profiles(id)
);
```

---

### 3.14 WhatsApp Notification Log

```sql
CREATE TABLE wa_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,  -- 'eval_reminder','level_up','payment','confirm_reg'
  recipient    TEXT NOT NULL,  -- nomor WA tujuan
  message      TEXT NOT NULL,
  status       TEXT DEFAULT 'pending'
               CHECK (status IN ('pending','sent','failed')),
  reference_id UUID,           -- ID evaluasi / payment / dll
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Supabase Edge Functions

| Function | Trigger | Deskripsi |
|---|---|---|
| `generate-nis` | POST | Auto-generate NIS saat pendaftaran di-approve |
| `generate-eval-number` | POST | Auto-generate nomor evaluasi |
| `approve-registration` | POST | Approve pendaftar → buat akun + student record |
| `level-up-student` | POST | Update level setelah evaluasi lulus |
| `earn-attendance-point` | DB Trigger / POST | +1 poin tiap kehadiran |
| `redeem-point` | POST | Proses penukaran poin + kurangi stok |
| `process-payment` | POST | Bayar tagihan (tunai/potong tabungan/transfer) |
| `generate-spp-bills` | Cron (tgl 1/bulan) | Generate tagihan SPP semua murid aktif |
| `send-whatsapp` | POST | Kirim notif WA via Fonnte API |
| `generate-certificate` | POST | Generate piagam wisuda (PDF) → upload ke Drive |
| `generate-receipt` | POST | Generate kwitansi pembayaran (PDF) → upload ke Drive |
| `generate-report` | POST | Export laporan (absensi / keuangan) |
| `drive-upload` | POST | Terima file base64 dari frontend → upload ke Google Drive → return File ID |
| `drive-get-url` | GET | Terima Drive File ID → return temporary download URL untuk frontend |

---

## 5. WhatsApp Notifications (Fonnte)

| Event | Penerima | Isi Pesan |
|---|---|---|
| Pendaftaran diterima | Orang tua | Konfirmasi + info hari pertama les |
| H-3 Evaluasi | Orang tua | Pengingat jadwal evaluasi |
| Naik level | Orang tua | Selamat + level baru + foto anak |
| Tagihan SPP | Orang tua | Nominal + batas bayar |
| Pembayaran diterima | Orang tua | Konfirmasi + nominal + bulan |

Template WA disimpan di tabel config, diisi variabel dinamis saat pengiriman.

---

## 6. File Storage (Google Drive — OAuth2 Refresh Token)

### Kenapa Google Drive?
- Supabase free tier storage hanya **1 GB** — cepat habis untuk foto & scan dokumen
- Google Drive personal/workspace memberikan **15 GB gratis** (bisa lebih dengan akun berbayar)
- File ID tersimpan di PostgreSQL, tidak ada biaya egress
- Refresh token disimpan sebagai **Supabase Edge Function Secret**, tidak pernah terekspos ke frontend

### Flow Upload File

```
[Frontend]
    │  multipart/form-data atau base64
    ▼
[Edge Function: drive-upload]
    │  1. Verifikasi JWT user (Supabase Auth)
    │  2. Exchange refresh_token → access_token (Google OAuth2)
    │  3. Upload file ke Google Drive folder yang sesuai
    │  4. Set permission: anyone with link can view (untuk preview)
    │  5. Return { fileId, webViewLink }
    ▼
[Supabase DB]
    └── Simpan fileId di kolom *_url (mis: students.photo_url = "1BxiM...")
```

### Flow Tampilkan / Download File

```
[Frontend]
    │  GET /drive-get-url?fileId=1BxiM...
    ▼
[Edge Function: drive-get-url]
    │  1. Verifikasi JWT + cek ownership di DB (RLS logic)
    │  2. Return direct download URL atau webViewLink dari Drive
    ▼
[Frontend]
    └── Render <img src={url}> atau buka tab baru untuk PDF
```

### Struktur Folder Google Drive

```
📁 AHE Tepus Wetan/
├── 📁 Murid/
│   └── 📁 [NIS] - [Nama]/
│       ├── foto-profil.jpg
│       ├── akta-kelahiran.pdf
│       └── kk.pdf
├── 📁 Guru/
│   └── 📁 [NIP] - [Nama]/
│       ├── foto-profil.jpg
│       ├── ktp.pdf
│       ├── kk.pdf
│       └── ijazah.pdf
├── 📁 Evaluasi/
│   └── foto-kenaikan-level/
├── 📁 Wisuda/
│   ├── foto-wisuda/
│   └── piagam-pdf/
├── 📁 Pembayaran/
│   └── kwitansi-pdf/
└── 📁 Merchandise/
    └── foto-hadiah/
```

Folder ID tiap direktori disimpan di tabel `drive_folders` agar edge function tahu upload ke folder mana.

```sql
CREATE TABLE drive_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,  -- 'murid', 'guru', 'evaluasi', dll
  folder_id  TEXT NOT NULL,         -- Google Drive Folder ID
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Setup Google OAuth2 (Sekali Pakai)

```
1. Buka https://console.cloud.google.com
2. Buat project baru → Enable Google Drive API
3. Buat OAuth2 Client ID (tipe: Desktop App)
4. Jalankan OAuth consent flow sekali → dapatkan refresh_token
5. Simpan di Supabase Edge Function secrets:
   GOOGLE_CLIENT_ID=xxxx
   GOOGLE_CLIENT_SECRET=xxxx
   GOOGLE_REFRESH_TOKEN=xxxx
```

> ⚠️ **Catatan penting:** Refresh token tidak kedaluwarsa selama akun tidak mencabut akses.
> Simpan di Supabase Vault / Edge Function secrets, **jangan** di `.env` frontend atau di database.

### Implementasi Edge Function `drive-upload` (Deno)

```typescript
// supabase/functions/drive-upload/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN")!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  const { fileBase64, mimeType, fileName, folderId } = await req.json();
  const accessToken = await getAccessToken();

  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const fileBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

  const form = new FormData();
  form.append("metadata", new Blob([metadata], { type: "application/json" }));
  form.append("file", new Blob([fileBytes], { type: mimeType }));

  const upload = await fetch(DRIVE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const result = await upload.json();
  return new Response(JSON.stringify({ fileId: result.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## 7. Frontend Structure (Next.js App Router)

```
src/
├── app/
│   ├── (public)/
│   │   └── daftar/                  # Form pendaftaran publik
│   │       └── page.tsx
│   │
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx           # Sidebar + auth guard
│   │       ├── dashboard/           # Statistik & overview
│   │       ├── pendaftaran/         # Data masuk + approve/reject + cetak formulir
│   │       ├── murid/               # List + filter per les & status
│   │       │   └── [id]/            # Detail & edit profil murid
│   │       ├── guru/                # List & CRUD guru
│   │       │   └── [id]/
│   │       ├── kelas/               # Manajemen kelas + daftar anggota
│   │       ├── absensi/             # Tab: Murid | Guru | Rekap
│   │       ├── prestasi/            # Input & riwayat nilai
│   │       ├── evaluasi/            # Daftar evaluasi + daftarkan + kirim WA
│   │       ├── wisuda/              # Manajemen wisuda + cetak piagam
│   │       ├── pembayaran/          # Tagihan + transaksi + kwitansi
│   │       ├── tabungan/            # Saldo + setor + tarik + riwayat
│   │       ├── poin/                # Saldo poin + merchandise + redemption
│   │       └── laporan/             # Export rekap absensi, keuangan, murid
│   │
│   ├── (guru)/
│   │   └── guru/
│   │       ├── layout.tsx
│   │       ├── beranda/             # Ringkasan jadwal & notif
│   │       ├── absen/               # Input absensi murid & absen diri sendiri
│   │       ├── prestasi/            # Input nilai murid
│   │       ├── evaluasi/            # Buat & proses evaluasi
│   │       └── profil/
│   │
│   └── (murid)/
│       └── murid/
│           ├── layout.tsx
│           ├── tabungan/            # Saldo & riwayat transaksi
│           ├── tagihan/             # Daftar tagihan & status bayar
│           ├── jenjang/             # Level saat ini & progress
│           ├── absensi/             # Rekap kehadiran & persentase
│           ├── poin/                # Saldo poin & tukar hadiah
│           ├── prestasi/            # Catatan nilai & perkembangan
│           ├── izin/                # Ajukan izin tidak hadir
│           └── profil/              # Data diri
│
├── components/
│   ├── ui/                          # shadcn/ui base components
│   ├── forms/                       # FormPendaftaran, FormAbsensi, dll
│   ├── tables/                      # DataTable dengan filter & sort
│   ├── layouts/                     # AdminLayout, GuruLayout, MuridLayout
│   ├── cards/                       # StatCard, StudentCard, dll
│   └── print/                       # PrintFormulir, PrintPiagam, PrintKwitansi
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client
│   │   └── server.ts                # Server component client
│   ├── utils/
│   │   ├── nis.ts                   # Format & parse NIS
│   │   ├── pdf.ts                   # Generate PDF client-side
│   │   ├── drive.ts                 # Helper: uploadToDrive(), getFileUrl()
│   │   └── format.ts                # Currency, date, dll
│   └── hooks/
│       ├── useStudents.ts
│       ├── useAttendance.ts
│       └── usePayments.ts
│
└── middleware.ts                     # Auth guard + redirect by role
```

---

## 8. Role & Access Control (RLS)

| Fitur | Admin | Guru | Murid |
|---|---|---|---|
| Pendaftaran | Full CRUD + approve | Read | — |
| Data Murid | Full CRUD | Read (kelas sendiri) | Data sendiri saja |
| Data Guru | Full CRUD | Data sendiri | — |
| Kelas | Full CRUD | Read (kelas sendiri) | Kelas sendiri |
| Absensi Murid | Full CRUD | Create/Update | Lihat sendiri |
| Absensi Guru | Full CRUD | Data sendiri | — |
| Prestasi | Full CRUD | Create/Update (murid kelas sendiri) | Lihat sendiri |
| Evaluasi | Full CRUD | Create/Update (murid kelas sendiri) | Lihat sendiri |
| Wisuda | Full CRUD | Read | Lihat sendiri |
| Pembayaran | Full CRUD | — | Lihat sendiri |
| Tabungan | Full CRUD | — | Lihat sendiri |
| Poin | Full CRUD | Read | Lihat & redeem sendiri |
| Izin | Full CRUD | Approve | Submit & lihat sendiri |
| Laporan | Full access | Terbatas | — |

---

## 9. Print / Cetak Documents

| Dokumen | Library | Keterangan |
|---|---|---|
| Formulir Pendaftaran | React-PDF | Dicetak setelah pendaftaran di-approve |
| Piagam Kelulusan | React-PDF | Template AHE (Level 8) & ASE (Level 16) |
| Kwitansi Pembayaran | jsPDF | Otomatis setelah transaksi selesai |
| Rekap Absensi | jsPDF / xlsx | Export per periode, per kelas |
| Laporan Keuangan | jsPDF / xlsx | Rekap pembayaran bulanan/tahunan |

---

## 10. Business Logic Penting

### Auto-generate NIS
```
Format : AHE-[TAHUN]-[NOMOR 3 DIGIT]
Contoh : AHE-2024-001
Trigger: Edge function `approve-registration`
```

### Auto-generate Nomor Evaluasi
```
Format : EVAL-[TAHUN]-[NOMOR 3 DIGIT]
Contoh : EVAL-2024-045
```

### Sistem Poin
```
Earn  : 1 kehadiran = 1 poin (otomatis via DB trigger / edge function)
Redeem: Murid ajukan penukaran → Admin approve → stok merchandise berkurang
Saldo : total_points - redeemed_points di student_points
```

### Flow Kenaikan Level
```
1. Admin/Guru daftarkan evaluasi (tanggal mulai & selesai)
2. Kirim WA pemberitahuan ke orang tua
3. Guru input nilai evaluasi
4. Jika passed → edge function `level-up-student`:
   - Update student_les.current_level += 1
   - Catat di evaluations.status = 'passed'
   - Kirim WA notif kenaikan level + foto anak
5. Jika level terakhir (AHE:8 / ASE:16) → arahkan ke menu Wisuda
```

### Flow Pembayaran SPP
```
Cron job tgl 1 tiap bulan → `generate-spp-bills`:
  - Ambil semua murid aktif
  - Generate payment_bills per murid per les
Admin bayarkan:
  - Pilih metode: Tunai / Potong Tabungan / Transfer
  - Jika Tabungan → kurangi savings_accounts.balance
  - Buat payment_transactions + update bill status = 'paid'
  - Generate kwitansi PDF
  - Kirim WA konfirmasi
```

### Flow Wisuda
```
Syarat: student_les.current_level = max_level AND evaluasi passed
Admin buat data wisuda:
  - Upload foto wisuda
  - Generate nomor & file piagam (PDF)
  - Update student_les.status = 'graduated'
  - Update student_les.graduated_at
Jika ingin lanjut (AHE → ASE):
  - Buat enrollment baru di student_les untuk les_ahe→les_ase
```

---

## 11. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # Hanya di edge functions, JANGAN expose ke frontend

# Google Drive OAuth2 — simpan di Supabase Edge Function Secrets (bukan .env frontend!)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REFRESH_TOKEN=1//xxxx         # Didapat dari OAuth consent flow sekali pakai
GOOGLE_DRIVE_ROOT_FOLDER_ID=xxxx     # ID folder "AHE Tepus Wetan" di Drive

# WhatsApp — Fonnte
FONNTE_API_KEY=xxxx
FONNTE_DEVICE_TOKEN=xxxx

# App
NEXT_PUBLIC_APP_URL=https://ahe-tepus-wetan.vercel.app
NEXT_PUBLIC_APP_NAME=AHE Tepus Wetan
APP_ENV=production
```

> ⚠️ `GOOGLE_CLIENT_SECRET` dan `GOOGLE_REFRESH_TOKEN` **HANYA** boleh ada di Supabase Edge Function Secrets.
> Jangan taruh di `NEXT_PUBLIC_*` atau commit ke repository.

---


## 13. Estimasi Tabel DB

| # | Tabel | Jumlah Kolom |
|---|---|---|
| 1 | profiles | 3 |
| 2 | registrations | 21 |
| 3 | students | 22 |
| 4 | student_les | 10 |
| 5 | teachers | 21 |
| 6 | classes | 10 |
| 7 | class_members | 4 |
| 8 | student_attendance | 10 |
| 9 | teacher_attendance | 8 |
| 10 | student_points | 5 |
| 11 | point_transactions | 8 |
| 12 | merchandise | 8 |
| 13 | point_redemptions | 8 |
| 14 | achievements | 10 |
| 15 | evaluations | 16 |
| 16 | graduations | 10 |
| 17 | payment_types | 7 |
| 18 | payment_bills | 9 |
| 19 | payment_transactions | 10 |
| 20 | savings_accounts | 5 |
| 21 | savings_transactions | 10 |
| 22 | leave_requests | 8 |
| 23 | wa_notifications | 9 |
| 24 | drive_folders | 4 |
| **Total** | **24 tabel** | **~231 kolom** |

---

*Plan ini akan diupdate seiring perkembangan project.*
*Last updated: 2024*