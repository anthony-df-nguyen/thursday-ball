import { vi } from "vitest";

// Server actions call these Next.js internals, which need a request context.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: process.env.TEST_USER_ID } })),
}));
