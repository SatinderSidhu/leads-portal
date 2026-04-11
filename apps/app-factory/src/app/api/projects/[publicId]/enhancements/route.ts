import { prisma } from "@leads-portal/database";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "../../../../../lib/session";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  try {
    const project = await prisma.appFactoryProject.findUnique({ where: { publicId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const enhancements = await prisma.appFactoryEnhancement.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: { build: { select: { version: true, status: true } } },
    });
    return NextResponse.json(enhancements);
  } catch (error) {
    console.error("Failed to fetch enhancements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { publicId } = await params;
  try {
    const project = await prisma.appFactoryProject.findUnique({
      where: { publicId },
      include: {
        flows: { orderBy: { version: "desc" }, take: 1 },
        builds: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    const { description } = body as { description?: string };

    if (!description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Generate AI diff — show what changes based on the enhancement request
    const latestFlow = project.flows[0];
    const currentScreens = (latestFlow?.screens || []) as { id: string; name: string; description: string }[];
    const currentRequirements = (latestFlow?.requirements || {}) as { features?: { name: string }[] };

    const screenSummary = currentScreens.map((s) => `- ${s.name}: ${s.description}`).join("\n");
    const featureSummary = currentRequirements.features?.map((f) => `- ${f.name}`).join("\n") || "None";

    let aiDiff = null;
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `You are a product analyst. Given the current app screens and features, and a customer's enhancement request, generate a brief impact analysis.

Output ONLY valid JSON:
{
  "summary": "One-line summary of the change",
  "impactedScreens": [
    { "screen": "Screen Name", "change": "What changes on this screen" }
  ],
  "newScreens": [
    { "name": "New Screen Name", "description": "What this screen does" }
  ],
  "removedScreens": [],
  "impactedFeatures": [
    { "feature": "Feature Name", "change": "How this feature is affected" }
  ],
  "newFeatures": [
    { "name": "New Feature", "description": "What it does", "priority": "P0|P1|P2" }
  ],
  "estimatedEffort": "Low|Medium|High",
  "risks": ["Any risk or consideration"]
}`,
        messages: [{
          role: "user",
          content: `Current screens:\n${screenSummary}\n\nCurrent features:\n${featureSummary}\n\nEnhancement request:\n${description.trim()}\n\nAnalyze the impact.`,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) aiDiff = JSON.parse(jsonMatch[0]);
    } catch (aiError) {
      console.error("AI diff generation failed:", aiError);
    }

    const enhancement = await prisma.appFactoryEnhancement.create({
      data: {
        projectId: project.id,
        buildId: project.builds[0]?.id || null,
        description: description.trim(),
        aiDiff: aiDiff as unknown as Prisma.InputJsonValue,
        status: "REQUESTED",
      },
    });

    // Update project status
    await prisma.appFactoryProject.update({
      where: { id: project.id },
      data: { status: "ENHANCING" },
    });

    return NextResponse.json(enhancement, { status: 201 });
  } catch (error) {
    console.error("Failed to create enhancement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
