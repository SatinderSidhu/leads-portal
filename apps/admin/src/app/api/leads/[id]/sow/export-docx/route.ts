import { NextResponse } from "next/server";
import htmlToDocx from "html-to-docx";

export async function POST(req: Request) {
  let body: { content: string; projectName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body.content}</body></html>`;

  try {
    const buffer = await htmlToDocx(wrappedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    const fileName = body.projectName
      ? `SOW - ${body.projectName}.docx`
      : "Scope-of-Work.docx";

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(Buffer.from(buffer)));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("[DOCX Export] Failed:", err);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
