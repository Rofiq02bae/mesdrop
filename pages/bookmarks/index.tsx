import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client (browser-side, anon key only) ───────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ───────────────────────────────────────────────────────────────────
interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function BookmarksPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<"all" | "unread">("all");

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) return <Loader />;
  if (!session) return <LoginPage />;
  return <Dashboard session={session} view={view} setView={setView} />;
}

// ── Login Page ──────────────────────────────────────────────────────────────
function LoginPage() {
  const [email, setEmail] = useState("aasadmin@mesdrop.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Login — Mesdrop Bookmarks</title>
      </Head>
      <style>{GLOBAL_STYLE}</style>

      <div className="login-bg">
        <div className="grain" />
        <div className="login-box">
          <div className="login-logo">⌗</div>
          <h1 className="login-title">Bookmarks</h1>
          <p className="login-sub">Area privat. Masuk dulu.</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aasadmin@mesdrop.local"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="alert alert-err">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Masuk..." : "Masuk →"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ session, view, setView }: { session: any; view: string; setView: (v: any) => void }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUrl, setAddUrl] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const token = session?.access_token;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = view === "unread" ? "?is_read=false" : "";
      const res = await fetch(`/api/bookmarks${params}`, { headers });
      const json = await res.json();
      if (json.success) setBookmarks(json.data);
    } finally {
      setLoading(false);
    }
  }, [view, token]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: addUrl.trim(), description: addDesc.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setAddUrl("");
        setAddDesc("");
        fetchBookmarks();
      } else {
        setAddError(json.error ?? "Gagal menambahkan.");
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleRead(b: Bookmark) {
    await fetch(`/api/bookmarks/${b.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_read: !b.is_read }),
    });
    fetchBookmarks();
  }

  async function deleteBookmark(id: string) {
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE", headers });
    fetchBookmarks();
  }

  function startEdit(b: Bookmark) {
    setEditId(b.id);
    setEditTitle(b.title ?? "");
    setEditDesc(b.description ?? "");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/bookmarks/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ title: editTitle || undefined, description: editDesc || undefined }),
    });
    setEditId(null);
    setSaving(false);
    fetchBookmarks();
  }

  const filtered = bookmarks.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.url.toLowerCase().includes(q) ||
      (b.title ?? "").toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q)
    );
  });

  const unreadCount = bookmarks.filter((b) => !b.is_read).length;

  return (
    <>
      <Head>
        <title>Bookmarks — Mesdrop</title>
      </Head>
      <style>{GLOBAL_STYLE}</style>

      <div className="grain" />
      <div className="dash-wrap">
        {/* Header */}
        <header className="dash-header">
          <div>
            <div className="hero-tag">// private</div>
            <h1 className="dash-title">Bookmarks</h1>
          </div>
          <div className="header-right">
            <span className="user-pill">{session.user.email}</span>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Keluar</button>
          </div>
        </header>

        {/* Add form */}
        <div className="card">
          <div className="card-title">Tambah Bookmark</div>
          <form onSubmit={handleAdd}>
            <div className="add-row">
              <input
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://..."
                type="url"
                required
              />
              <input
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                placeholder="Catatan (opsional)"
              />
              <button type="submit" className="btn-primary btn-sm" disabled={adding}>
                {adding ? "..." : "+ Simpan"}
              </button>
            </div>
            {addError && <div className="alert alert-err" style={{ marginTop: 8 }}>{addError}</div>}
          </form>
        </div>

        {/* Filters + search */}
        <div className="toolbar">
          <div className="tab-group">
            <button className={`tab ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
              Semua <span className="tab-count">{bookmarks.length}</span>
            </button>
            <button className={`tab ${view === "unread" ? "active" : ""}`} onClick={() => setView("unread")}>
              Belum dibaca <span className="tab-count">{unreadCount}</span>
            </button>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari..."
          />
        </div>

        {/* Bookmark list */}
        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="empty">Belum ada bookmark{search ? ` untuk "${search}"` : ""}.</div>
        ) : (
          <div className="bm-list">
            {filtered.map((b) => (
              <div key={b.id} className={`bm-item ${b.is_read ? "is-read" : ""}`}>
                {editId === b.id ? (
                  <div className="edit-form">
                    <input className="edit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Judul" />
                    <input className="edit-input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Catatan" />
                    <div className="edit-actions">
                      <button className="btn-primary btn-xs" onClick={() => saveEdit(b.id)} disabled={saving}>{saving ? "..." : "Simpan"}</button>
                      <button className="btn-ghost btn-xs" onClick={() => setEditId(null)}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bm-top">
                      <div className="bm-info">
                        <a href={b.url} target="_blank" rel="noreferrer" className="bm-title">
                          {b.title ?? new URL(b.url).hostname}
                        </a>
                        <span className="bm-url">{b.url}</span>
                        {b.description && <span className="bm-desc">{b.description}</span>}
                      </div>
                      <div className="bm-actions">
                        <button
                          className={`btn-read ${b.is_read ? "read" : "unread"}`}
                          onClick={() => toggleRead(b)}
                          title={b.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                        >
                          {b.is_read ? "✓" : "○"}
                        </button>
                        <button className="btn-icon" onClick={() => startEdit(b)} title="Edit">✎</button>
                        <button className="btn-icon danger" onClick={() => deleteBookmark(b.id)} title="Hapus">✕</button>
                      </div>
                    </div>
                    <div className="bm-foot">
                      <span className="bm-date">{new Date(b.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {!b.is_read && <span className="badge-unread">Belum dibaca</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Loader() {
  return (
    <>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f" }}>
        <div className="spinner" />
      </div>
    </>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --surface: #12121a; --border: #1e1e2e;
    --accent: #7c6af7; --accent2: #f7c66a; --text: #e8e6f0;
    --muted: #6b6880; --ok: #4ade80; --err: #f87171; --radius: 12px;
  }
  html, body { background: var(--bg); color: var(--text); font-family: 'DM Mono', monospace; min-height: 100vh; }

  .grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    background-size: 200px 200px; opacity: 0.4;
  }

  /* Login */
  .login-bg { position: relative; z-index: 1; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .login-box { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 40px 36px; width: 100%; max-width: 380px; }
  .login-logo { font-size: 2.5rem; margin-bottom: 12px; text-align: center; }
  .login-title { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 800; text-align: center; margin-bottom: 6px; }
  .login-sub { color: var(--muted); font-size: 13px; text-align: center; margin-bottom: 28px; }
  .login-form { display: flex; flex-direction: column; gap: 14px; }

  /* Dashboard */
  .dash-wrap { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 40px 20px 80px; }
  .dash-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 36px; flex-wrap: wrap; gap: 12px; }
  .hero-tag { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
  .dash-title { font-family: 'Syne', sans-serif; font-size: clamp(1.8rem, 4vw, 2.4rem); font-weight: 800; }
  .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .user-pill { font-size: 12px; color: var(--muted); background: var(--surface); border: 1px solid var(--border); border-radius: 99px; padding: 4px 12px; }
  .btn-logout { background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); cursor: pointer; font-family: 'DM Mono', monospace; font-size: 12px; padding: 6px 12px; transition: all 0.15s; }
  .btn-logout:hover { border-color: var(--err); color: var(--err); }

  /* Card */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px 24px; margin-bottom: 24px; }
  .card-title { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }

  /* Add row */
  .add-row { display: grid; grid-template-columns: 2fr 1fr auto; gap: 10px; }
  @media (max-width: 600px) { .add-row { grid-template-columns: 1fr; } }

  /* Fields */
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  input, textarea {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-family: 'DM Mono', monospace; font-size: 13px;
    padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.2s;
  }
  input:focus, textarea:focus { border-color: var(--accent); }

  /* Buttons */
  .btn-primary {
    background: var(--accent); border: none; border-radius: 8px; color: #fff;
    cursor: pointer; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
    padding: 12px 20px; transition: all 0.15s; white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) { background: #9080ff; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary.btn-sm { padding: 10px 16px; font-size: 13px; }
  .btn-primary.btn-xs { padding: 6px 14px; font-size: 12px; }
  .btn-ghost { background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); cursor: pointer; font-family: 'DM Mono', monospace; font-size: 12px; padding: 6px 14px; transition: all 0.15s; }
  .btn-ghost:hover { color: var(--text); border-color: var(--text); }

  /* Toolbar */
  .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .tab-group { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 3px; }
  .tab { background: transparent; border: none; border-radius: 6px; color: var(--muted); cursor: pointer; font-family: 'DM Mono', monospace; font-size: 12px; padding: 6px 12px; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
  .tab.active { background: var(--accent); color: #fff; }
  .tab-count { background: rgba(255,255,255,0.15); border-radius: 99px; font-size: 10px; padding: 1px 6px; }
  .search-input { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 13px; outline: none; padding: 8px 14px; width: 200px; transition: border-color 0.2s; }
  .search-input:focus { border-color: var(--accent); }

  /* Bookmark list */
  .bm-list { display: flex; flex-direction: column; gap: 10px; }
  .bm-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; transition: border-color 0.2s; }
  .bm-item:hover { border-color: var(--accent); }
  .bm-item.is-read { opacity: 0.6; }
  .bm-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .bm-info { flex: 1; min-width: 0; }
  .bm-title { color: var(--text); font-size: 14px; font-weight: 500; text-decoration: none; display: block; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bm-title:hover { color: var(--accent); }
  .bm-url { font-size: 11px; color: var(--muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
  .bm-desc { font-size: 12px; color: var(--accent2); display: block; }
  .bm-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .btn-read { background: transparent; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; font-size: 14px; padding: 4px 8px; transition: all 0.15s; }
  .btn-read.unread { color: var(--muted); }
  .btn-read.read { color: var(--ok); border-color: var(--ok); }
  .btn-icon { background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); cursor: pointer; font-size: 13px; padding: 4px 8px; transition: all 0.15s; }
  .btn-icon:hover { color: var(--text); border-color: var(--text); }
  .btn-icon.danger:hover { color: var(--err); border-color: var(--err); }
  .bm-foot { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .bm-date { font-size: 11px; color: var(--muted); }
  .badge-unread { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; background: #1e1630; border: 1px solid var(--accent); color: var(--accent); border-radius: 4px; padding: 2px 8px; }

  /* Edit form */
  .edit-form { display: flex; flex-direction: column; gap: 8px; }
  .edit-input { background: var(--bg); border: 1px solid var(--accent); border-radius: 8px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 13px; padding: 8px 12px; outline: none; }
  .edit-actions { display: flex; gap: 8px; }

  /* Utils */
  .alert { border-radius: 8px; font-size: 13px; padding: 10px 14px; }
  .alert-ok { background: #0f2a1a; border: 1px solid #166534; color: var(--ok); }
  .alert-err { background: #2a0f0f; border: 1px solid #991b1b; color: var(--err); }
  .empty { text-align: center; padding: 48px 0; color: var(--muted); font-size: 13px; }
  .spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 48px auto; display: block; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
