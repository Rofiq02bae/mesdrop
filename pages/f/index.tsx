import { useState, useEffect } from "react";
import Head from "next/head";

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
  username: string | null;
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

export default function FeedbackIndex() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [senderName] = useState(() =>
    typeof window !== "undefined" ? randomName() : "Anonymous"
  );

  // form state
  const [targetUsername, setTargetUsername] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load all public messages
  useEffect(() => {
    fetch("/api/f/messages")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMessages(json.data.messages ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUsername.trim() || !messageText.trim()) return;
    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/f/${encodeURIComponent(targetUsername.trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", text: "Message sent! 🎉" });
        setMessageText("");
        setTargetUsername("");
        // Refresh list
        fetch("/api/f/messages")
          .then((r) => r.json())
          .then((j) => { if (j.success) setMessages(j.data.messages ?? []); });
      } else {
        setFeedback({ type: "error", text: json.error ?? "Something went wrong." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Head>
        <title>Mesdrop — Anonymous Messages</title>
        <meta name="description" content="Send and browse anonymous messages on Mesdrop." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0f14; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }

        .page { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; }

        .hero { text-align: center; margin-bottom: 48px; }
        .hero h1 { font-size: 2.2rem; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero p { margin-top: 8px; color: #94a3b8; font-size: 0.95rem; }

        .sender-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.25); border-radius: 999px; padding: 6px 14px; font-size: 0.82rem; color: #c4b5fd; margin-top: 14px; }
        .sender-badge::before { content: '👤'; }

        .card { background: #161b27; border: 1px solid #1e2535; border-radius: 16px; padding: 28px; margin-bottom: 32px; }
        .card h2 { font-size: 1rem; font-weight: 600; color: #94a3b8; margin-bottom: 18px; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.78rem; }

        .form-row { display: flex; flex-direction: column; gap: 12px; }
        .input { background: #0e0f14; border: 1px solid #1e2535; border-radius: 10px; padding: 12px 16px; color: #e2e8f0; font-family: inherit; font-size: 0.92rem; outline: none; transition: border-color 0.2s; width: 100%; }
        .input:focus { border-color: #7c3aed; }
        .input::placeholder { color: #475569; }
        textarea.input { resize: vertical; min-height: 100px; }

        .btn { background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 0.92rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.1s; align-self: flex-end; }
        .btn:hover:not(:disabled) { opacity: 0.9; }
        .btn:active:not(:disabled) { transform: scale(0.97); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .alert { border-radius: 10px; padding: 12px 16px; font-size: 0.88rem; margin-top: 4px; }
        .alert-success { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); color: #86efac; }
        .alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; }

        .msg-list { display: flex; flex-direction: column; gap: 12px; }
        .msg-item { background: #161b27; border: 1px solid #1e2535; border-radius: 12px; padding: 16px 20px; transition: border-color 0.2s; }
        .msg-item:hover { border-color: rgba(167,139,250,0.3); }
        .msg-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .msg-to { font-size: 0.78rem; font-weight: 600; color: #a78bfa; background: rgba(167,139,250,0.1); padding: 2px 8px; border-radius: 999px; }
        .msg-time { font-size: 0.75rem; color: #475569; }
        .msg-text { font-size: 0.92rem; color: #cbd5e1; line-height: 1.55; }

        .empty { text-align: center; color: #475569; padding: 40px 0; font-size: 0.9rem; }
        .loading { text-align: center; color: #475569; padding: 40px 0; }
        .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #1e2535; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.7s linear infinite; margin-bottom: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .section-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; }
        .count-badge { background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.2); color: #a78bfa; font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 999px; }

        @media (max-width: 520px) { .hero h1 { font-size: 1.7rem; } .card { padding: 20px; } }
      `}</style>

      <main className="page">
        <div className="hero">
          <h1>✉️ Mesdrop</h1>
          <p>Kirim pesan anonim ke siapapun. Jujur, bebas, aman.</p>
          <div className="sender-badge">Kamu tampil sebagai: <strong>{senderName}</strong></div>
        </div>

        {/* ── Send Form ── */}
        <div className="card">
          <h2>Kirim Pesan Anonim</h2>
          <form onSubmit={handleSend}>
            <div className="form-row">
              <input
                id="target-username"
                className="input"
                type="text"
                placeholder="Username tujuan (e.g. johndoe)"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                disabled={sending}
                autoComplete="off"
                required
              />
              <textarea
                id="message-text"
                className="input"
                placeholder="Tulis pesanmu di sini... (3–2000 karakter)"
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
              <button id="send-btn" className="btn" type="submit" disabled={sending || !targetUsername.trim() || !messageText.trim()}>
                {sending ? "Mengirim..." : "Kirim Pesan →"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Messages Feed ── */}
        <div className="section-header">
          <span className="section-title">📬 Pesan Publik</span>
          {!loading && <span className="count-badge">{messages.length} pesan</span>}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Memuat pesan...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty">Belum ada pesan. Jadilah yang pertama! 🚀</div>
        ) : (
          <div className="msg-list">
            {messages.map((m) => (
              <div key={m.id} className="msg-item">
                <div className="msg-meta">
                  <a href={`/f/${m.username}`} style={{ textDecoration: "none" }}>
                    <span className="msg-to">@{m.username ?? "unknown"}</span>
                  </a>
                  <span className="msg-time">{timeAgo(m.created_at)}</span>
                </div>
                <p className="msg-text">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
