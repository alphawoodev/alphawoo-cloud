import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { Database } from '@/lib/database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createAuthenticatedServerActionClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const authCookie = allCookies.find(
    (c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'sb-access-token',
  )

  if (!authCookie) {
    console.error('ERROR [Auth]: No Supabase cookie found.')
    throw new Error('No authentication token found in cookies')
  }

  const rawValue = authCookie.value
  let token = rawValue

  try {
    const decoded = decodeURIComponent(rawValue)

    if (decoded.startsWith('[') || decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded)
      if (Array.isArray(parsed) && parsed.length > 0) {
        token = parsed[0]
      } else if (parsed.access_token) {
        token = parsed.access_token
      }
    } else if (!decoded.startsWith('ey')) {
      try {
        const base64Decoded = Buffer.from(decoded, 'base64').toString('utf-8')
        const parsedB64 = JSON.parse(base64Decoded)
        if (parsedB64.access_token) {
          token = parsedB64.access_token
        } else if (Array.isArray(parsedB64) && parsedB64.length > 0) {
          token = parsedB64[0]
        }
      } catch {
        // Ignore base64 parsing errors
      }
    } else {
      token = decoded
    }
  } catch (e) {
    console.warn('WARN [Auth]: Token parsing hit an edge case, using raw value.')
  }

  if (!token.startsWith('ey')) {
    console.error("CRITICAL [Auth]: Extracted token does not look like a JWT (doesn't start with 'ey').")
    console.error('CRITICAL [Auth]: Raw Cookie Start:', rawValue.substring(0, 20))
    throw new Error('Malformed token extraction')
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
    console.error('ERROR [Auth]: Token rejected by Supabase:', error?.message)
    throw new Error('Unauthorized')
  }

  return user
}
