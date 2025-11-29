import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { Database } from '@/lib/database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Creates a Supabase client authenticated with the JWT extracted from the Server Action cookies.
 * This bypasses the SSR helper that cannot synchronously access cookies in Server Actions.
 */
export async function createAuthenticatedServerActionClient() {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) {
    throw new Error('No authentication token found in cookies')
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

/**
 * Returns the authenticated user with the crash-proof client. Throws if user is missing.
 */
export async function getServerActionUser() {
  const supabase = await createAuthenticatedServerActionClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error(`Unauthorized: ${error?.message ?? 'User not found'}`)
  }

  return user
}
