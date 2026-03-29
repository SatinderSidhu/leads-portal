import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { exchangeGrantToken, fetchOrgId, getZohoConfig } from "../../../../lib/zoho";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getZohoConfig();
  if (!config) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    enabled: config.enabled,
    dataCenter: config.dataCenter,
    hasRefreshToken: !!config.refreshToken,
    orgId: config.orgId,
    // Don't expose secrets
    clientId: config.clientId ? config.clientId.slice(0, 8) + "..." : null,
  });
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { clientId, clientSecret, dataCenter, enabled } = body;

  const existing = await getZohoConfig();

  if (existing) {
    // Update existing config
    const updateData: Record<string, unknown> = {};
    if (clientId !== undefined) updateData.clientId = clientId;
    if (clientSecret !== undefined) updateData.clientSecret = clientSecret;
    if (dataCenter !== undefined) updateData.dataCenter = dataCenter;
    if (enabled !== undefined) updateData.enabled = enabled;

    await prisma.zohoConfig.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    // Create new config
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }
    await prisma.zohoConfig.create({
      data: {
        clientId,
        clientSecret,
        dataCenter: dataCenter || "us",
        enabled: enabled ?? false,
      },
    });
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, grantToken } = body;

  const config = await getZohoConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Zoho not configured. Save credentials first." },
      { status: 400 }
    );
  }

  if (action === "authorize") {
    if (!grantToken?.trim()) {
      return NextResponse.json(
        { error: "Grant token is required" },
        { status: 400 }
      );
    }

    try {
      const result = await exchangeGrantToken(
        config.clientId,
        config.clientSecret,
        grantToken.trim(),
        config.dataCenter
      );

      const expiresAt = new Date(Date.now() + result.expiresIn * 1000);

      await prisma.zohoConfig.update({
        where: { id: config.id },
        data: {
          refreshToken: result.refreshToken,
          accessToken: result.accessToken,
          tokenExpiry: expiresAt,
          enabled: true,
        },
      });

      // Also fetch org ID
      const updatedConfig = await getZohoConfig();
      if (updatedConfig) {
        try {
          await fetchOrgId(updatedConfig);
        } catch (e) {
          console.warn("Could not fetch org ID:", e);
        }
      }

      return NextResponse.json({ success: true, message: "Zoho authorized successfully" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Authorization failed" },
        { status: 400 }
      );
    }
  }

  if (action === "test") {
    try {
      // Try to fetch org info as a connection test
      const updatedConfig = await getZohoConfig();
      if (!updatedConfig?.refreshToken) {
        return NextResponse.json(
          { error: "Not authorized. Please authorize with a grant token first." },
          { status: 400 }
        );
      }
      const orgId = await fetchOrgId(updatedConfig);
      return NextResponse.json({ success: true, orgId, message: "Connection successful!" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Connection test failed" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
