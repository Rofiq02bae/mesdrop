import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../lib/supabase";
import { getAuthUser } from "../../lib/auth";
import { ok, fail, serverError } from "../../lib/response";
import { logger } from "../../lib/logger";

/**
 * GET  /api/feedback          — list your feedback (newest first)
 * PATCH /api/feedback/:id     — mark single feedback as read
 *
 * Both require authentication.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req);
  if (!user) return fail(res, "Unauthorized.", 401);

  // ── GET /api/feedback ──────────────────────────────────────────────────────
  if (req.method === "GET") {
    const {
      is_read,
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    // Resolve the user's row in the `users` table from their auth UUID
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      return fail(res, "User profile not found. Ensure your user exists in the users table.", 404);
    }

    let query = supabaseAdmin
      .from("feedbacks")
      .select("id, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (is_read !== undefined) {
      query = query.eq("is_read", is_read === "true");
    }

    const { data, error } = await query;
    if (error) return serverError(res, error);

    return ok(res, data);
  }

  // ── PATCH /api/feedback — mark ALL unread as read ─────────────────────────
  if (req.method === "PATCH") {
    const { data, error } = await supabaseAdmin
      .from("feedbacks")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .select("id");

    if (error) return serverError(res, error);

    logger.info("Feedback marked as read", { userId: user.id, count: data.length });

    return ok(res, { marked_read: data.length });
  }

  return fail(res, "Method not allowed.", 405);
}
