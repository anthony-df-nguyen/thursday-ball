import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">🏀 Thursday Ball</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Organizer login only. Sign in with the Google account on the
          allowlist.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white active:scale-95"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
