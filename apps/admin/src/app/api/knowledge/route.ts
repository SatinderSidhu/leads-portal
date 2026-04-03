import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const category = searchParams.get("category") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { published: true };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) {
    where.category = category;
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });

  // Get unique categories for filter
  const allCategories = await prisma.knowledgeArticle.findMany({
    where: { published: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return NextResponse.json({
    articles,
    categories: allCategories.map((c) => c.category),
  });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  // Generate slug from title
  const slug = body.slug?.trim() ||
    body.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const article = await prisma.knowledgeArticle.create({
    data: {
      title: body.title.trim(),
      slug,
      content: body.content.trim(),
      category: body.category?.trim() || "General",
      tags: body.tags || [],
      sortOrder: body.sortOrder || 0,
      published: body.published ?? true,
      createdBy: session.name,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
