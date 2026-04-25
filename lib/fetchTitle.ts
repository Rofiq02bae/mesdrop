/**
 * Fetches the <title> tag from a given URL.
 * Returns null on any failure — caller treats title as optional.
 */
export async function fetchTitleFromUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PersonalInboxBot/1.0 (bookmark-fetcher)" },
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    // Read only the first 20KB — enough to find <title>
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    let bytesRead = 0;
    const maxBytes = 20_000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      if (html.includes("</title>")) break;
    }

    reader.cancel();

    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim().slice(0, 255) : null;
  } catch {
    return null;
  }
}
