import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider === "google" && Boolean(profile && "email_verified" in profile && profile.email_verified === true);
    },
    async jwt({ token, account }) {
      if (account) token.mode = "google";
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.mode = token.mode ?? "google";
      return session;
    },
  },
};
