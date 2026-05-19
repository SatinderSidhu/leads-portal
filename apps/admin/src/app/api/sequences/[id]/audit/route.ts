import { prisma } from "@leads-portal/database";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/session";

/**
 * Send-history audit log for a single sequence.
 *
 * Lists every SentEmail that originated from one of this sequence's
 * enrollments, with timestamps, recipient, step number, template, and
 * engagement state (opened / clicked). Powers the new "Audit Log" tab
 * on /sequences/[id].
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  // Pull all enrollment IDs for this sequence first, then page through
  // SentEmail rows that reference them. Two queries is cleaner than
  // trying to express the through-table JOIN in Prisma's typed API.
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { sequenceId: id },
    select: { id: true },
  });
  const enrollmentIds = enrollments.map((e) => e.id);
  if (enrollmentIds.length === 0) {
    return NextResponse.json({ rows: [], total: 0, page, limit });
  }

  const [total, rows] = await Promise.all([
    prisma.sentEmail.count({ where: { enrollmentId: { in: enrollmentIds } } }),
    prisma.sentEmail.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        subject: true,
        status: true,
        openedAt: true,
        clickedAt: true,
        createdAt: true,
        enrollmentStep: true,
        template: { select: { id: true, title: true } },
        lead: {
          select: {
            id: true,
            customerName: true,
            customerEmail: true,
            companyName: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ rows, total, page, limit });
}
