import type { NextApiResponse } from "next";

export function ok(res: NextApiResponse, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res: NextApiResponse, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export function serverError(res: NextApiResponse, err: unknown) {
  const message =
    err instanceof Error ? err.message : "Internal server error";
  console.error("[ERROR]", message, err);
  return res.status(500).json({ success: false, error: message });
}
