import { useEffect, useState, useCallback } from "react";
import Head from "next/head";

// ── Random name generator ───────────────────────────────────────────────────
const ADJECTIVES = [
  "Silent", "Golden", "Mystic", "Velvet", "Neon", "Hollow", "Ancient",
  "Crimson", "Frozen", "Lunar", "Cosmic", "Drifting", "Burning", "Calm",
  "Wild", "Gentle", "Swift", "Dark", "Bright", "Clever",
];
const ANIMALS = [
  "Fox", "Panda", "Raven", "Wolf", "Owl", "Tiger", "Lynx", "Crane",
  "Falcon", "Viper", "Moth", "Stag", "Mink", "Hare", "Drake",
  "Koi", "Ibis", "Bison", "Gecko", "Finch",
];
function randomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

// ── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  message: string;
  sender_name: string;
  username: string | null;
  created_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function FeedbackWall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [senderName, setSenderName] = useState("");
  const [targetUsername, setTargetUsername] = useState("");
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Generate random name on mount
  useEffect(() => {
    setSenderName(randomName());
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/f/messages?limit=50");
      const json = await res.json();
      if (json.success) setMessages(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const recipient = targetUsername.trim() || "aas";
    if (messageText.trim().length < 3) {
      setFeedback({ type: "err", text: "Pesan minimal 3 karakter." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/f/${recipient}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText.trim(), sender_name: senderName }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "ok", text: "Pesan terkirim! 🎉" });
        setMessageText("");
        setSenderName(randomName());
        setCooldown(60);
        fetchMessages();
      } else if (res.status === 429) {
        const mins = Math.ceil(cooldown / 60) || 1;
        setFeedback({ type: "err", text: `Rate limited. Coba lagi dalam ${mins} menit.` });
        setCooldown(60);
      } else {
        setFeedback({ type: "err", text: json.error ?? "Gagal mengirim pesan." });
      }
    } catch {
      setFeedback({ type: "err", text: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Mesdrop — Feedback Wall</title>
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0f;
          --surface: #12121a;
          --border: #1e1e2e;
          --accent: #7c6af7;
          --accent2: #f7c66a;
          --text: #e8e6f0;
          --muted: #6b6880;
          --ok: #4ade80;
          --err: #f87171;
          --radius: 12px;
        }

        html, body { background: var(--bg); color: var(--text); font-family: 'DM Mono', monospace; min-height: 100vh; }

        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          background-size: 200px 200px; opacity: 0.4;
        }

        .wrap { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; padding: 48px 20px 80px; }

        .hero { margin-bottom: 48px; }
        .hero-tag { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
        .hero-title { font-family: 'Syne', sans-serif; font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 800; line-height: 1.1; color: var(--text); }
        .hero-title span { color: var(--accent2); }
        .hero-sub { margin-top: 12px; color: var(--muted); font-size: 13px; line-height: 1.6; }

        /* Form */
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; margin-bottom: 40px; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); margin-bottom: 20px; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }

        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .field label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

        input, textarea {
          background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text); font-family: 'DM Mono', monospace; font-size: 13px;
          padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.2s;
          resize: none;
        }
        input:focus, textarea:focus { border-color: var(--accent); }
        textarea { min-height: 100px; line-height: 1.6; }

        .name-row { display: flex; align-items: center; gap: 8px; }
        .name-row input { flex: 1; }
        .btn-regen {
          background: var(--border); border: 1px solid var(--border); border-radius: 8px;
          color: var(--muted); cursor: pointer; font-size: 16px; padding: 9px 12px;
          transition: all 0.15s; line-height: 1; flex-shrink: 0;
        }
        .btn-regen:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

        .btn-send {
          width: 100%; background: var(--accent); border: none; border-radius: 8px;
          color: #fff; cursor: pointer; font-family: 'Syne', sans-serif; font-size: 14px;
          font-weight: 700; letter-spacing: 0.05em; padding: 12px;
          transition: all 0.15s; margin-top: 8px;
        }
        .btn-send:hover:not(:disabled) { background: #9080ff; transform: translateY(-1px); }
        .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

        .cooldown-bar {
          height: 3px; background: var(--border); border-radius: 99px; margin-top: 10px; overflow: hidden;
        }
        .cooldown-fill {
          height: 100%; background: var(--accent2); border-radius: 99px;
          transition: width 1s linear;
        }

        .alert { border-radius: 8px; font-size: 13px; padding: 10px 14px; margin-top: 10px; }
        .alert-ok { background: #0f2a1a; border: 1px solid #166534; color: var(--ok); }
        .alert-err { background: #2a0f0f; border: 1px solid #991b1b; color: var(--err); }

        /* Messages */
        .section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; }
        .section-count { font-size: 12px; color: var(--muted); }

        .msg-list { display: flex; flex-direction: column; gap: 12px; }
        .msg-item {
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
          padding: 18px 20px; animation: fadein 0.3s ease;
          transition: border-color 0.2s;
        }
        .msg-item:hover { border-color: var(--accent); }

        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

        .msg-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .msg-sender { font-size: 12px; font-weight: 500; color: var(--accent2); }
        .msg-meta { display: flex; align-items: center; gap: 8px; }
        .msg-to { font-size: 11px; color: var(--accent); background: #1a1630; border-radius: 4px; padding: 2px 8px; }
        .msg-time { font-size: 11px; color: var(--muted); }
        .msg-body { font-size: 14px; line-height: 1.65; color: var(--text); }

        .empty { text-align: center; padding: 48px 0; color: var(--muted); font-size: 13px; }
        .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 40px auto; display: block; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="grain" />
      <div className="wrap">
        {/* Hero */}
        <div className="hero">
          <div className="hero-tag">// public feed</div>
          <h1 className="hero-title">Mesdrop <span>Wall</span></h1>
          <p className="hero-sub">Kirim pesan anonim ke siapa saja. Tanpa akun, tanpa jejak.</p>
        </div>

        {/* Form */}
        <div className="card">
          <div className="card-title">Kirim Pesan</div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="field">
                <label>Nama kamu</label>
                <div className="name-row">
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Random name"
                    maxLength={50}
                  />
                  <button type="button" className="btn-regen" onClick={() => setSenderName(randomName())} title="Random ulang">↻</button>
                </div>
              </div>
              <div className="field">
                <label>Tujuan (username)</label>
                <input
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="aas (ini bisa diedit)"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="field">
              <label>Pesan</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Tulis pesan jujur kamu di sini..."
                maxLength={2000}
              />
            </div>
            <button
              type="submit"
              className="btn-send"
              disabled={submitting || cooldown > 0}
            >
              {submitting ? "Mengirim..." : cooldown > 0 ? `Tunggu ${cooldown}s` : "Kirim Pesan →"}
            </button>
            {cooldown > 0 && (
              <div className="cooldown-bar">
                <div className="cooldown-fill" style={{ width: `${(cooldown / 60) * 100}%` }} />
              </div>
            )}
            {feedback && (
              <div className={`alert ${feedback.type === "ok" ? "alert-ok" : "alert-err"}`}>
                {feedback.text}
              </div>
            )}
          </form>
        </div>

        {/* Message wall */}
        <div>
          <div className="section-head">
            <span className="section-title">Semua Pesan</span>
            <span className="section-count">{messages.length} pesan</span>
          </div>
          {loading ? (
            <div className="spinner" />
          ) : messages.length === 0 ? (
            <div className="empty">Belum ada pesan. Jadilah yang pertama! 👋</div>
          ) : (
            <div className="msg-list">
              {messages.map((m) => (
                <div key={m.id} className="msg-item">
                  <div className="msg-header">
                    <span className="msg-sender">{m.sender_name}</span>
                    <div className="msg-meta">
                      {m.username && <span className="msg-to">→ {m.username}</span>}
                      <span className="msg-time">{timeAgo(m.created_at)}</span>
                    </div>
                  </div>
                  <div className="msg-body">{m.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
