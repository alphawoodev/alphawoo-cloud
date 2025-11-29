// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

/**
 * Creates the secure, session-aware Supabase client for Server Components and API Routes.
 * This client manages the user's session via Next.js cookies (HMAC security).
 */
export const createClient = () => {
    // CRITICAL FIX: We use 'as any' here to treat the cookieStore as a synchronous object
    // with 'get', 'set', and 'delete' methods, which it is at runtime in this context.
    const cookieStore = cookies() as any;

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name: string) => cookieStore.get(name)?.value,
                
                // set/remove functions are required by Supabase's library.
                set: (name: string, value: string, options: any) => {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Suppress error
                    }
                },
                remove: (name: string, options: any) => {
                    try {
                        cookieStore.delete(name)
                    } catch (error) {
                        // Suppress error
                    }
                },
            },
        }
    )
}