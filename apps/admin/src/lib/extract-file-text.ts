import { readFile } from "fs/promises";
import path from "path";
import { createRequire } from "node:module";

// Use createRequire to load native Node packages at runtime,
// preventing turbopack from bundling/mangling them
const _require = createRequire(import.meta.url);

/**
 * Extracts text/HTML content from an uploaded PDF or DOCX file.
 * - DOCX → HTML (preserves headings, lists, tables via mammoth)
 * - PDF → plain text (via pdf-parse)
 * Returns null if the file cannot be read or parsed.
 */
export async function extractFileContent(
  filePath: string
): Promise<{ text: string; format: "html" | "text" } | null> {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    const buffer = await readFile(fullPath);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".docx") {
      const mammoth = _require("mammoth");
      const result = await mammoth.convertToHtml({ buffer });
      if (result.value?.trim()) {
        return { text: result.value, format: "html" };
      }
    } else if (ext === ".doc") {
      const mammoth = _require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      if (result.value?.trim()) {
        return { text: result.value, format: "text" };
      }
    } else if (ext === ".pdf") {
      const { PDFParse } = _require("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      if (data.text?.trim()) {
        return { text: data.text, format: "text" };
      }
    }

    return null;
  } catch (err) {
    console.error("[extractFileContent] Failed to extract from", filePath, err);
    return null;
  }
}
