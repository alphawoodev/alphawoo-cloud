import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { Database } from '@/lib/database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Creates an authenticated Supabase client for Server Actions by manually
 * extracting the user's JWT from cookies and injecting it into the client.
 */
export async function createAuthenticatedServerActionClient() {
  const cookieStore = await cookies()

  let projectRef = ''
  try {
    const urlParts = SUPABASE_URL.split('//')
    if (urlParts.length > 1) {
      projectRef = urlParts[1].split('.')[0]
    }
  } catch (e) {
    console.warn('Could not parse project ref from URL')
  }

  let accessToken = projectRef ? cookieStore.get(`sb-${projectRef}-auth-token`)?.value : undefined

  if (!accessToken) {
    accessToken = cookieStore.get('sb-access-token')?.value
  }

  if (!accessToken) {
    console.error('Auth Fail: No access token found. Available cookies:', cookieStore.getAll().map((c) => c.name))
    throw new Error('No authentication token found in cookies')
  }

  let token = accessToken
  if (accessToken.startsWith('{') || accessToken.includes('"access_token"')) {
    try {
      const sessionData = JSON.parse(accessToken)
      token = sessionData.access_token || accessToken
    } catch (e) {
      // Ignore parse errors and fall back to raw value
    }
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Primary method: fetch authenticated user with the crash-proof client.
 */
export async function getServerActionUser() {
  const supabase = await createAuthenticatedServerActionClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: ' + (error?.message || 'No user found'))
  }

  return user
}
