import type { NextApiRequest } from "next";
import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Extracts and validates the Bearer token from the Authorization header.
 * Returns the authenticated user or null if invalid/missing.
 */
export async function getAuthUser(
  req: NextApiRequest
): Promise<AuthUser | null> {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return { id: user.id, email: user.email };
}
