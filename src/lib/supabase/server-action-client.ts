import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { Database } from '@/lib/database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createAuthenticatedServerActionClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  console.log('DEBUG [Auth]: Checking Cookies. Total found:', allCookies.length)
  console.log('DEBUG [Auth]: Cookie Names:', allCookies.map((c) => c.name).join(', '))

  const authCookie = allCookies.find(
    (c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'sb-access-token',
  )

  if (!authCookie) {
    console.error('ERROR [Auth]: No Supabase cookie found matching pattern!')
    throw new Error('No authentication token found in cookies')
  }

  let token = authCookie.value

  if (token.startsWith('[') || token.startsWith('{')) {
    try {
      const parsed = JSON.parse(token)
      if (Array.isArray(parsed) && parsed.length > 0) {
        token = parsed[0]
      } else if (parsed?.access_token) {
        token = parsed.access_token
      }
    } catch (e) {
      console.warn('WARN [Auth]: JSON Parse failed, using raw value')
    }
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export async function getServerActionUser() {
  const supabase = await createAuthenticatedServerActionClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    console.error('ERROR [Auth]: Token valid but getUser failed:', error?.message)
    throw new Error('Unauthorized: ' + (error?.message || 'No user found'))
  }

  return user
}
