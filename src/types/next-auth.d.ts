import type { DefaultSession } from "next-auth";
import type { AccountMode } from "@/lib/workspace";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; mode: AccountMode };
  }
}
declare module "next-auth/jwt" {
  interface JWT { mode?: AccountMode }
}
