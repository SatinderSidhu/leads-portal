import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { transporter } from "../../../../lib/email";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, subject, html } = body as {
    to?: string;
    subject?: string;
    html?: string;
  };

  if (!to?.trim() || !subject?.trim() || !html?.trim()) {
    return NextResponse.json(
      { error: "to, subject, and html are required" },
      { status: 400 }
    );
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@leadsportal.com",
      to: to.trim(),
      subject: `[TEST] ${subject.trim()}`,
      html: html.trim(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
