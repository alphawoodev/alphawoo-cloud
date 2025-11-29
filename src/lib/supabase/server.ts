// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

/**
 * Creates the secure, session-aware Supabase client for Server Components and API Routes.
 * This client manages the user's session via Next.js cookies (HMAC security).
 */
export const createClient = () => {
  const cookieStore = cookies() as any

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name),
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Suppress error when cookieStore is read-only
          }
        },
        remove: (name: string) => {
          try {
            cookieStore.delete(name)
          } catch (error) {
            // Suppress error when cookieStore is read-only
          }
        },
      },
    },
  )
}
