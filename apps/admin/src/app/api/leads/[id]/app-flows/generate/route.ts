import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAdminSession } from "../../../../../../lib/session";
import { buildAppFlowPrompt } from "../../../../../../lib/app-flow-prompt";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 }
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      projectName: true,
      customerName: true,
      projectDescription: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  let body: {
    appType?: string;
    flowType?: "BASIC" | "WIREFRAME";
    additionalNotes?: string;
    projectDescription?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { system, user } = buildAppFlowPrompt({
    projectName: lead.projectName,
    customerName: lead.customerName,
    projectDescription: body.projectDescription || lead.projectDescription,
    appType: body.appType || "",
    flowType: body.flowType || "BASIC",
    additionalNotes: body.additionalNotes || "",
  });

  const client = new Anthropic({ apiKey });

  let stream;
  try {
    stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[App Flow Generate] API error:", message);
    return NextResponse.json(
      { error: `AI generation failed: ${message}` },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event.delta.text)}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        console.error("[App Flow Generate] Stream error:", message);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(`[ERROR] ${message}`)}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
