import { prisma } from "@leads-portal/database";
import type { AppStorePlatform } from "@prisma/client";
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

    const configs = await prisma.appStoreConfig.findMany({
      where: { projectId: project.id },
      select: {
        id: true, platform: true, accountId: true, bundleId: true,
        connectionVerified: true, connectionVerifiedAt: true, createdAt: true,
      },
    });
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Failed to fetch app store configs:", error);
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
    const project = await prisma.appFactoryProject.findUnique({ where: { publicId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    const { platform, accountId, bundleId, apiKey } = body as {
      platform: string;
      accountId?: string;
      bundleId?: string;
      apiKey?: string;
    };

    if (!platform || !["IOS", "ANDROID"].includes(platform)) {
      return NextResponse.json({ error: "Platform must be IOS or ANDROID" }, { status: 400 });
    }

    const config = await prisma.appStoreConfig.upsert({
      where: { projectId_platform: { projectId: project.id, platform: platform as AppStorePlatform } },
      create: {
        projectId: project.id,
        platform: platform as AppStorePlatform,
        accountId: accountId || null,
        bundleId: bundleId || null,
        apiKey: apiKey || null,
      },
      update: {
        accountId: accountId || null,
        bundleId: bundleId || null,
        apiKey: apiKey || null,
        connectionVerified: false,
        connectionVerifiedAt: null,
      },
    });

    return NextResponse.json({
      id: config.id,
      platform: config.platform,
      accountId: config.accountId,
      bundleId: config.bundleId,
      connectionVerified: config.connectionVerified,
    });
  } catch (error) {
    console.error("Failed to save app store config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
