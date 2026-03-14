import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { supabaseAdmin } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "repo user:email" } },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!profile?.id || !account) return false;

      const githubId = String(profile.id);
      const { error } = await supabaseAdmin.from("users").upsert(
        {
          github_id: githubId,
          email: user.email ?? null,
          github_token: account.access_token ?? null,
        },
        { onConflict: "github_id" }
      );

      if (error) {
        console.error("Failed to upsert user:", error);
        return false;
      }

      return true;
    },
    jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile?.id) {
        token.githubId = String(profile.id);
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.githubId = token.githubId as string;
      return session;
    },
  },
});
