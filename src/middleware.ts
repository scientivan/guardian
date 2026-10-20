import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = process.env.NEXTAUTH_SECRET ? await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }) : null;
  if (token) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/app", "/projects/:path*", "/case/:path*", "/join/:path*", "/admin/:path*", "/hospitals/:path*"] };
