export interface AppFlowInput {
  projectName: string;
  customerName: string;
  projectDescription: string;
  appType: string;
  flowType: "BASIC" | "WIREFRAME";
  additionalNotes: string;
}

export function buildAppFlowPrompt(input: AppFlowInput): {
  system: string;
  user: string;
} {
  const isWireframe = input.flowType === "WIREFRAME";

  const nodeSchema = isWireframe
    ? `Each node object must have:
  - "id": unique string like "node-1", "node-2", etc.
  - "type": "wireframeNode"
  - "position": { "x": number, "y": number }
  - "data": {
      "screenTitle": string (screen/page name, e.g. "Login Screen", "Dashboard"),
      "description": string (brief purpose of this screen),
      "elements": string[] (list of UI elements, e.g. ["Header", "Email input", "Password input", "Login button", "Forgot password link"])
    }`
    : `Each node object must have:
  - "id": unique string like "node-1", "node-2", etc.
  - "type": "basicNode"
  - "position": { "x": number, "y": number }
  - "data": {
      "label": string (step/screen name),
      "description": string (optional brief detail)
    }`;

  const system = `You are an expert UX/product designer creating app flow diagrams for KITLabs Inc.

OUTPUT FORMAT: You must output ONLY valid JSON. No markdown, no explanation, no code fences. Just pure JSON.

The JSON must have this exact structure:
{
  "nodes": [ ... ],
  "edges": [ ... ]
}

NODE FORMAT:
${nodeSchema}

EDGE FORMAT:
Each edge object must have:
  - "id": unique string like "edge-1", "edge-2", etc.
  - "source": the id of the source node
  - "target": the id of the target node
  - "label": string (optional transition label, e.g. "Submit", "Navigate", "Success", "Back")
  - "type": "smoothstep"

LAYOUT RULES:
- Generate 8-14 nodes for a complete app flow
- Position nodes in a logical top-to-bottom flow
- Use a grid layout: x values at 100, 400, or 700 (for branching). y values start at 50 and increment by 200
- Main flow should be centered at x=400
- Branch paths use x=100 (left) or x=700 (right)
- Every node must be connected by at least one edge
- Include logical branching where appropriate (e.g. success/error paths, conditional navigation)

CONTENT RULES:
- Create a realistic, detailed app flow based on the project description
- Start with an entry point (splash/login/landing)
- Include authentication if applicable
- Cover the main user journey thoroughly
- Include error states or alternate paths where appropriate
- End with a logical conclusion (confirmation, dashboard, etc.)`;

  const parts: string[] = [];
  parts.push(`Create an app flow diagram for the following project:\n`);
  parts.push(`**Project Name:** ${input.projectName}`);
  parts.push(`**Client:** ${input.customerName}`);
  parts.push(`**Project Description:** ${input.projectDescription}`);
  if (input.appType) parts.push(`**App Type:** ${input.appType}`);
  parts.push(`**Flow Style:** ${isWireframe ? "Wireframe (low-fidelity screen mockups)" : "Basic (flowchart boxes)"}`);
  if (input.additionalNotes) parts.push(`**Additional Notes:** ${input.additionalNotes}`);

  return { system, user: parts.join("\n") };
}
