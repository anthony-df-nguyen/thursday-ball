import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Next.js 16 renamed "Middleware" to "Proxy" (same functionality, this file
// just needs to live at src/proxy.ts instead of src/middleware.ts).
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  // Recipients answer a text invite from this public page; the token in the
  // URL is the credential.
  const isRsvp = req.nextUrl.pathname.startsWith("/rsvp/");

  if (isAuthApi || isRsvp) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
