// src/lib/supabase/server.ts
// We use the correct import name: createServerClient
import { createServerClient } from '@supabase/ssr'
import { cookies, ReadonlyRequestCookies } from 'next/headers'
import { Database } from '@/lib/database.types'

/**
 * Creates the secure, session-aware Supabase client for Server Components and API Routes.
 * This client manages the user's session via Next.js cookies (HMAC security).
 */
export const createServerSupabaseClient = (cookieStore: ReadonlyRequestCookies) => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        
        // The set and remove methods must be implemented to handle token refresh.
        // We use a try/catch block because these methods will fail if called 
        // from a Server Component that is not a Server Action or Route Handler.
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // This error is expected in specific server component lifecycle stages.
          }
        },
        remove: (name: string, options: any) => {
          try {
            cookieStore.delete(name)
          } catch (error) {
             // This error is expected in specific server component lifecycle stages.
          }
        },
      },
    }
  )
}

// Helper to use in API Routes and Server Actions (where cookies() can be called)
export const createClient = () => {
    return createServerSupabaseClient(cookies());
}
