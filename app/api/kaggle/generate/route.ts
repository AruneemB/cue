import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { generateQuantIdea, sampleTheme } from "@/lib/ai";

const GenerateSchema = z.object({
  theme: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve user UUID
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Parse optional theme from body
  let theme: string | undefined;
  try {
    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);
    if (parsed.success) theme = parsed.data.theme;
  } catch {
    // no body is fine — we'll pick a random theme
  }

  const selectedTheme = theme ?? sampleTheme();
  const idea = await generateQuantIdea(selectedTheme);

  if (!idea) {
    return NextResponse.json(
      { error: "Failed to generate idea. Try again." },
      { status: 502 }
    );
  }

  // Persist to kaggle_ideas table
  const { data: saved, error: insertError } = await supabaseAdmin
    .from("kaggle_ideas")
    .insert({
      user_id: user.id,
      title: idea.title,
      hypothesis: idea.hypothesis,
      dataset: idea.dataset,
      methodology: idea.methodology,
      eval_metric: idea.eval_metric,
      difficulty: idea.difficulty,
      tags: [selectedTheme],
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to persist idea:", insertError);
    // Still return the idea even if persistence fails
    return NextResponse.json({ idea, persisted: false });
  }

  return NextResponse.json({ idea: saved, persisted: true });
}
