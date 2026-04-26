import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../../lib/supabase";
import { ok, fail, serverError } from "../../../lib/response";

/**
 * GET /api/f/[username]/messages
 * Public — returns feedback for a specific username (no auth required).
 * Query params:
 *   limit   (default 50, max 100)
 *   offset  (default 0)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return fail(res, "Method not allowed", 405);
  }

  const { username } = req.query as { username: string };

  if (!username) {
    return fail(res, "username is required.", 400);
  }

  const {
    limit: rawLimit = "50",
    offset: rawOffset = "0",
  } = req.query as Record<string, string>;

  const limit = Math.min(Math.max(Number(rawLimit) || 50, 1), 100);
  const offset = Math.max(Number(rawOffset) || 0, 0);

  // Resolve user
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (userError || !user) {
    return fail(res, `User "${username}" not found.`, 404);
  }

  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("id, message, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return serverError(res, error);

  return ok(res, { username, messages: data ?? [], limit, offset });
}
