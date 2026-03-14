import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { readFile } from "fs/promises";
import path from "path";

async function extractFromBuffer(
  buffer: Buffer,
  ext: string
): Promise<{ text: string; format: "html" | "text" } | null> {
  if (ext === ".docx") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.convertToHtml({ buffer });
    if (result.value?.trim()) return { text: result.value, format: "html" };
  } else if (ext === ".doc") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    if (result.value?.trim()) return { text: result.value, format: "text" };
  } else if (ext === ".pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    if (data.text?.trim()) return { text: data.text, format: "text" };
  }
  return null;
}

function textToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  let buffer: Buffer;
  let ext: string;

  if (contentType.includes("application/json")) {
    // Extract from existing file on disk
    const body = await req.json();
    const filePath = body.filePath as string;
    if (!filePath) {
      return NextResponse.json({ error: "No filePath provided" }, { status: 400 });
    }
    ext = path.extname(filePath).toLowerCase();
    const fullPath = path.join(process.cwd(), "public", filePath);
    try {
      buffer = await readFile(fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } else {
    // Extract from uploaded file
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Failed to parse upload" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    ext = path.extname(file.name).toLowerCase();
    buffer = Buffer.from(await file.arrayBuffer());
  }

  const allowed = [".pdf", ".doc", ".docx"];
  if (!allowed.includes(ext)) {
    return NextResponse.json(
      { error: "Only PDF, DOC, and DOCX files are allowed" },
      { status: 400 }
    );
  }

  try {
    const result = await extractFromBuffer(buffer, ext);
    if (!result) {
      return NextResponse.json(
        { error: "Could not extract any content from the file" },
        { status: 400 }
      );
    }

    const content = result.format === "text" ? textToHtml(result.text) : result.text;
    return NextResponse.json({ content, format: result.format });
  } catch (err) {
    console.error("[SOW Template Extract] Error:", err);
    return NextResponse.json(
      { error: "Failed to extract file content" },
      { status: 500 }
    );
  }
}
