export interface BrandingInfo {
  companyName: string;
  logoUrl?: string;
  website?: string;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string;
  copyrightText?: string;
}

export interface SowInput {
  // From lead
  projectName: string;
  customerName: string;
  projectDescription: string;
  customerCity?: string | null;
  // From builder form
  projectType: string;
  timeline: string;
  budgetRange: string;
  techStack: string;
  deliverables: string;
  additionalNotes: string;
  // Template content (optional)
  templateContent?: string;
  // Extracted text from uploaded reference file (optional)
  fileContent?: string;
  // Branding (optional)
  branding?: BrandingInfo;
}

export function buildSowPrompt(input: SowInput): { system: string; user: string } {
  let system = `You are a professional proposal writer for KITLabs Inc., a technology solutions company. Generate a detailed, professional Scope of Work (SOW) document in clean HTML.

IMPORTANT HTML RULES:
- Use ONLY these HTML tags: h1, h2, h3, p, ul, ol, li, strong, em, hr, table, thead, tbody, tr, th, td
- Do NOT include <html>, <head>, <body>, or <style> tags
- Do NOT use CSS classes or inline styles
- Do NOT use markdown — output pure HTML only
- Start with an <h1> for the document title`;

  const hasTemplate = input.templateContent?.trim();
  const hasFile = input.fileContent?.trim();

  if (hasTemplate && hasFile) {
    // Both editor template and uploaded reference file
    system += `

TEMPLATE FORMAT — You have TWO reference sources. Use the uploaded reference file as the PRIMARY formatting guide (section order, structure, tone, boilerplate text). The editor template provides additional formatting or overrides. Follow both closely, but when they conflict, prefer the editor template.

---BEGIN EDITOR TEMPLATE---
${input.templateContent}
---END EDITOR TEMPLATE---

---BEGIN REFERENCE FILE---
${input.fileContent}
---END REFERENCE FILE---`;
  } else if (hasFile) {
    // Only uploaded reference file
    system += `

TEMPLATE FORMAT — You MUST follow this reference document's structure, section order, formatting style, and tone exactly. Use it as the blueprint for the SOW. Fill in the project-specific details based on the user's input, but keep the document's layout, headings, and boilerplate text intact. Here is the reference document:

---BEGIN REFERENCE FILE---
${input.fileContent}
---END REFERENCE FILE---`;
  } else if (hasTemplate) {
    // Only editor template content
    system += `

TEMPLATE FORMAT — You MUST follow this template's structure, section order, formatting style, and tone exactly. Use it as the blueprint for the SOW. Fill in the project-specific details based on the user's input, but keep the template's layout, headings, and boilerplate text intact. Here is the template:

---BEGIN TEMPLATE---
${input.templateContent}
---END TEMPLATE---`;
  } else {
    // No template — use default structure
    system += `

DOCUMENT STRUCTURE — include all of these sections:
1. <h1> Document title (e.g. "Scope of Work — [Project Name]")
2. <h2> Executive Summary — brief overview of the project and its goals
3. <h2> Project Overview — client background, project context, objectives
4. <h2> Scope of Work — detailed features/deliverables broken into phases or modules, use nested <ul> lists
5. <h2> Technical Approach — architecture, tech stack, development methodology
6. <h2> Timeline & Milestones — phased timeline with deliverables per phase, use a <table>
7. <h2> Out of Scope — explicitly list what is NOT included
8. <h2> Assumptions — key assumptions the SOW is based on
9. <h2> Terms & Conditions — payment terms, revision policy, IP ownership, confidentiality`;
  }

  // Inject branding instructions
  if (input.branding) {
    const b = input.branding;
    const year = new Date().getFullYear().toString();
    const copyright = b.copyrightText?.replace(/\{year\}/g, year) || "";
    system += `

BRANDING — Apply the following company branding to the document:
- Company: ${b.companyName}${b.website ? ` (${b.website})` : ""}
- Include a professional document header at the very top: display the company name "${b.companyName}" prominently${b.logoUrl ? ` with a logo image: <img src="${b.logoUrl}" alt="${b.companyName}" style="height:40px" />` : ""}${b.primaryColor ? `. Use ${b.primaryColor} as the primary heading color.` : ""}
- Include a document footer at the very end with a horizontal rule, then:${b.footerText ? ` "${b.footerText}"` : ""}${copyright ? ` and "${copyright}"` : ""}
- Reference the company as "${b.companyName}" (not "KITLabs Inc" unless that is the company name)`;
  }

  system += `

Write in a professional but approachable tone. Be specific and detailed — avoid generic filler. Tailor the content to the actual project described.`;

  const parts: string[] = [];
  parts.push(`Generate a Scope of Work for the following project:\n`);
  parts.push(`**Project Name:** ${input.projectName}`);
  parts.push(`**Client:** ${input.customerName}`);
  if (input.customerCity) parts.push(`**Location:** ${input.customerCity}`);
  parts.push(`**Project Description:** ${input.projectDescription}`);
  if (input.projectType) parts.push(`**Project Type:** ${input.projectType}`);
  if (input.timeline) parts.push(`**Timeline:** ${input.timeline}`);
  if (input.budgetRange) parts.push(`**Budget Range:** ${input.budgetRange}`);
  if (input.techStack) parts.push(`**Tech Stack:** ${input.techStack}`);
  if (input.deliverables) parts.push(`**Key Deliverables:** ${input.deliverables}`);
  if (input.additionalNotes) parts.push(`**Additional Notes:** ${input.additionalNotes}`);

  return { system, user: parts.join("\n") };
}
