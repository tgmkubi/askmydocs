import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "askmydocs_token";

const protectedRoutes = ["/ask", "/documents", "/dashboard"];
const authRoutes = ["/login", "/register"];

function isPathMatching(pathname: string, routes: string[]) {
    return routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    const isProtectedRoute = isPathMatching(pathname, protectedRoutes);
    const isAuthRoute = isPathMatching(pathname, authRoutes);

    if (isProtectedRoute && !token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirectTo", pathname);

        return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL("/ask", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/ask/:path*", "/documents/:path*", "/dashboard/:path*", "/login", "/register"],
};