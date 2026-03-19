import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { parseRoadmapData, getNextSkillNode } from "@/lib/roadmap";
import { generateMicroTask } from "@/lib/ai";
import type { RoadmapData } from "@/types/database";

export async function GET() {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { error: "No roadmap data. Import one in Settings." },
      { status: 404 }
    );
  }

  const roadmap = parseRoadmapData(user.roadmap_data as RoadmapData);
  const nextNode = getNextSkillNode(roadmap);

  if (!nextNode) {
    return NextResponse.json({
      node: null,
      task: null,
      message: "All skills are either completed or not started. Update your roadmap to continue.",
    });
  }

  // Generate a micro-task for the next skill node
  const task = await generateMicroTask(nextNode.name, roadmap.name);

  return NextResponse.json({
    node: nextNode,
    task,
    roadmap_name: roadmap.name,
  });
}
