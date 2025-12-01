import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    // FIX: Use 'new URL()' instead of legacy parser to kill the [DEP0169] warning
    // Note: We are just constructing the URL object here to ensure it parses correctly, 
    // though we don't strictly use 'requestUrl' in this snippet, it validates the URL.
    const requestUrl = new URL(request.url);

    // Update session (Standard Supabase SSR pattern)
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/ (API routes - though sometimes you WANT protection here)
         * - auth/ (Auth callback routes must be public)
         */
        "/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)",
    ],
};
