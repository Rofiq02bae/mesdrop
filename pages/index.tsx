export default function HomePage() {
    return (
        <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 840, margin: "40px auto", lineHeight: 1.6 }}>
            <h1>Personal Inbox API (Next.js)</h1>
            <p>Backend API aktif melalui route berikut:</p>
            <ul>
                <li><code>/api/f/[username]</code> (POST)</li>
                <li><code>/api/bookmarks</code> (GET, POST)</li>
                <li><code>/api/bookmarks/[id]</code> (PATCH, DELETE)</li>
                <li><code>/api/feedback</code> (GET, PATCH)</li>
            </ul>
        </main>
    );
}
