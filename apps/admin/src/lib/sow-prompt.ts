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
}

export function buildSowPrompt(input: SowInput): { system: string; user: string } {
  const system = `You are a professional proposal writer for KITLabs Inc., a technology solutions company. Generate a detailed, professional Scope of Work (SOW) document in clean HTML.

IMPORTANT HTML RULES:
- Use ONLY these HTML tags: h1, h2, h3, p, ul, ol, li, strong, em, hr, table, thead, tbody, tr, th, td
- Do NOT include <html>, <head>, <body>, or <style> tags
- Do NOT use CSS classes or inline styles
- Do NOT use markdown — output pure HTML only
- Start with an <h1> for the document title

DOCUMENT STRUCTURE — include all of these sections:
1. <h1> Document title (e.g. "Scope of Work — [Project Name]")
2. <h2> Executive Summary — brief overview of the project and its goals
3. <h2> Project Overview — client background, project context, objectives
4. <h2> Scope of Work — detailed features/deliverables broken into phases or modules, use nested <ul> lists
5. <h2> Technical Approach — architecture, tech stack, development methodology
6. <h2> Timeline & Milestones — phased timeline with deliverables per phase, use a <table>
7. <h2> Out of Scope — explicitly list what is NOT included
8. <h2> Assumptions — key assumptions the SOW is based on
9. <h2> Terms & Conditions — payment terms, revision policy, IP ownership, confidentiality

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
