import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureSchema, getDb } from "@/lib/db";
import { DEMO_USERS, seedDemoUsers } from "@/lib/db/seed";
import { authorityMemberships, users } from "@/lib/db/schema";
import type { UserRole, WorkspaceAudience } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
    assignedDistricts: string[];
    assignedProvinces: string[];
    audience: WorkspaceAudience | null;
    authorityId: string | null;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: UserRole;
      assignedDistricts: string[];
      assignedProvinces: string[];
      audience: WorkspaceAudience | null;
      authorityId: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    assignedDistricts: string[];
    assignedProvinces: string[];
    audience: WorkspaceAudience | null;
    authorityId: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  // The legacy field name remains `pin` for compatibility; production uses passwords.
  pin: z.string().min(4).max(64),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        pin: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        await ensureSchema();
        if (
          process.env.ALLOW_DEMO_USERS === "true" ||
          process.env.NODE_ENV !== "production"
        ) {
          await seedDemoUsers();
        }
        const db = await getDb();
        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email.toLowerCase()))
          .limit(1);
        const user = found[0];
        if (!user || user.disabledAt) return null;
        if (
          process.env.NODE_ENV === "production" &&
          process.env.ALLOW_DEMO_USERS !== "true" &&
          DEMO_USERS.some((demo) => demo.id === user.id)
        ) {
          return null;
        }
        const ok = await compare(parsed.data.pin, user.pinHash);
        if (!ok) return null;
        const [membership] = await db
          .select()
          .from(authorityMemberships)
          .where(eq(authorityMemberships.userId, user.id))
          .limit(1);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          assignedDistricts: (user.assignedDistricts as string[]) ?? [],
          assignedProvinces: (user.assignedProvinces as string[]) ?? [],
          audience: (user.audience as WorkspaceAudience | null) ?? null,
          authorityId: membership?.authorityId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.assignedDistricts = user.assignedDistricts;
        token.assignedProvinces = user.assignedProvinces;
        token.audience = user.audience;
        token.authorityId = user.authorityId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.assignedDistricts = token.assignedDistricts ?? [];
      session.user.assignedProvinces = token.assignedProvinces ?? [];
      session.user.audience = token.audience ?? null;
      session.user.authorityId = token.authorityId ?? null;
      return session;
    },
  },
});
