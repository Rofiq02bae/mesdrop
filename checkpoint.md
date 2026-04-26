# Checkpoint Proyek — Mesdrop

**Tanggal update:** 26 April 2026  
**Workspace:** `/media/aas/New Volume1/mesdrop`

---

## 1) Ringkasan Proyek

`mesdrop` adalah backend API untuk:
- **Anonymous Feedback System**
- **Bookmark Manager**

Proyek saat ini sudah direfaktor ke **Next.js (Pages Router + API Routes)** dengan integrasi **Supabase** untuk autentikasi dan database.

---

## 2) Status Terkini (Operational Snapshot)

### Sudah beres
- Migrasi dari pola `vercel dev` + handler lama ke **Next.js native**.
- Script utama sudah pakai Next.js:
  - `npm run dev` → `next dev`
  - `npm run build` → `next build`
  - `npm run start` → `next start`
  - `npm run type-check` → `tsc --noEmit`
- Endpoint API aktif di `pages/api/**`.
- `vercel.json` sudah valid dan mengarah ke framework `nextjs`.
- `.gitignore` sudah diperbarui untuk kebutuhan Next.js + Node.js.

### Hasil verifikasi terakhir
- `npm run type-check` ✅ sukses
- `npm run build` ✅ sukses
- `npm audit --json` ⚠️ masih ada **2 moderate vulnerabilities**
  - Terkait chain `next -> postcss` (advisory PostCSS)

---

## 3) Tech Stack

- **Framework:** Next.js `^16.0.1` (runtime terdeteksi `16.2.4`)
- **Language:** TypeScript `^5.8.3`
- **UI/runtime deps:**
  - `react ^19.2.0`
  - `react-dom ^19.2.0`
- **Backend SDK:** `@supabase/supabase-js ^2.49.1`
- **Node engine:** `>=18`

Dev dependencies:
- `@types/node ^22.15.3`
- `@types/react ^19.2.14`
- `@types/react-dom ^19.2.3`

Security overrides saat ini di `package.json`:
- `ajv >=8.18.0`
- `minimatch >=10.2.5`
- `path-to-regexp >=6.3.0`
- `smol-toml >=1.6.1`
- `undici >=6.24.0`

---

## 4) Struktur Folder (yang penting)

```text
mesdrop/
├── .env
├── .env.example
├── .gitignore
├── checkpoint.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── next-env.d.ts
├── vercel.json
├── schema.sql
├── lib/
│   ├── auth.ts
│   ├── fetchTitle.ts
│   ├── logger.ts
│   ├── rateLimit.ts
│   ├── response.ts
│   └── supabase.ts
├── pages/
│   ├── index.tsx
│   └── api/
│       ├── bookmarks/
│       │   ├── index.ts
│       │   └── [id].ts
│       ├── f/
│       │   └── [username].ts
│       └── feedback/
│           └── index.ts
└── api/                (folder legacy, tidak dipakai Next runtime)
```

Catatan:
- Folder `api/` di root masih ada sebagai sisa struktur lama.
- Runtime Next.js membaca endpoint dari `pages/api/**`.

---

## 5) Konfigurasi Inti

### `vercel.json`
```json
{
  "framework": "nextjs"
}
```

### `tsconfig.json` (intisari)
- `moduleResolution: bundler`
- `jsx: react-jsx`
- plugin `next`
- include:
  - `next-env.d.ts`
  - `pages/**/*.ts`
  - `pages/**/*.tsx`
  - `lib/**/*.ts`
  - `.next/types/**/*.ts`

### `next-env.d.ts`
- File sudah ada dan valid untuk proyek TypeScript Next.js.

---

## 6) Environment Variables

Wajib tersedia:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Peran variabel:
- `ANON_KEY` dipakai untuk validasi token auth user (`supabase.auth.getUser`).
- `SERVICE_ROLE_KEY` dipakai untuk operasi admin DB (`supabaseAdmin`).

---

## 7) Ringkasan Endpoint API

### Public
1. `POST /api/f/[username]`
	- Kirim feedback anonim ke user berdasarkan `username`.
	- Validasi message: minimal 3, maksimal 2000 karakter.
	- Rate limit in-memory: **5 request / menit / IP / username**.

