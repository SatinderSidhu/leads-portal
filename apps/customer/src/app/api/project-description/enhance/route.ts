import { NextResponse } from "next/server";
import { prisma } from "@leads-portal/database";
import Anthropic from "@anthropic-ai/sdk";
import { getCustomerSession } from "../../../../lib/session";

export async function POST(req: Request) {
  const session = await getCustomerSession();
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

  let body: { leadId: string; additionalNotes: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.leadId || !body.additionalNotes?.trim()) {
    return NextResponse.json(
      { error: "leadId and additionalNotes are required" },
      { status: 400 }
    );
  }

  // Verify lead access
  if (!session.leadIds.includes(body.leadId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: body.leadId },
    select: { projectName: true, projectDescription: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const systemPrompt = `You are a product consultant helping a customer refine their project description for a software development company (KITLabs Inc).

Your job: Take the existing project description and the customer's additional thoughts, then produce a clear, well-structured enhanced project description.

Rules:
- Focus on quality over quantity — be concise but comprehensive
- Break down features into clear, distinct items
- Use plain language, no jargon
- Keep the customer's voice and intent
- Structure with short paragraphs or bullet points for features
- Do NOT add features the customer hasn't mentioned or implied
- Do NOT include pricing, timelines, or technical implementation details
- Output ONLY the enhanced description text, no preamble or commentary`;

  const userPrompt = `Project name: ${lead.projectName}

Current project description:
${lead.projectDescription}

Customer's additional thoughts:
${body.additionalNotes.trim()}

Please produce an enhanced project description that incorporates everything above into a clear, well-organized description.`;

  const client = new Anthropic({ apiKey });

  let stream;
  try {
    stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Description Enhance] API error:", message);
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
        console.error("[Description Enhance] Stream error:", message);
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
