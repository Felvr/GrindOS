import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Assign a stable anonymous id (cookie) so server logs can attribute LLM cost
// and events per visitor — needed to estimate average cost-per-user. No PII.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("gid")) {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    res.cookies.set("gid", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}

export const config = {
  // run on everything except Next internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
