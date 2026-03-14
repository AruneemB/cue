import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">Welcome to Cue</h1>
      <p className="text-foreground/60">Your hourly signal to keep building.</p>
      <Link href="/login" className={buttonVariants({ size: "lg", className: "mt-4" })}>
        Get Started
      </Link>
    </div>
  );
}
