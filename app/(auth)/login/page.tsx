import { Github } from "lucide-react";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold">Welcome to Cue</h1>
        <p className="text-foreground/60 max-w-sm">
          Your hourly signal to keep building. Sign in with GitHub to track your
          coding activity.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Github size={18} />
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  );
}
