import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { readFile } from "fs/promises";
import path from "path";
import { createRequire } from "node:module";

// Use createRequire to load native Node packages at runtime,
// preventing turbopack from bundling/mangling them
const _require = createRequire(import.meta.url);

async function extractFromBuffer(
  buffer: Buffer,
  ext: string
): Promise<{ text: string; format: "html" | "text" } | null> {
  console.log(`[Extract] extractFromBuffer called: ext=${ext}, bufferSize=${buffer.length}`);

  if (ext === ".docx") {
    console.log("[Extract] Loading mammoth for DOCX...");
    const mammoth = _require("mammoth");
    console.log("[Extract] mammoth loaded, type:", typeof mammoth, "keys:", Object.keys(mammoth));
    const result = await mammoth.convertToHtml({ buffer });
    console.log("[Extract] mammoth result: valueLength=", result.value?.length, "messages=", result.messages?.length);
    if (result.value?.trim()) return { text: result.value, format: "html" };
    console.log("[Extract] mammoth returned empty value");
  } else if (ext === ".doc") {
    console.log("[Extract] Loading mammoth for DOC...");
    const mammoth = _require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    console.log("[Extract] mammoth extractRawText result: valueLength=", result.value?.length);
    if (result.value?.trim()) return { text: result.value, format: "text" };
    console.log("[Extract] mammoth returned empty value for DOC");
  } else if (ext === ".pdf") {
    console.log("[Extract] Loading pdf-parse for PDF...");
    const pdfParse = _require("pdf-parse");
    console.log("[Extract] pdf-parse loaded, type:", typeof pdfParse);
    const data = await pdfParse(buffer);
    console.log("[Extract] pdf-parse result: textLength=", data.text?.length, "numpages=", data.numpages);
    if (data.text?.trim()) return { text: data.text, format: "text" };
    console.log("[Extract] pdf-parse returned empty text");
  } else {
    console.log("[Extract] Unsupported extension:", ext);
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
  console.log("[Extract] POST request received");
  console.log("[Extract] Content-Type:", req.headers.get("content-type"));

  const session = await getAdminSession();
  if (!session) {
    console.log("[Extract] Unauthorized - no session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[Extract] Authenticated as:", session.name);

  const contentType = req.headers.get("content-type") || "";
  let buffer: Buffer;
  let ext: string;

  if (contentType.includes("application/json")) {
    console.log("[Extract] JSON mode - extracting from existing file path");
    const body = await req.json();
    const filePath = body.filePath as string;
    console.log("[Extract] filePath:", filePath);
    if (!filePath) {
      return NextResponse.json({ error: "No filePath provided" }, { status: 400 });
    }
    ext = path.extname(filePath).toLowerCase();
    const fullPath = path.join(process.cwd(), "public", filePath);
    console.log("[Extract] fullPath:", fullPath);
    try {
      buffer = await readFile(fullPath);
      console.log("[Extract] File read successfully, size:", buffer.length);
    } catch (err) {
      console.error("[Extract] File read failed:", err);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } else {
    console.log("[Extract] FormData mode - extracting from uploaded file");
    let formData: FormData;
    try {
      formData = await req.formData();
      console.log("[Extract] FormData parsed successfully");
    } catch (err) {
      console.error("[Extract] FormData parse failed:", err);
      return NextResponse.json({ error: "Failed to parse upload" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    console.log("[Extract] File from form:", file ? `name=${file.name}, size=${file.size}, type=${file.type}` : "null");
    if (!file || file.size === 0) {
      console.log("[Extract] No file or empty file");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    ext = path.extname(file.name).toLowerCase();
    console.log("[Extract] File extension:", ext);
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log("[Extract] arrayBuffer size:", arrayBuffer.byteLength);
      buffer = Buffer.from(arrayBuffer);
      console.log("[Extract] Buffer created, size:", buffer.length);
    } catch (err) {
      console.error("[Extract] Failed to read file arrayBuffer:", err);
      return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 400 });
    }
  }

  const allowed = [".pdf", ".doc", ".docx"];
  if (!allowed.includes(ext)) {
    console.log("[Extract] Extension not allowed:", ext);
    return NextResponse.json(
      { error: "Only PDF, DOC, and DOCX files are allowed" },
      { status: 400 }
    );
  }

  try {
    console.log("[Extract] Calling extractFromBuffer...");
    const result = await extractFromBuffer(buffer, ext);
    console.log("[Extract] extractFromBuffer returned:", result ? `format=${result.format}, textLength=${result.text.length}` : "null");
    if (!result) {
      return NextResponse.json(
        { error: "Could not extract any content from the file" },
        { status: 400 }
      );
    }

    const content = result.format === "text" ? textToHtml(result.text) : result.text;
    console.log("[Extract] Final content length:", content.length);
    return NextResponse.json({ content, format: result.format });
  } catch (err) {
    console.error("[SOW Template Extract] Error:", err);
    console.error("[SOW Template Extract] Error stack:", (err as Error).stack);
    return NextResponse.json(
      { error: "Failed to extract file content" },
      { status: 500 }
    );
  }
}
