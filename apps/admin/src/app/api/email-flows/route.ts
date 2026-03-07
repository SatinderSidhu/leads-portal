import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  try {
    const flows = await prisma.emailFlow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(flows);
  } catch (error) {
    console.error("Failed to fetch email flows:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, description } = body as {
    name?: string;
    description?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  try {
    const session = await getAdminSession();
    const flow = await prisma.emailFlow.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        nodes: [],
        edges: [],
        createdBy: session?.name || "Unknown",
      },
    });

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    console.error("Failed to create email flow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
