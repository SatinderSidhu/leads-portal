import { prisma } from "@leads-portal/database";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  try {
    const project = await prisma.appFactoryProject.findUnique({ where: { publicId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const builds = await prisma.appFactoryBuild.findMany({
      where: { projectId: project.id },
      orderBy: { version: "desc" },
    });
    return NextResponse.json(builds);
  } catch (error) {
    console.error("Failed to fetch builds:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { publicId } = await params;
  try {
    const project = await prisma.appFactoryProject.findUnique({
      where: { publicId },
      include: {
        flows: { orderBy: { version: "desc" }, take: 1 },
        builds: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { companyName } = body as { companyName?: string };

    // Update customer info if provided
    if (session.name || session.email || companyName) {
      await prisma.appFactoryProject.update({
        where: { id: project.id },
        data: {
          customerName: session.name,
          customerEmail: session.email,
          ...(companyName ? { companyName } : {}),
          status: "BUILDING",
        },
      });
    }

    // Get the latest flow's requirements + screens as the build snapshot
    const latestFlow = project.flows[0];
    const requirementsSnapshot = latestFlow
      ? { screens: latestFlow.screens, requirements: latestFlow.requirements, flowVersion: latestFlow.version }
      : {};

    const nextVersion = (project.builds[0]?.version || 0) + 1;

    const build = await prisma.appFactoryBuild.create({
      data: {
        projectId: project.id,
        version: nextVersion,
        status: "SUBMITTED",
        requirements: requirementsSnapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // Auto-create a Lead if not already linked
    if (!project.leadId && session.email) {
      try {
        // Build a description from requirements
        const reqData = latestFlow?.requirements as { summary?: string; features?: { name: string }[] } | null;
        const featureList = reqData?.features?.map((f) => f.name).join(", ") || "";
        const description = reqData?.summary
          ? `${reqData.summary}\n\nKey features: ${featureList}`
          : project.idea;

        const lead = await prisma.lead.create({
          data: {
            projectName: `App Factory: ${project.idea.substring(0, 80)}`,
            customerName: session.name || "App Factory Customer",
            customerEmail: session.email,
            projectDescription: description,
            source: "APP_FACTORY",
            stage: "NEW",
            status: "NEW",
            companyName: companyName || project.companyName || null,
          },
        });

        // Link the lead back to the project
        await prisma.appFactoryProject.update({
          where: { id: project.id },
          data: { leadId: lead.id },
        });
      } catch (leadError) {
        console.error("Failed to auto-create lead:", leadError);
        // Non-blocking — build still succeeds even if lead creation fails
      }
    }

    return NextResponse.json(build, { status: 201 });
  } catch (error) {
    console.error("Failed to create build:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