### Auth Required (Bearer token)
2. `GET /api/bookmarks`
	- List bookmark milik user.
	- Query opsional: `is_read`, `limit`, `offset`.

3. `POST /api/bookmarks`
	- Tambah bookmark.
	- Validasi URL.
	- Auto-fetch title dari halaman target.

4. `PATCH /api/bookmarks/[id]`
	- Update `title`, `description`, `is_read`.

5. `DELETE /api/bookmarks/[id]`
	- Hapus bookmark milik user.

6. `GET /api/feedback`
	- Ambil feedback milik user.
	- Query opsional: `is_read`, `limit`, `offset`.

7. `PATCH /api/feedback`
	- Tandai semua feedback unread milik user sebagai read.

Response format helper:
- sukses: `{ success: true, data }`
- gagal: `{ success: false, error }`

---

## 8) Library Internal (Peran Singkat)

- `lib/supabase.ts`
  - Inisialisasi `supabase` (anon) + `supabaseAdmin` (service role).
- `lib/auth.ts`
  - Ekstrak Bearer token + validasi user via Supabase Auth.
- `lib/response.ts`
  - Helper response standar (`ok`, `fail`, `serverError`).
- `lib/rateLimit.ts`
  - Rate limiter in-memory berbasis `Map`.
- `lib/fetchTitle.ts`
  - Ambil `<title>` dari URL bookmark dengan timeout.
- `lib/logger.ts`
  - Logging JSON terstruktur (`info`, `warn`, `error`).

---

## 9) `.gitignore` Terkini

Sudah mengabaikan item penting:
- `.env`, `.env.*`, kecuali `.env.example`
- `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, `coverage/`
- `.vercel/`
- berbagai file log
- `*.tsbuildinfo`

Catatan: saat ini ada rule `*.sql`, sehingga `schema.sql` ikut ter-ignore jika belum ter-track.

---

## 10) Riwayat Perubahan Penting (Checkpoint Ini)

1. Masalah awal:
	- `npm install` sempat error karena path/package context.
	- `vercel.json` sempat kosong/invalid JSON.
	- `npm run dev` sempat loop karena recursive `vercel dev`.

2. Perbaikan:
	- `vercel.json` diperbaiki menjadi JSON valid.
	- Dependensi dibersihkan + override security.
	- Migrasi ke Next.js untuk menghilangkan recursion dari Vercel CLI dev command.
	- Endpoint dipindah/diterapkan di `pages/api/**`.

3. Kondisi saat ini:
	- `next dev` siap jalan lokal.
	- Build production berhasil.

---

## 11) Cara Menjalankan (Current)

1. Install dependency
	- `npm install`
2. Jalankan dev server
	- `npm run dev`
3. Type check
	- `npm run type-check`
4. Build production
	- `npm run build`
5. Jalankan hasil build
	- `npm run start`

---

## 12) Known Issues / Risiko

1. **Audit warning**
	- Masih ada 2 moderate vulnerabilities terkait dependency tree (`next`/`postcss`).

2. **Rate limiter in-memory**
	- Tidak cocok untuk multi-instance production.
	- Rekomendasi: ganti ke Redis/Upstash.

3. **Folder legacy `api/` masih ada**
	- Berpotensi bikin bingung maintenance.
	- Aman untuk dihapus setelah verifikasi final.

4. **Rule `.gitignore` berisi `*.sql`**
	- Bisa menghalangi tracking `schema.sql` bila dibutuhkan di repo.

---

## 13) Next Action Rekomendasi

Prioritas tinggi:
1. Putuskan apakah `schema.sql` harus di-track:
	- Jika ya, hapus rule `*.sql` dari `.gitignore`.
2. Rapikan folder legacy `api/` (hapus jika sudah tidak dipakai).
3. Tambah test minimal (smoke test endpoint utama).

Prioritas menengah:
4. Mitigasi vulnerability moderate (monitor update `next/postcss`).
5. Migrasi rate limiter ke Redis untuk production scale.

---

## 14) Ringkasan 1 Kalimat

Proyek `mesdrop` sudah berhasil dimigrasikan ke **Next.js API Routes**, berjalan stabil secara lokal/build, terintegrasi Supabase, dan tinggal menyisakan pekerjaan cleanup + hardening kecil untuk produksi.
