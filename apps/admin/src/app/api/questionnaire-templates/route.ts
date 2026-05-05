import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.questionnaireTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, questions } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const template = await prisma.questionnaireTemplate.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      questions: questions ?? [],
      createdBy: session.name,
      updatedBy: session.name,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
