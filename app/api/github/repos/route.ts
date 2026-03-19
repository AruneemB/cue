import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTopScoredRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repos = await getTopScoredRepos(session.accessToken);
    return NextResponse.json({ repos });
  } catch (err) {
    console.error("Failed to fetch scored repos:", err);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 502 }
    );
  }
}
