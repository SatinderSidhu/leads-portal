import { prisma } from "@leads-portal/database";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const body = await req.json();
  const { mode, message } = body as { mode: "visual" | "requirements"; message?: string };

  try {
    const project = await prisma.appFactoryProject.findUnique({
      where: { publicId },
      include: { flows: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const latestFlow = project.flows[0];
    const conversationHistory = (latestFlow?.aiConversationHistory as { role: string; content: string }[]) || [];

    if (mode === "requirements") {
      return generateRequirements(project, conversationHistory, message);
    } else {
      return generateVisual(project, conversationHistory, message);
    }
  } catch (error) {
    console.error("Generate flow error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

async function generateRequirements(
  project: { id: string; idea: string; platforms: unknown; keyFeatures: unknown },
  history: { role: string; content: string }[],
  userMessage?: string
) {
  const systemPrompt = `You are an expert product manager and requirements analyst at KITLabs, a mobile and web app development company.

Your job is to take a customer's app idea and produce a structured, detailed scope of work organized by feature.

Output format — return ONLY valid JSON with this structure:
{
  "appName": "Suggested app name",
  "summary": "One-paragraph executive summary",
  "features": [
    {
      "id": "F1",
      "name": "Feature name",
      "description": "What this feature does",
      "screens": ["Screen 1", "Screen 2"],
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "priority": "P0" | "P1" | "P2",
      "estimatedComplexity": "Low" | "Medium" | "High"
    }
  ],
  "techStack": ["React Native", "Node.js", ...],
  "estimatedTimeline": "X weeks",
  "platforms": ["iOS", "Android"]
}

Be thorough — include auth, onboarding, core features, settings, notifications, payments if relevant. Mark priorities: P0 = must-have for launch, P1 = important, P2 = nice-to-have.

If the user asks to modify requirements, return the FULL updated JSON (not just the diff).`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userMessage || `Here is the app idea:\n\n${project.idea}\n\nPlatforms: ${JSON.stringify(project.platforms)}\n\nPlease generate a detailed scope of work organized by feature.` },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages,
  });

  const content = response.content[0];
  const text = content.type === "text" ? content.text : "";

  // Parse the JSON from the response
  let requirements = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) requirements = JSON.parse(jsonMatch[0]);
  } catch {
    requirements = { raw: text };
  }

  // Update conversation history
  const newHistory = [
    ...history,
    { role: "user", content: userMessage || project.idea },
    { role: "assistant", content: text },
  ];

  // Save or update flow
  const latestFlow = await prisma.appFactoryFlow.findFirst({
    where: { projectId: project.id },
    orderBy: { version: "desc" },
  });

  if (latestFlow && !latestFlow.isFinalized) {
    await prisma.appFactoryFlow.update({
      where: { id: latestFlow.id },
      data: { requirements: requirements as Prisma.InputJsonValue, aiConversationHistory: newHistory as unknown as Prisma.InputJsonValue },
    });
  } else {
    await prisma.appFactoryFlow.create({
      data: {
        projectId: project.id,
        version: (latestFlow?.version || 0) + 1,
        requirements: requirements as Prisma.InputJsonValue,
        aiConversationHistory: newHistory as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Update project status
  await prisma.appFactoryProject.update({
    where: { id: project.id },
    data: { status: "DESIGNING" },
  });

  return NextResponse.json({ requirements, conversationHistory: newHistory });
}

async function generateVisual(
  project: { id: string; idea: string; platforms: unknown },
  history: { role: string; content: string }[],
  userMessage?: string
) {
  // Stitch SDK integration placeholder
  // In production: import { stitch } from "@google/stitch-sdk"
  // For now: use Claude to generate screen descriptions that we can render or pass to Stitch later

  const systemPrompt = `You are an expert mobile app UI designer at KITLabs.

Given an app idea, generate a list of screens with descriptions of their UI layout and elements. Each interactive element should include a "navigateTo" field with the target screen ID so customers can click through screens like a real app prototype.

Output format — return ONLY valid JSON:
{
  "appName": "Suggested app name",
  "screens": [
    {
      "id": "S1",
      "name": "Screen name (e.g. Login, Dashboard, Profile)",
      "description": "Brief description of this screen's purpose",
      "elements": [
        { "type": "nav-bar", "content": "App Name" },
        { "type": "heading", "content": "Welcome back" },
        { "type": "input", "placeholder": "Email address" },
        { "type": "input", "placeholder": "Password" },
        { "type": "button", "content": "Sign In", "navigateTo": "S2" },
        { "type": "button-outline", "content": "Create Account", "navigateTo": "S3" },
        { "type": "text", "content": "Forgot password?" }
      ],
      "connections": ["S2", "S3"]
    }
  ]
}

Element types: nav-bar, heading, text, input, button, button-outline, image, avatar, search, card, list, tab-bar, toggle, divider, checkbox, radio, social-login, map

For interactive elements (buttons, button-outline, card, list items), add a "navigateTo" field with the target screen's ID. This enables an interactive prototype where customers click through screens like a real app. Only add navigateTo to elements that would logically trigger navigation — inputs, text, images, toggles, dividers don't navigate.

Generate 5-8 screens covering the core user journey. If the user requests changes, return the FULL updated screen list.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userMessage || `Here is the app idea:\n\n${project.idea}\n\nPlatforms: ${JSON.stringify(project.platforms)}\n\nPlease design the key screens for this app.` },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages,
  });

  const content = response.content[0];
  const text = content.type === "text" ? content.text : "";

  let screens: unknown[] = [];
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      screens = parsed.screens || [];
    }
  } catch {
    screens = [];
  }

  const newHistory = [
    ...history,
    { role: "user", content: userMessage || project.idea },
    { role: "assistant", content: text },
  ];

  // Save or update flow
  const latestFlow = await prisma.appFactoryFlow.findFirst({
    where: { projectId: project.id },
    orderBy: { version: "desc" },
  });

  if (latestFlow && !latestFlow.isFinalized) {
    await prisma.appFactoryFlow.update({
      where: { id: latestFlow.id },
      data: { screens: screens as unknown as Prisma.InputJsonValue, aiConversationHistory: newHistory as unknown as Prisma.InputJsonValue },
    });
  } else {
    await prisma.appFactoryFlow.create({
      data: {
        projectId: project.id,
        version: (latestFlow?.version || 0) + 1,
        screens: screens as unknown as Prisma.InputJsonValue,
        aiConversationHistory: newHistory as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.appFactoryProject.update({
    where: { id: project.id },
    data: { status: "DESIGNING" },
  });

  return NextResponse.json({ screens, conversationHistory: newHistory });
}
