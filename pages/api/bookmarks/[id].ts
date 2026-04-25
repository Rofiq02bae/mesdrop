import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAuthUser } from "../../../lib/auth";
import { ok, fail, serverError } from "../../../lib/response";
import { logger } from "../../../lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // ── Auth guard ─────────────────────────────────────────────────────────────
    const user = await getAuthUser(req);
    if (!user) return fail(res, "Unauthorized.", 401);

    const { id } = req.query as { id: string };

    if (!id) return fail(res, "Bookmark ID is required.", 400);

    // ── PATCH /api/bookmarks/:id ───────────────────────────────────────────────
    if (req.method === "PATCH") {
        const { title, description, is_read } = req.body ?? {};

        // Build only the fields the caller wants to update
        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = typeof title === "string" ? title.trim() : null;
        if (description !== undefined) updates.description = typeof description === "string" ? description.trim() : null;
        if (is_read !== undefined) {
            if (typeof is_read !== "boolean") {
                return fail(res, "is_read must be a boolean.");
            }
            updates.is_read = is_read;
        }

        if (Object.keys(updates).length === 0) {
            return fail(res, "No valid fields to update. Provide title, description, or is_read.");
        }

        const { data, error } = await supabaseAdmin
            .from("bookmarks")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id) // ownership check
            .select("id, url, title, description, is_read, created_at")
            .single();

        if (error) {
            if (error.code === "PGRST116") return fail(res, "Bookmark not found.", 404);
            return serverError(res, error);
        }

        logger.info("Bookmark updated", { userId: user.id, bookmarkId: id, updates });

        return ok(res, data);
    }

    // ── DELETE /api/bookmarks/:id ──────────────────────────────────────────────
    if (req.method === "DELETE") {
        const { error } = await supabaseAdmin
            .from("bookmarks")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id); // ownership check

        if (error) {
            if (error.code === "PGRST116") return fail(res, "Bookmark not found.", 404);
            return serverError(res, error);
        }

        logger.info("Bookmark deleted", { userId: user.id, bookmarkId: id });

        return ok(res, { id, deleted: true });
    }

    return fail(res, "Method not allowed.", 405);
}
