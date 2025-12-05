import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === "/login"
  const isSetupPage = request.nextUrl.pathname === "/setup"
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard")
  const isApi = request.nextUrl.pathname.startsWith("/api")
  const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth")
  const isSetupApi = request.nextUrl.pathname === "/api/setup"
  const isPublicApi = request.nextUrl.pathname.startsWith("/api/public")

  // Allow auth, setup, and public API routes WITHOUT checking auth
  if (isAuthApi || isSetupApi || isPublicApi) {
    return NextResponse.next()
  }

  // Only call auth() after we've checked for public routes
  const session = await auth()
  const isLoggedIn = !!session?.user

  // Allow setup page
  if (isSetupPage) {
    return NextResponse.next()
  }

  // Redirect logged in users away from login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect non-logged in users to login page for dashboard routes
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Protect API routes (except public routes)
  if (isApi && !isLoggedIn && !isAuthApi && !isSetupApi && !isPublicApi) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/setup",
    "/api/((?!public).*)"
  ],
}
