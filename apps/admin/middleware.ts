import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/v1", "/api-docs"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("admin-session");
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Cookie format: "userId:secret"
  const parts = session.value.split(":");
  const secret = parts.slice(1).join(":");
  if (!parts[0] || secret !== process.env.SESSION_SECRET) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
