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
    if (rawValue.startsWith('base64-')) {
      const base64Str = rawValue.replace('base64-', '')
      const decodedStr = Buffer.from(base64Str, 'base64').toString('utf-8')
      try {
        const parsed = JSON.parse(decodedStr)
        if (parsed.access_token) {
          token = parsed.access_token
        } else {
          token = decodedStr
        }
      } catch {
        token = decodedStr
      }
    } else {
      const decoded = decodeURIComponent(rawValue)
      if (decoded.startsWith('[') || decoded.startsWith('{')) {
        const parsed = JSON.parse(decoded)
        if (Array.isArray(parsed) && parsed.length > 0) {
          token = parsed[0]
        } else if (parsed.access_token) {
          token = parsed.access_token
        }
      } else {
        token = decoded
      }
    }
  } catch (e) {
    console.warn('WARN [Auth]: Parsing failed, attempting to use raw value.')
  }

  if (!token || !token.startsWith('ey')) {
    console.error("CRITICAL [Auth]: Extraction failed. Token does not start with 'ey'.")
    console.error('DEBUG: Extracted value start:', token.substring(0, 15))
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
    throw new Error('Unauthorized')
  }

  return user
}
