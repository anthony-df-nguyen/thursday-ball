import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users, regulars } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Organizer-only auth (see PRD §3): sign-in is gated by a comma-separated
 * allowlist of Gmail addresses in ORGANIZER_EMAILS. Anyone else's Google
 * login is rejected. On first successful sign-in for an allowlisted email,
 * we create their `users` row and a matching `regulars` row (flagged
 * isOrganizer) so they also show up as a player on the roster.
 */
function getOrganizerEmails(): string[] {
  const raw = process.env.ORGANIZER_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const organizerEmails = getOrganizerEmails();
      if (!organizerEmails.includes(email)) {
        return false; // not on the allowlist -> reject
      }

      // Upsert the user record.
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      let userId = existing?.id;
      if (!existing) {
        const [created] = await db
          .insert(users)
          .values({ email, name: user.name, image: user.image })
          .returning();
        userId = created.id;
      }

      // Ensure they also exist as a Regular (organizer flag) so they can
      // be added to events like any other player.
      if (userId) {
        const existingRegular = await db.query.regulars.findFirst({
          where: eq(regulars.userId, userId),
        });
        if (!existingRegular) {
          await db.insert(regulars).values({
            name: user.name ?? email,
            isOrganizer: true,
            userId,
          });
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email.toLowerCase()),
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
