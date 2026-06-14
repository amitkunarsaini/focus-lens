import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth configuration.
 *
 * - Google OAuth (enabled when GOOGLE_CLIENT_ID is set).
 * - Email + password credentials. To keep local development frictionless, the
 *   credentials provider auto-provisions a user on first sign-in and validates
 *   the bcrypt hash thereafter.
 *
 * JWT session strategy is required because the credentials provider cannot use
 * database sessions.
 */

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const email = credentials.email.toLowerCase().trim();

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (!existing.password) return null;
        const ok = await bcrypt.compare(credentials.password, existing.password);
        return ok ? toAuthUser(existing) : null;
      }

      // First sign-in: provision the account.
      const hashed = await bcrypt.hash(credentials.password, 10);
      const created = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          password: hashed,
        },
      });
      return toAuthUser(created);
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

function toAuthUser(u: { id: string; email: string | null; name: string | null; image?: string | null }) {
  return { id: u.id, email: u.email, name: u.name, image: u.image ?? null };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Returns the signed-in user's id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export { getServerSession };
