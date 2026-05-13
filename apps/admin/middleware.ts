import { NextRequest, NextResponse } from "next/server";

// Public / self-auth paths. The cron-driven endpoints
// (/api/sequences/process, /api/drafts/process, /api/sequences/archive-old)
// validate a Bearer CRON_SECRET token internally — they have to bypass the
// cookie check here so the node-cron worker's self-call (which has no
// admin cookie) can actually reach the handler. Before this allow-list,
// those calls were 307-redirected to /login, which kept the cron's
// consecutiveFailures counter ticking up forever.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/v1",
  "/api-docs",
  "/api/track",
  "/api/webhooks",
  "/api/sequences/process",
  "/api/sequences/archive-old",
  "/api/drafts/process",
];

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.jpg$|.*\\.jpeg$|.*\\.png$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.webp$|openapi\\.json$).*)"],
};
