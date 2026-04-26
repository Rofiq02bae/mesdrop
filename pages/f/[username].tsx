import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// ── Random name generator ──────────────────────────────────────────────────

const ADJECTIVES = [
  "Silent", "Brave", "Calm", "Fierce", "Happy", "Lazy", "Lucky", "Mighty",
  "Noble", "Quick", "Shiny", "Silly", "Sleepy", "Swift", "Tiny", "Wild",
  "Bold", "Cool", "Dark", "Daring", "Epic", "Fuzzy", "Gentle", "Honest",
  "Jolly", "Kind", "Loud", "Mellow", "Mystic", "Neat", "Odd", "Proud",
];

const ANIMALS = [
  "Fox", "Panda", "Wolf", "Eagle", "Tiger", "Bear", "Hawk", "Crow",
  "Lion", "Shark", "Whale", "Seal", "Deer", "Moose", "Lynx", "Otter",
  "Gecko", "Raven", "Bison", "Crane", "Drake", "Finch", "Goose", "Heron",
  "Ibis", "Jaguar", "Koala", "Lemur", "Mink", "Newt", "Osprey", "Puffin",
];

function randomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  message: string;
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function UserFeedbackPage() {
  const router = useRouter();
  const { username } = router.query as { username: string };

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [senderName] = useState(() =>
    typeof window !== "undefined" ? randomName() : "Anonymous"
  );

  // form state
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function loadMessages(u: string) {
    setLoading(true);
    fetch(`/api/f/${encodeURIComponent(u)}/messages`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMessages(json.data.messages ?? []);
          setNotFound(false);
        } else if (json.error?.includes("not found")) {
          setNotFound(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (username) loadMessages(username);
  }, [username]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !username) return;
    setSending(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/f/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({ type: "success", text: "Pesan terkirim! 🎉" });
        setMessageText("");
        loadMessages(username);
      } else {
        setFeedbackMsg({ type: "error", text: json.error ?? "Something went wrong." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <>
        <Head>
          <title>User Not Found — Mesdrop</title>
        </Head>
        <style>{`
          body { background: #0e0f14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .center { text-align: center; }
          h1 { font-size: 1.5rem; margin-bottom: 12px; }
          p { color: #94a3b8; }
          a { color: #a78bfa; text-decoration: none; }
        `}</style>
        <div className="center">
          <h1>👻 User Not Found</h1>
          <p>@{username} tidak ditemukan di Mesdrop.</p>
          <p style={{ marginTop: 16 }}><a href="/f">← Kembali ke feed</a></p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{username ? `@${username} — Mesdrop` : "Mesdrop"}</title>
        <meta name="description" content={`Kirim pesan anonim ke @${username} di Mesdrop.`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0f14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }

        .page { max-width: 720px; margin: 0 auto; padding: 40px 20px 80px; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; color: #475569; font-size: 0.85rem; text-decoration: none; margin-bottom: 32px; transition: color 0.2s; }
        .back-link:hover { color: #a78bfa; }

        .profile { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; }
        .avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #fff; flex-shrink: 0; }
        .profile-info h1 { font-size: 1.4rem; font-weight: 700; }
        .profile-info p { color: #64748b; font-size: 0.88rem; margin-top: 4px; }

        .sender-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); border-radius: 999px; padding: 4px 12px; font-size: 0.8rem; color: #c4b5fd; margin-top: 8px; }

        .card { background: #161b27; border: 1px solid #1e2535; border-radius: 16px; padding: 24px; margin-bottom: 32px; }
        .card h2 { font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 16px; letter-spacing: 0.05em; text-transform: uppercase; }

        .form-row { display: flex; flex-direction: column; gap: 12px; }
        .input { background: #0e0f14; border: 1px solid #1e2535; border-radius: 10px; padding: 12px 16px; color: #e2e8f0; font-family: inherit; font-size: 0.92rem; outline: none; transition: border-color 0.2s; width: 100%; }
        .input:focus { border-color: #7c3aed; }
        .input::placeholder { color: #475569; }
        textarea.input { resize: vertical; min-height: 110px; }

        .btn { background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 0.92rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.1s; align-self: flex-end; }
        .btn:hover:not(:disabled) { opacity: 0.9; }
        .btn:active:not(:disabled) { transform: scale(0.97); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .alert { border-radius: 10px; padding: 12px 16px; font-size: 0.88rem; margin-top: 4px; }
        .alert-success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); color: #86efac; }
        .alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-title { font-size: 0.95rem; font-weight: 600; color: #e2e8f0; }
        .count-badge { background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.2); color: #a78bfa; font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 999px; }

        .msg-list { display: flex; flex-direction: column; gap: 10px; }
        .msg-item { background: #161b27; border: 1px solid #1e2535; border-radius: 12px; padding: 14px 18px; transition: border-color 0.2s; }
        .msg-item:hover { border-color: rgba(167,139,250,0.3); }
        .msg-time { font-size: 0.75rem; color: #475569; margin-bottom: 6px; }
        .msg-text { font-size: 0.92rem; color: #cbd5e1; line-height: 1.55; }

        .empty { text-align: center; color: #475569; padding: 40px 0; font-size: 0.9rem; }
        .loading { text-align: center; color: #475569; padding: 40px 0; }
        .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #1e2535; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.7s linear infinite; margin-bottom: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 520px) { .card { padding: 18px; } }
      `}</style>

      <main className="page">
        <a className="back-link" href="/f">← Semua Pesan</a>

        <div className="profile">
          <div className="avatar">{username?.[0]?.toUpperCase() ?? "?"}</div>
          <div className="profile-info">
            <h1>@{username}</h1>
            <p>Inbox Anonim Publik</p>
            <div className="sender-badge">👤 {senderName}</div>
          </div>
        </div>

        {/* ── Send Form ── */}
        <div className="card">
          <h2>Kirim Pesan ke @{username}</h2>
          <form onSubmit={handleSend}>
            <div className="form-row">
              <textarea
                id="message-input"
                className="input"
                placeholder={`Tulis pesan anonim ke @${username}... (3–2000 karakter)`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
                required
              />
              {feedback && (
                <div className={`alert ${feedback.type === "success" ? "alert-success" : "alert-error"}`}>
                  {feedback.text}
                </div>
              )}
              <button id="send-btn" className="btn" type="submit" disabled={sending || !messageText.trim()}>
                {sending ? "Mengirim..." : `Kirim ke @${username} →`}
              </button>
            </div>
          </form>
        </div>

        {/* ── Messages ── */}
        <div className="section-header">
          <span className="section-title">📬 Pesan Diterima</span>
          {!loading && <span className="count-badge">{messages.length} pesan</span>}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Memuat pesan...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty">@{username} belum punya pesan. Jadilah yang pertama! 🚀</div>
        ) : (
          <div className="msg-list">
            {messages.map((m) => (
              <div key={m.id} className="msg-item">
                <div className="msg-time">{timeAgo(m.created_at)}</div>
                <p className="msg-text">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
