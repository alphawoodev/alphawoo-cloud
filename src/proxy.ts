import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
    // Constructing URL with WHATWG API avoids legacy parsing warnings
    new URL(request.url)

    // Update session (Supabase SSR pattern)
    return await updateSession(request)
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
        '/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)',
    ],
}
