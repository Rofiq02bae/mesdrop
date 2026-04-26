# Mesdrop

Backend + UI untuk Anonymous Feedback System dan Bookmark Manager.  
Dibangun dengan **Next.js**, **TypeScript**, dan **Supabase**.

---

## Struktur Folder

```
mesdrop/
├── lib/
│   ├── supabase.ts        # Supabase client (anon + admin)
│   ├── auth.ts            # Bearer token extractor
│   ├── response.ts        # ok() / fail() / serverError()
│   ├── rateLimit.ts       # In-memory rate limiter (1 req / 1 menit)
│   ├── fetchTitle.ts      # Auto-fetch <title> dari URL
│   └── logger.ts          # JSON structured logger
│
├── pages/
│   ├── f/
│   │   ├── index.tsx          # Halaman publik: semua pesan + form kirim
│   │   └── [username].tsx     # Halaman publik: pesan per user + form kirim
│   ├── bookmarks/
│   │   └── index.tsx          # Halaman private: login + dashboard bookmark
│   └── api/
│       ├── f/
│       │   ├── messages.ts            # GET  /api/f/messages (publik)
│       │   ├── [username]/
│       │   │   ├── index.ts           # POST /api/f/:username (publik)
│       │   │   └── messages.ts        # GET  /api/f/:username/messages (publik)
│       ├── bookmarks/
│       │   ├── index.ts               # GET + POST /api/bookmarks (private)
│       │   └── [id].ts                # PATCH + DELETE /api/bookmarks/:id (private)
│       └── feedback/
│           └── index.ts               # GET + PATCH /api/feedback (private)
│
├── schema.sql             # SQL schema + instruksi setup user Supabase
├── .env.example
├── vercel.json
├── tsconfig.json
└── package.json
```

---

## Setup (Step by Step)

### 1. Clone & install

```bash
git clone <repo-url> mesdrop
cd mesdrop
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → paste isi `schema.sql` → klik **Run**
3. Buat user admin:
   - Buka **Authentication → Users → Add user**
   - Email: `aasadmin@mesdrop.local`
   - Password: `shiroko`
   - Centang **Auto confirm email** → **Add User**

### 3. Environment variables

Salin `.env.example` ke `.env.local`:

```bash
cp .env.example .env.local
```

Isi nilai dari **Supabase → Settings → API**:

```env
# Server-side
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Client-side (untuk halaman /bookmarks)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> ⚠️ `NEXT_PUBLIC_` prefix wajib untuk variabel yang dipakai di browser (halaman bookmarks pakai Supabase Auth client-side).

### 4. Jalankan lokal

```bash
npm run dev
# → http://localhost:3000
```

### 5. Deploy ke Vercel

```bash
npm i -g vercel
vercel

# Set env vars di Vercel dashboard atau CLI:
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

vercel --prod
```

Catatan:
- API route proyek ini memakai `pages/api/...` milik Next.js Pages Router.
- Jangan buat folder `api/` di root untuk endpoint yang sama, karena itu akan dibaca sebagai Vercel Functions terpisah dan bisa bentrok saat build.

---

## Halaman UI

| URL | Akses | Deskripsi |
|-----|-------|-----------|
| `/f` | Publik | Wall semua pesan anonim + form kirim |
| `/f/[username]` | Publik | Pesan untuk user tertentu + form kirim |
| `/bookmarks` | Private | Login + dashboard kelola bookmark |

---

## API Endpoints

### Publik (no auth)

#### `POST /api/f/:username` — Kirim pesan anonim
```json
// Request
{ "message": "Pesanmu di sini", "sender_name": "Silent Fox" }

// Response 201
{ "success": true, "data": { "id": "uuid", "message": "Pesan berhasil dikirim!", "created_at": "..." } }

// Rate limit: 1 request per IP per 1 menit → 429
{ "success": false, "error": "Terlalu banyak pesan. Coba lagi dalam 1 menit." }
```

#### `GET /api/f/messages` — Semua pesan (publik)
```
GET /api/f/messages?limit=30&offset=0
GET /api/f/messages?username=aasadmin   ← filter per user
```

#### `GET /api/f/:username/messages` — Pesan per user
```
GET /api/f/aasadmin/messages
```

---

### Private (Bearer token dari Supabase Auth)

```
Authorization: Bearer <access_token>
```

#### Bookmarks
```
GET    /api/bookmarks             → list bookmark
GET    /api/bookmarks?is_read=false
POST   /api/bookmarks             → tambah (auto-fetch title)
PATCH  /api/bookmarks/:id         → update title/desc/is_read
DELETE /api/bookmarks/:id         → hapus
```

#### Feedback (inbox pribadi)
```
GET   /api/feedback               → list feedback masuk
GET   /api/feedback?is_read=false
PATCH /api/feedback               → tandai semua sebagai sudah dibaca
```

---

## Rate Limiting

- **1 pesan per IP per 1 menit** (in-memory per instance)
- Frontend menampilkan countdown timer saat cooldown aktif
- Untuk production multi-instance → migrasi ke [Upstash Redis](https://upstash.com)

---

## Random Name Generator

Format: `[Adjective] [Animal]` — contoh: `Silent Fox`, `Lunar Panda`, `Crimson Raven`

- Di-generate otomatis saat halaman load
- User bisa klik tombol **↻** untuk generate ulang
- Nama dikirim bersama pesan sebagai `sender_name`

---

## Known Issues

| Issue | Status | Rekomendasi |
|-------|--------|-------------|
| Rate limiter in-memory | ⚠️ per-instance | Ganti ke Upstash Redis |
| Rule `*.sql` di `.gitignore` | ⚠️ `schema.sql` ter-ignore | Hapus rule atau `git add -f schema.sql` |
| 2 moderate vulnerabilities (postcss) | ⚠️ | Monitor update next.js |
