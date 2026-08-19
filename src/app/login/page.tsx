import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8">
      <div className="w-10 h-10 rounded-md border border-accent flex items-center justify-center text-accent font-semibold">
        TB
      </div>
      <h1 className="text-[42px] leading-[1.05] tracking-[-0.02em] mt-5 font-medium">
        Thursday Ball
      </h1>
      <div className="hr" />
      <p className="text-[15px] mb-7 text-neutral-400">
        Runs, RSVPs, and who&apos;s paid.
        <br />
        Organizer-operated.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button type="submit" className="btn btn-secondary w-full justify-start min-h-[52px] text-[15px] gap-3">
          <span className="text-lg">G</span>
          Continue with Google
        </button>
      </form>
      <p className="text-xs mt-3.5 text-neutral-600">
        Organizers only — allowlisted Gmail accounts. Players never log in.
      </p>
    </div>
  );
}
