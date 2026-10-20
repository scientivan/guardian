import type { Session } from "next-auth";
import { ApiError } from "./errors";

/** Evaluated on every request. A JWT role or a demo identity never grants admin access. */
export function isAdmin(session: Session | null): boolean {
  if (session?.user.mode !== "google" || !session.user.email) return false;
  const emails = (process.env.GUARDIAN_ADMIN_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return emails.includes(session.user.email.trim().toLowerCase());
}

export function requireAdmin(session: Session | null): asserts session is Session {
  if (!session?.user.id) throw new ApiError("Sign in with your Google account to continue.", 401);
  if (!isAdmin(session)) throw new ApiError("This account does not have hospital administrator access.", 403);
}
