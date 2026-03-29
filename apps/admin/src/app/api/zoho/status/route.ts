import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/session";
import { isZohoEnabled } from "../../../../lib/zoho";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isZohoEnabled();
  return NextResponse.json({ enabled });
}
