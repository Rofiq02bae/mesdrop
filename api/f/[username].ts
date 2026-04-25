import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../lib/supabase";
import { ok, fail, serverError } from "../../lib/response";
import { isRateLimited } from "../../lib/rateLimit";
import { logger } from "../../lib/logger";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow only POST
  if (req.method !== "POST") {
    return fail(res, "Method not allowed", 405);
  }

  const { username } = req.query as { username: string };

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    "unknown";

  const rateLimitKey = `feedback:${ip}:${username}`;

  if (isRateLimited(rateLimitKey)) {
    logger.warn("Rate limited", { ip, username });
    return fail(res, "Too many requests. Please wait a minute.", 429);
  }

  // ── Validate body ──────────────────────────────────────────────────────────
  const { message } = req.body ?? {};

  if (!message || typeof message !== "string") {
    return fail(res, "message is required and must be a string.");
  }

  const trimmed = message.trim();

  if (trimmed.length < 3) {
    return fail(res, "message must be at least 3 characters.");
  }

  if (trimmed.length > 2000) {
    return fail(res, "message must not exceed 2000 characters.");
  }

  // ── Look up target user ────────────────────────────────────────────────────
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (userError || !user) {
    return fail(res, `User "${username}" not found.`, 404);
  }

  // ── Insert feedback ────────────────────────────────────────────────────────
  const { data: feedback, error: insertError } = await supabaseAdmin
    .from("feedbacks")
    .insert({
      user_id: user.id,
      message: trimmed,
      is_read: false,
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    return serverError(res, insertError);
  }

  logger.info("Feedback submitted", { username, feedbackId: feedback.id });

  return ok(
    res,
    {
      id: feedback.id,
      message: "Feedback sent successfully.",
      created_at: feedback.created_at,
    },
    201
  );
}
