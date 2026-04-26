import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../lib/supabase";
import { ok, fail, serverError } from "../../lib/response";

/**
 * GET /api/f/messages
 * Public — returns all feedback (no auth required).
 * Query params:
 *   limit   (default 50, max 100)
 *   offset  (default 0)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return fail(res, "Method not allowed", 405);
  }

  const {
    limit: rawLimit = "50",
    offset: rawOffset = "0",
  } = req.query as Record<string, string>;

  const limit = Math.min(Math.max(Number(rawLimit) || 50, 1), 100);
  const offset = Math.max(Number(rawOffset) || 0, 0);

  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select(
      "id, message, is_read, created_at, users!inner(username)"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return serverError(res, error);

  // Flatten: surface username at the top level
  const messages = (data ?? []).map((row: any) => ({
    id: row.id,
    username: row.users?.username ?? null,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at,
  }));

  return ok(res, { messages, limit, offset });
}
