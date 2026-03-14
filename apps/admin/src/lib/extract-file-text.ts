import { readFile } from "fs/promises";
import path from "path";

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
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ buffer });
      if (result.value?.trim()) {
        return { text: result.value, format: "html" };
      }
    } else if (ext === ".doc") {
      // mammoth doesn't support .doc, extract as raw text fallback
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      if (result.value?.trim()) {
        return { text: result.value, format: "text" };
      }
    } else if (ext === ".pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
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
