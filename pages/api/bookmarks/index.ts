import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAuthUser } from "../../../lib/auth";
import { ok, fail, serverError } from "../../../lib/response";
import { fetchTitleFromUrl } from "../../../lib/fetchTitle";
import { logger } from "../../../lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // ── Auth guard ─────────────────────────────────────────────────────────────
    const user = await getAuthUser(req);
    if (!user) return fail(res, "Unauthorized.", 401);

    // ── GET /api/bookmarks ─────────────────────────────────────────────────────
    if (req.method === "GET") {
        const { is_read, limit = "50", offset = "0" } = req.query as Record<string, string>;

        let query = supabaseAdmin
            .from("bookmarks")
            .select("id, url, title, description, is_read, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        // Optional filter by read status
        if (is_read !== undefined) {
            query = query.eq("is_read", is_read === "true");
        }

        const { data, error } = await query;

        if (error) return serverError(res, error);

        return ok(res, data);
    }

    // ── POST /api/bookmarks ────────────────────────────────────────────────────
    if (req.method === "POST") {
        const { url, description } = req.body ?? {};

        if (!url || typeof url !== "string") {
            return fail(res, "url is required.");
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return fail(res, "url must be a valid URL (include https://).");
        }

        // Auto-fetch title (non-blocking — falls back to null)
        const title: string | null = await fetchTitleFromUrl(url);

        logger.info("Title fetched", { url, title: title ?? "(none)" });

        const { data: bookmark, error: insertError } = await supabaseAdmin
            .from("bookmarks")
            .insert({
                user_id: user.id,
                url: url.trim(),
                title: title ?? null,
                description: description?.trim() ?? null,
                is_read: false,
            })
            .select("id, url, title, description, is_read, created_at")
            .single();

        if (insertError) return serverError(res, insertError);

        logger.info("Bookmark created", { userId: user.id, bookmarkId: bookmark.id });

        return ok(res, bookmark, 201);
    }

    return fail(res, "Method not allowed.", 405);
}
