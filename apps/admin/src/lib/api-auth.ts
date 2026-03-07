import { NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json(
    {
      error:
        "Unauthorized. Provide a valid Bearer token in the Authorization header.",
    },
    { status: 401 }
  );
}

export function validateToken(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.API_TOKEN;
}
