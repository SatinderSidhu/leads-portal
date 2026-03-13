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
      "screenTitle": string (screen name, e.g. "Login", "Dashboard", "Profile"),
      "description": string (brief 3-5 word purpose of this screen),
      "elements": array of element objects representing UI components on the screen
    }

ELEMENT FORMAT — each element in the "elements" array must be an object with a "type" field and additional fields based on type:

Available element types:
  - { "type": "nav-bar", "label": "App Name" } — top navigation bar with hamburger menu and title
  - { "type": "heading", "label": "Welcome Back" } — large heading text
  - { "type": "text", "content": "Description text here" } — paragraph/body text
  - { "type": "input", "label": "Email", "placeholder": "Enter your email" } — text input field with label
  - { "type": "button", "label": "Sign In" } — primary filled button
  - { "type": "button-outline", "label": "Sign Up" } — secondary outlined button
  - { "type": "image", "label": "Hero Banner" } — image placeholder
  - { "type": "avatar" } — user avatar with name placeholder
  - { "type": "search", "placeholder": "Search..." } — search bar
  - { "type": "card", "label": "Item Card" } — content card with image and text
  - { "type": "list", "items": ["Item 1", "Item 2", "Item 3"] } — list of items
  - { "type": "tab-bar", "items": ["Home", "Search", "Cart", "Profile"] } — bottom tab navigation
  - { "type": "toggle", "label": "Notifications" } — toggle switch with label
  - { "type": "divider" } — horizontal separator line
  - { "type": "checkbox", "label": "Remember me" } — checkbox with label
  - { "type": "radio", "label": "Option A" } — radio button with label
  - { "type": "social-login", "label": "Continue with Google" } — social login button
  - { "type": "map", "label": "Location Map" } — map placeholder

SCREEN DESIGN RULES:
- Each screen should have 4-8 elements that realistically represent the UI
- Start most screens with a "nav-bar" or "heading" element
- End navigation-heavy screens with a "tab-bar" element
- Use "input" elements for forms (login, signup, search, settings)
- Use "button" for primary actions and "button-outline" for secondary actions
- Use "card" and "list" for content display screens (feed, search results, orders)
- Use "avatar" for profile-related screens
- Include "divider" to separate sections
- Make each screen feel like a real mobile app screen with appropriate elements`
    : `Each node object must have:
  - "id": unique string like "node-1", "node-2", etc.
  - "type": "basicNode"
  - "position": { "x": number, "y": number }
  - "data": {
      "label": string (step/screen name),
      "description": string (optional brief detail)
    }`;

  const layoutRules = isWireframe
    ? `LAYOUT RULES (HORIZONTAL FLOW — screens read left to right like a storyboard):
- Generate 8-14 screen nodes for a complete app flow
- Position nodes in a LEFT-TO-RIGHT horizontal flow
- Main flow: x starts at 0 and increments by 280 for each screen. y = 0 for the main path
- Alternate/branch paths: same x as the branching point, y = 500 (below main flow)
- The flow should read like a user journey from left to right: Entry → Auth → Main → Detail → Action → Confirmation
- Every node must be connected by at least one edge
- Use LEFT-to-RIGHT edges (source on right side → target on left side)
- Include logical branching where appropriate (e.g. success/error paths, alternate flows)`
    : `LAYOUT RULES:
- Generate 8-14 nodes for a complete app flow
- Position nodes in a logical top-to-bottom flow
- Use a grid layout: x values at 100, 400, or 700 (for branching). y values start at 50 and increment by 200
- Main flow should be centered at x=400
- Branch paths use x=100 (left) or x=700 (right)
- Every node must be connected by at least one edge
- Include logical branching where appropriate (e.g. success/error paths, conditional navigation)`;

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
  ${isWireframe ? '- "sourceHandle": null\n  - "targetHandle": null' : ""}

${layoutRules}

CONTENT RULES:
- Create a realistic, detailed app flow based on the project description
- Start with an entry point (splash/login/landing)
- Include authentication if applicable
- Cover the main user journey thoroughly
- Include error states or alternate paths where appropriate
- End with a logical conclusion (confirmation, dashboard, etc.)

Write in a professional but approachable tone. Be specific and detailed — avoid generic filler. Tailor the content to the actual project described.`;

  const parts: string[] = [];
  parts.push(`Create an app flow diagram for the following project:\n`);
  parts.push(`**Project Name:** ${input.projectName}`);
  parts.push(`**Client:** ${input.customerName}`);
  parts.push(`**Project Description:** ${input.projectDescription}`);
  if (input.appType) parts.push(`**App Type:** ${input.appType}`);
  parts.push(`**Flow Style:** ${isWireframe ? "Wireframe (high-fidelity mobile screen mockups with typed UI elements)" : "Basic (flowchart boxes)"}`);
  if (input.additionalNotes) parts.push(`**Additional Notes:** ${input.additionalNotes}`);

  return { system, user: parts.join("\n") };
}
