import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

// ── Supabase browser client ────────────────────────────────────────────────
// Uses anon key (public), auth done via signInWithPassword
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────
interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function domain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function BookmarksPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bmLoading, setBmLoading] = useState(false);
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");

  // Add bookmark form
  const [addUrl, setAddUrl] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // ── Auth listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Load bookmarks ──────────────────────────────────────────────────────
  const loadBookmarks = useCallback(async (token: string) => {
    setBmLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterRead === "read") params.set("is_read", "true");
      if (filterRead === "unread") params.set("is_read", "false");

      const res = await fetch(`/api/bookmarks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setBookmarks(json.data ?? []);
    } finally {
      setBmLoading(false);
    }
  }, [filterRead]);

  useEffect(() => {
    if (session?.access_token) loadBookmarks(session.access_token);
  }, [session, loadBookmarks]);

  // ── Login ───────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
    setLoggingIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ── Add bookmark ────────────────────────────────────────────────────────
  async function handleAddBookmark(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl.trim() || !session?.access_token) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: addUrl.trim(), description: addDesc.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setAddSuccess(true);
        setAddUrl("");
        setAddDesc("");
        loadBookmarks(session.access_token);
      } else {
        setAddError(json.error ?? "Failed to add bookmark.");
      }
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  // ── Toggle read ─────────────────────────────────────────────────────────
  async function toggleRead(bm: Bookmark) {
    if (!session?.access_token) return;
    const res = await fetch(`/api/bookmarks/${bm.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ is_read: !bm.is_read }),
    });
    const json = await res.json();
    if (json.success) {
      setBookmarks((prev) => prev.map((b) => b.id === bm.id ? { ...b, is_read: !bm.is_read } : b));
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function deleteBookmark(id: string) {
    if (!session?.access_token || !confirm("Hapus bookmark ini?")) return;
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (json.success) setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  // ── Render: Loading auth ─────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0e0f14", color: "#64748b", fontFamily: "system-ui" }}>
        <span>Loading...</span>
      </div>
    );
  }

  const unreadCount = bookmarks.filter((b) => !b.is_read).length;

  return (
    <>
      <Head>
        <title>Bookmarks — Mesdrop</title>
        <meta name="description" content="Private bookmark dashboard for Mesdrop." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0f14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }

        /* ── Login Screen ── */
        .login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .login-card { background: #161b27; border: 1px solid #1e2535; border-radius: 20px; padding: 40px 36px; width: 100%; max-width: 400px; }
        .login-logo { font-size: 2rem; text-align: center; margin-bottom: 8px; }
        .login-card h1 { text-align: center; font-size: 1.3rem; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 6px; }
        .login-card p { text-align: center; color: #64748b; font-size: 0.85rem; margin-bottom: 28px; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .field label { font-size: 0.8rem; font-weight: 500; color: #94a3b8; }
        .input { background: #0e0f14; border: 1px solid #1e2535; border-radius: 10px; padding: 11px 14px; color: #e2e8f0; font-family: inherit; font-size: 0.92rem; outline: none; transition: border-color 0.2s; width: 100%; }
        .input:focus { border-color: #7c3aed; }
        .input::placeholder { color: #334155; }
        .btn { background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 0.92rem; font-weight: 600; cursor: pointer; width: 100%; margin-top: 6px; transition: opacity 0.2s; }
        .btn:hover:not(:disabled) { opacity: 0.88; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-err { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; margin-top: 10px; }

        /* ── Dashboard ── */
        .page { max-width: 900px; margin: 0 auto; padding: 32px 20px 80px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; flex-wrap: wrap; gap: 12px; }
        .topbar-left h1 { font-size: 1.4rem; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .topbar-left p { font-size: 0.82rem; color: #64748b; margin-top: 2px; }
        .stats { display: flex; gap: 10px; flex-wrap: wrap; }
        .stat-pill { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); border-radius: 999px; padding: 4px 12px; font-size: 0.78rem; color: #a78bfa; font-weight: 600; }
        .logout-btn { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; border-radius: 8px; padding: 8px 16px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .logout-btn:hover { background: rgba(239,68,68,0.18); }

        .add-card { background: #161b27; border: 1px solid #1e2535; border-radius: 16px; padding: 22px 24px; margin-bottom: 28px; }
        .add-card h2 { font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 14px; letter-spacing: 0.06em; text-transform: uppercase; }
        .add-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .add-row .input { flex: 1; min-width: 200px; }
        .add-desc { width: 100%; }
        .add-actions { display: flex; flex-direction: column; gap: 8px; }
        .add-btn { background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font-size: 0.88rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; }
        .add-btn:hover:not(:disabled) { opacity: 0.88; }
        .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .add-alert { border-radius: 8px; padding: 8px 12px; font-size: 0.83rem; }
        .add-alert.ok { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #86efac; }
        .add-alert.err { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; }

        .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; }
        .filter-btn { background: #161b27; border: 1px solid #1e2535; color: #64748b; border-radius: 999px; padding: 6px 16px; font-size: 0.82rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .filter-btn.active { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.4); color: #a78bfa; }

        .bm-list { display: flex; flex-direction: column; gap: 10px; }
        .bm-item { background: #161b27; border: 1px solid #1e2535; border-radius: 12px; padding: 14px 18px; display: flex; gap: 14px; align-items: flex-start; transition: border-color 0.2s; }
        .bm-item:hover { border-color: rgba(167,139,250,0.25); }
        .bm-item.read { opacity: 0.55; }
        .bm-body { flex: 1; min-width: 0; }
        .bm-title { font-size: 0.92rem; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bm-title a { color: inherit; text-decoration: none; }
        .bm-title a:hover { color: #a78bfa; }
        .bm-domain { font-size: 0.76rem; color: #475569; margin-top: 2px; }
        .bm-desc { font-size: 0.83rem; color: #94a3b8; margin-top: 6px; }
        .bm-footer { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .bm-time { font-size: 0.73rem; color: #334155; }
        .bm-actions { display: flex; gap: 6px; margin-left: auto; }
        .icon-btn { background: none; border: none; cursor: pointer; color: #475569; font-size: 0.85rem; padding: 4px 8px; border-radius: 6px; transition: background 0.15s, color 0.15s; }
        .icon-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .icon-btn.read-btn.active { color: #22c55e; }
        .icon-btn.del-btn:hover { color: #f87171; }

        .empty { text-align: center; color: #475569; padding: 40px 0; font-size: 0.9rem; }
        .loading { text-align: center; color: #475569; padding: 32px 0; }
        .spinner { display: inline-block; width: 22px; height: 22px; border: 3px solid #1e2535; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) { .add-row { flex-direction: column; } .topbar { flex-direction: column; align-items: flex-start; } }
      `}</style>

      {/* ── Login Screen ── */}
      {!session ? (
        <div className="login-wrap">
          <div className="login-card">
            <div className="login-logo">🔖</div>
            <h1>Bookmarks</h1>
            <p>Login untuk mengakses dashboard bookmark pribadimu</p>
            <form onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="email-input">Email</label>
                <input
                  id="email-input"
                  className="input"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loggingIn}
                />
              </div>
              <div className="field">
                <label htmlFor="password-input">Password</label>
                <input
                  id="password-input"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loggingIn}
                />
              </div>
              {loginError && <div className="login-err">{loginError}</div>}
              <button id="login-btn" className="btn" type="submit" disabled={loggingIn}>
                {loggingIn ? "Masuk..." : "Masuk →"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ── Dashboard ── */
        <main className="page">
          <div className="topbar">
            <div className="topbar-left">
              <h1>🔖 Bookmarks</h1>
              <p>{session.user?.email}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="stats">
                <span className="stat-pill">{bookmarks.length} total</span>
                {unreadCount > 0 && <span className="stat-pill">{unreadCount} unread</span>}
              </div>
              <button id="logout-btn" className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>

          {/* ── Add Form ── */}
          <div className="add-card">
            <h2>Tambah Bookmark</h2>
            <form onSubmit={handleAddBookmark}>
              <div className="add-actions">
                <div className="add-row">
                  <input
                    id="bookmark-url"
                    className="input"
                    type="url"
                    placeholder="https://example.com/artikel"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    disabled={adding}
                    required
                  />
                  <button id="add-bookmark-btn" className="add-btn" type="submit" disabled={adding || !addUrl.trim()}>
                    {adding ? "Menyimpan..." : "+ Simpan"}
                  </button>
                </div>
                <input
                  id="bookmark-desc"
                  className="input add-desc"
                  type="text"
                  placeholder="Catatan (opsional)"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  disabled={adding}
                />
                {addSuccess && <div className="add-alert ok">✓ Bookmark ditambahkan!</div>}
                {addError && <div className="add-alert err">{addError}</div>}
              </div>
            </form>
          </div>

          {/* ── Filter Bar ── */}
          <div className="filter-bar">
            {(["all", "unread", "read"] as const).map((f) => (
              <button
                key={f}
                className={`filter-btn ${filterRead === f ? "active" : ""}`}
                onClick={() => setFilterRead(f)}
                id={`filter-${f}`}
              >
                {f === "all" ? "Semua" : f === "unread" ? "Belum Dibaca" : "Sudah Dibaca"}
              </button>
            ))}
          </div>

          {/* ── Bookmark List ── */}
          {bmLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : bookmarks.length === 0 ? (
            <div className="empty">Belum ada bookmark. Tambah yang pertama! 🚀</div>
          ) : (
            <div className="bm-list">
              {bookmarks.map((bm) => (
                <div key={bm.id} className={`bm-item ${bm.is_read ? "read" : ""}`}>
                  <div className="bm-body">
                    <div className="bm-title">
                      <a href={bm.url} target="_blank" rel="noopener noreferrer">
                        {bm.title || domain(bm.url)}
                      </a>
                    </div>
                    <div className="bm-domain">{domain(bm.url)}</div>
                    {bm.description && <div className="bm-desc">{bm.description}</div>}
                    <div className="bm-footer">
                      <span className="bm-time">{timeAgo(bm.created_at)}</span>
                      <div className="bm-actions">
                        <button
                          className={`icon-btn read-btn ${bm.is_read ? "active" : ""}`}
                          title={bm.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                          onClick={() => toggleRead(bm)}
                          id={`toggle-read-${bm.id}`}
                        >
                          {bm.is_read ? "✓ Dibaca" : "○ Tandai Baca"}
                        </button>
                        <button
                          className="icon-btn del-btn"
                          title="Hapus"
                          onClick={() => deleteBookmark(bm.id)}
                          id={`delete-${bm.id}`}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </>
  );
}
