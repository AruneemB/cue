import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GITHUB_API = "https://api.github.com";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo");
  if (!repo) {
    return NextResponse.json(
      { error: "Missing 'repo' query parameter (full_name)" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${repo}/commits?per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!res.ok) {
      console.error("GitHub commits API error:", res.status);
      return NextResponse.json(
        { error: `GitHub API responded with ${res.status}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const commits: GitHubCommit[] = await res.json();

    const formatted = commits.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
    }));

    return NextResponse.json({ commits: formatted });
  } catch (err) {
    console.error("Failed to fetch commits:", err);
    return NextResponse.json(
      { error: "Failed to fetch commits" },
      { status: 502 }
    );
  }
}
