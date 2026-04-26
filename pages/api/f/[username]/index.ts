import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { ok, fail, serverError } from "@/lib/response";
import { isRateLimited, getRateLimitTTL } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return fail(res, "Method not allowed.", 405);

  const { username } = req.query as { username: string };
  const targetUsername = typeof username === "string" && username.trim().length > 0 ? username.trim() : "aas";

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? "unknown";

  const rateLimitKey = `feedback:${ip}`;

  if (isRateLimited(rateLimitKey)) {
    const ttl = getRateLimitTTL(rateLimitKey);
    logger.warn("Rate limited", { ip, username: targetUsername });
    return fail(
      res,
      `Terlalu banyak pesan. Coba lagi dalam ${Math.ceil(ttl / 60)} menit.`,
      429
    );
  }

  const { message, sender_name } = req.body ?? {};

  if (!message || typeof message !== "string") {
    return fail(res, "message wajib diisi.");
  }

  const trimmedSenderName =
    typeof sender_name === "string" && sender_name.trim().length > 0
      ? sender_name.trim().slice(0, 100)
      : null;

  const trimmed = message.trim();
  if (trimmed.length < 3) return fail(res, "Pesan minimal 3 karakter.");
  if (trimmed.length > 2000) return fail(res, "Pesan maksimal 2000 karakter.");

  const { data: feedback, error: insertError } = await supabaseAdmin
    .from("feedbacks")
    .insert({
      username: targetUsername,
      message: trimmed,
      sender_name: trimmedSenderName,
      is_read: false,
    })
    .select("id, created_at")
    .single();

  if (insertError) return serverError(res, insertError);

  logger.info("Feedback submitted", { username: targetUsername, feedbackId: feedback.id });

  return ok(
    res,
    {
      id: feedback.id,
      message: "Pesan berhasil dikirim!",
      created_at: feedback.created_at,
    },
    201
  );
}
