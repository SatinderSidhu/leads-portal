import { prisma } from "@leads-portal/database";
import type { AppStorePlatform } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/session";
import { encryptSecret } from "../../../../../lib/secrets";

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
        apiKey: true, // selected only to compute hasApiKey — stripped before response
      },
    });
    // Never expose apiKey to the client. Surface a boolean instead.
    const safe = configs.map((c) => ({
      id: c.id,
      platform: c.platform,
      accountId: c.accountId,
      bundleId: c.bundleId,
      connectionVerified: c.connectionVerified,
      connectionVerifiedAt: c.connectionVerifiedAt,
      createdAt: c.createdAt,
      hasApiKey: !!c.apiKey,
    }));
    return NextResponse.json(safe);
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

    // Encrypt only when the customer actually provides a new key. Empty/missing means
    // "leave existing key untouched" — prevents the form from silently wiping a saved key
    // when the customer just edits accountId / bundleId.
    const trimmedKey = apiKey?.trim();
    const encryptedKey = trimmedKey ? encryptSecret(trimmedKey) : undefined;

    const config = await prisma.appStoreConfig.upsert({
      where: { projectId_platform: { projectId: project.id, platform: platform as AppStorePlatform } },
      create: {
        projectId: project.id,
        platform: platform as AppStorePlatform,
        accountId: accountId || null,
        bundleId: bundleId || null,
        apiKey: encryptedKey || null,
      },
      update: {
        accountId: accountId || null,
        bundleId: bundleId || null,
        // Only overwrite apiKey when the customer entered a new value. Re-saving a key
        // resets the verification flag because new creds need to be re-checked.
        ...(encryptedKey !== undefined && {
          apiKey: encryptedKey,
          connectionVerified: false,
          connectionVerifiedAt: null,
        }),
      },
    });

    return NextResponse.json({
      id: config.id,
      platform: config.platform,
      accountId: config.accountId,
      bundleId: config.bundleId,
      connectionVerified: config.connectionVerified,
      hasApiKey: !!config.apiKey,
    });
  } catch (error) {
    console.error("Failed to save app store config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
