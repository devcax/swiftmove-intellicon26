import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "fl_session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

  if (!request.cookies.has(SESSION_COOKIE) && !isLoginRoute) {
    const login = new URL("/login", request.url);
    if (pathname !== "/")
      login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
