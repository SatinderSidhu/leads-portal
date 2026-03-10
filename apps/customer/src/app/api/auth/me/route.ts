import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/session";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(session);
}
