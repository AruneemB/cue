import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";

export async function GET(req: NextRequest) {
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

  // Pagination
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;

  // Optional filter by saved status
  const savedOnly = searchParams.get("saved") === "true";

  let query = supabaseAdmin
    .from("kaggle_ideas")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (savedOnly) {
    query = query.eq("saved", true);
  }

  const { data: ideas, error: queryError, count } = await query;

  if (queryError) {
    console.error("Failed to fetch ideas:", queryError);
    return NextResponse.json(
      { error: "Failed to fetch ideas" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ideas: ideas ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  saved: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { id, saved } = parsed.data;

  const { error: updateError } = await supabaseAdmin
    .from("kaggle_ideas")
    .update({ saved })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to update idea:", updateError);
    return NextResponse.json(
      { error: "Failed to update idea" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, saved });
}
