import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureSchema, getDb } from "@/lib/db";
import { seedDemoUsers } from "@/lib/db/seed";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: UserRole;
    assignedDistricts: string[];
    assignedProvinces: string[];
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: UserRole;
      assignedDistricts: string[];
      assignedProvinces: string[];
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    assignedDistricts: string[];
    assignedProvinces: string[];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  // Demo PIN is alphanumeric + punctuation (e.g. Zim2026!)
  pin: z.string().min(4).max(64),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "PIN",
      credentials: {
        email: { label: "Email", type: "email" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        await ensureSchema();
        await seedDemoUsers();
        const db = await getDb();
        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email.toLowerCase()))
          .limit(1);
        const user = found[0];
        if (!user) return null;
        const ok = await compare(parsed.data.pin, user.pinHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          assignedDistricts: (user.assignedDistricts as string[]) ?? [],
          assignedProvinces: (user.assignedProvinces as string[]) ?? [],
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
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.assignedDistricts = token.assignedDistricts ?? [];
      session.user.assignedProvinces = token.assignedProvinces ?? [];
      return session;
    },
  },
});
