import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";

interface FlowNode {
  id: string;
  data?: {
    templateId?: string;
    templateTitle?: string;
    templateSubject?: string;
    purpose?: string;
  };
}

interface FlowEdge {
  source: string;
  target: string;
  label?: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get all sent email template IDs for this lead
  const sentEmails = await prisma.sentEmail.findMany({
    where: { leadId: id },
    select: { templateId: true },
  });

  const sentTemplateIds = new Set(
    sentEmails.map((e) => e.templateId).filter(Boolean) as string[]
  );

  // Get all email flows
  const flows = await prisma.emailFlow.findMany({
    select: { name: true, nodes: true, edges: true },
  });

  const recommendations: {
    templateId: string;
    templateTitle: string;
    templateSubject: string;
    purpose: string;
    flowName: string;
    edgeLabel: string | null;
    fromTemplateName: string;
  }[] = [];

  const seenTemplateIds = new Set<string>();

  for (const flow of flows) {
    const nodes = (flow.nodes as unknown as FlowNode[]) || [];
    const edges = (flow.edges as unknown as FlowEdge[]) || [];

    // Build node lookup by ID
    const nodeMap = new Map<string, FlowNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // Find nodes that match sent templates
    for (const node of nodes) {
      const templateId = node.data?.templateId;
      if (!templateId || !sentTemplateIds.has(templateId)) continue;

      // Find outgoing edges from this node
      const outEdges = edges.filter((e) => e.source === node.id);

      for (const edge of outEdges) {
        const targetNode = nodeMap.get(edge.target);
        const targetTemplateId = targetNode?.data?.templateId;

        if (
          !targetTemplateId ||
          sentTemplateIds.has(targetTemplateId) ||
          seenTemplateIds.has(targetTemplateId)
        )
          continue;

        seenTemplateIds.add(targetTemplateId);

        recommendations.push({
          templateId: targetTemplateId,
          templateTitle: targetNode.data?.templateTitle || "Unknown",
          templateSubject: targetNode.data?.templateSubject || "",
          purpose: targetNode.data?.purpose || "OTHER",
          flowName: flow.name,
          edgeLabel: edge.label || null,
          fromTemplateName: node.data?.templateTitle || "Unknown",
        });
      }
    }
  }

  // If no sent emails yet, suggest first nodes (no incoming edges) from flows
  if (sentTemplateIds.size === 0) {
    for (const flow of flows) {
      const nodes = (flow.nodes as unknown as FlowNode[]) || [];
      const edges = (flow.edges as unknown as FlowEdge[]) || [];
      const targetIds = new Set(edges.map((e) => e.target));

      for (const node of nodes) {
        const templateId = node.data?.templateId;
        if (!templateId || seenTemplateIds.has(templateId)) continue;

        // Node with no incoming edges = starting node
        if (!targetIds.has(node.id)) {
          seenTemplateIds.add(templateId);
          recommendations.push({
            templateId,
            templateTitle: node.data?.templateTitle || "Unknown",
            templateSubject: node.data?.templateSubject || "",
            purpose: node.data?.purpose || "OTHER",
            flowName: flow.name,
            edgeLabel: null,
            fromTemplateName: "Start",
          });
        }
      }
    }
  }

  return NextResponse.json(recommendations);
}
