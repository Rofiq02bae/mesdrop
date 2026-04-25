# Personal Inbox API

A minimal, production-ready serverless backend combining an **Anonymous Feedback System** and a **Bookmark Manager**, built with TypeScript, Vercel, and Supabase.

---

## Project Structure

```
personal-inbox-api/
├── api/
│   ├── f/
│   │   └── [username].ts     # POST  /api/f/:username  (public)
│   ├── bookmarks/
│   │   ├── index.ts          # GET, POST  /api/bookmarks
│   │   └── [id].ts           # PATCH, DELETE  /api/bookmarks/:id
│   └── feedback/
│       └── index.ts          # GET, PATCH  /api/feedback  (private)
├── lib/
│   ├── supabase.ts           # Supabase clients (public + admin)
│   ├── auth.ts               # Bearer token extraction
│   ├── response.ts           # Consistent JSON helpers
│   ├── rateLimit.ts          # In-memory rate limiter
│   ├── fetchTitle.ts         # Auto-fetch <title> from URL
│   └── logger.ts             # Structured JSON logger
├── schema.sql                # Paste into Supabase SQL Editor
├── vercel.json
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Step 1 — Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `schema.sql` → **Run**
3. Copy from **Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase keys in .env.local

npm run dev        # starts Vercel dev server at localhost:3000
npm run type-check # TypeScript validation
```

---

## Step 3 — Deploy to Vercel

```bash
# Install Vercel CLI (once)
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Production deploy
vercel --prod
```

---

## API Reference

### Authentication

All private endpoints require a Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase-access-token>
```

Get the token via Supabase Auth (sign up/sign in via Supabase client, or use the dashboard for testing).

---

### Public Endpoints

#### `POST /api/f/:username` — Submit Anonymous Feedback

No authentication required.

**Request:**
```json
POST /api/f/johndoe
Content-Type: application/json

{
  "message": "Your talk at the meetup was really inspiring!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "f3a2b1c4-...",
    "message": "Feedback sent successfully.",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error (429 — Rate Limited):**
```json
{
  "success": false,
  "error": "Too many requests. Please wait a minute."
}
```

**Rules:**
- 5 requests per IP per minute per username
- Message: 3–2000 characters

---

### Private Endpoints (require Bearer token)

#### `GET /api/bookmarks` — List Bookmarks

```
GET /api/bookmarks
GET /api/bookmarks?is_read=false
GET /api/bookmarks?limit=10&offset=20
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "url": "https://example.com/article",
      "title": "An Amazing Article",
      "description": "Notes I added",
      "is_read": false,
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

#### `POST /api/bookmarks` — Create Bookmark

```json
POST /api/bookmarks
Content-Type: application/json

{
  "url": "https://example.com/article",
  "description": "Optional personal note"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "url": "https://example.com/article",
    "title": "An Amazing Article",   // auto-fetched from <title> tag
    "description": "Optional personal note",
    "is_read": false,
    "created_at": "2024-01-15T09:00:00Z"
  }
}
```

---

#### `PATCH /api/bookmarks/:id` — Update Bookmark

```json
PATCH /api/bookmarks/a1b2c3d4-...
Content-Type: application/json

{
  "is_read": true,
  "title": "Overridden Title",
  "description": "Updated note"
}
```

All fields are optional. Only provided fields are updated.

**Response (200):** Updated bookmark object (same shape as POST response).

---

#### `DELETE /api/bookmarks/:id` — Delete Bookmark

```
DELETE /api/bookmarks/a1b2c3d4-...
```

**Response (200):**
```json
{
  "success": true,
  "data": { "id": "a1b2c3d4-...", "deleted": true }
}
```

---

#### `GET /api/feedback` — View Your Received Feedback

```
GET /api/feedback
GET /api/feedback?is_read=false
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "f3a2b1c4-...",
      "message": "Your talk was inspiring!",
      "is_read": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

#### `PATCH /api/feedback` — Mark All Feedback as Read

```
PATCH /api/feedback
```

**Response (200):**
```json
{
  "success": true,
  "data": { "marked_read": 3 }
}
```

---

## Error Response Format

All errors return:
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Common status codes:
| Code | Meaning |
|------|---------|
| 400  | Validation error |
| 401  | Missing or invalid auth token |
| 404  | Resource not found |
| 405  | Method not allowed |
| 429  | Rate limited |
| 500  | Internal server error |

---

## Production Considerations

| Concern | Current approach | Production upgrade |
|---------|-----------------|-------------------|
| Rate limiting | In-memory per instance | [Upstash Redis](https://upstash.com) |
| Auth | Supabase JWT | Same (production-ready) |
| Logging | `console.log` JSON | Ship to Logflare or Axiom |
| Title fetching | Inline fetch | Queue via Supabase Edge Functions |
| Username uniqueness | DB constraint | Same |
