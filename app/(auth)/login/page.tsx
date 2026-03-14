import { Github } from "lucide-react";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
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
          <Button type="submit" size="lg">
            <Github size={18} />
            Sign in with GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}
