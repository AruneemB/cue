import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-4xl font-bold">Welcome to Cue</h1>
      <p className="text-foreground/60">Your hourly signal to keep building.</p>
      <Link
        href="/dashboard"
        className="mt-4 rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
