import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { ok, fail, serverError } from "@/lib/response";

/**
 * GET /api/f/messages
 * Public endpoint — returns all feedback across all users (message only, no user PII).
 * Supports: ?limit=50&offset=0&username=johndoe
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return fail(res, "Method not allowed.", 405);

  const {
    limit = "30",
    offset = "0",
    username,
  } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from("feedbacks")
    .select(`
      id,
      message,
      sender_name,
      created_at,
      username
    `)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  // Optional filter by username
  if (username) {
    query = query.eq("username", username);
  }

  const { data, error } = await query;

  if (error) return serverError(res, error);

  // Shape: remove nested user object, expose username flat
  const shaped = (data ?? []).map((row: any) => ({
    id: row.id,
    message: row.message,
    sender_name: row.sender_name ?? "Anonymous",
    username: row.username ?? null,
    created_at: row.created_at,
  }));

  return ok(res, shaped);
}
