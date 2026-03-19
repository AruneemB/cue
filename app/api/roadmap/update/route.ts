import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { parseRoadmapData, updateNodeCompletion } from "@/lib/roadmap";
import type { RoadmapData } from "@/types/database";

const UpdateSchema = z.object({
  node_id: z.string().min(1),
  completion_pct: z.number().int().min(0).max(100),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { node_id, completion_pct } = parsed.data;

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, roadmap_data")
    .eq("github_id", session.githubId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.roadmap_data) {
    return NextResponse.json(
      { error: "No roadmap data" },
      { status: 404 }
    );
  }

  const roadmap = parseRoadmapData(user.roadmap_data as RoadmapData);
  const existingNode = roadmap.nodes.find((n) => n.id === node_id);
  if (!existingNode) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  const updated = updateNodeCompletion(roadmap, node_id, completion_pct);

  // Convert back to RoadmapData format for storage
  const updatedData: RoadmapData = {
    currentPhase: updated.name,
    goals: updated.nodes.map((node) => ({
      id: node.id,
      title: node.name,
      completed: node.status === "done",
      completion_pct: node.completion_pct,
      targetDate: node.status === "in-progress" ? "active" : undefined,
    })),
  };

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ roadmap_data: updatedData })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update roadmap:", updateError);
    return NextResponse.json(
      { error: "Failed to update roadmap" },
      { status: 500 }
    );
  }

  const updatedNode = updated.nodes.find((n) => n.id === node_id)!;
  return NextResponse.json({ node: updatedNode });
}
