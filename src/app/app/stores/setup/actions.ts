'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

import { Database } from '@/lib/database.types'

/**
 * Handles the secure submission of new store credentials.
 * This Next.js Server Action links the store to the user's organization.
 */
const createSessionClient = () => {
  const cookieStore = cookies() as any

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name),
        set: (_name: string, _value: string, _options: any) => {
          // no-op to avoid mutation in server actions
        },
        remove: (_name: string, _options: any) => {
          // no-op to avoid mutation in server actions
        },
      },
    },
  )
}

const createStatelessClient = (accessToken: string) =>
  createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      cookies: {
        get: () => undefined,
        set: () => {
          // no-op
        },
        remove: () => {
          // no-op
        },
      },
    },
  )

export async function storeConnectAction(formData: FormData) {
  const domain = formData.get('domain') as string

  if (!domain) {
    console.error('Store connect validation failed: missing domain')
    return
  }

  const supabaseSessionChecker = createSessionClient()

  // 1. Get current authenticated user session
  const { data: userSession, error: authError } = await supabaseSessionChecker.auth.getSession()

  if (authError || !userSession.session) {
    redirect('/login')
  }

  const { user, access_token } = userSession.session
  const userId = user.id

  if (!access_token) {
    redirect('/login')
  }

  const supabaseStateless = createStatelessClient(access_token)

  // 2. Find the Organization ID for the current user
  const { data: organization, error: orgError } = await supabaseStateless
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .single()

  if (orgError || !organization) {
    console.error('User has no associated organization:', orgError?.message)
    return
  }

  const organizationId = organization.id

  const newStoreId = uuidv4()
  const newApiKey = `awsk_${crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)}`

  // 3. Securely insert the new store data
  const { error: storeError } = await supabaseStateless.from('stores').insert([
    {
      id: newStoreId,
      organization_id: organizationId,
      woocommerce_domain: domain,
      api_key: newApiKey,
      shadow_mode: true,
    },
  ])

  if (storeError) {
    console.error('Store insertion failed:', storeError.message)
    return
  }

  const params = new URLSearchParams({
    storeId: newStoreId,
    domain,
    apiKey: newApiKey,
  })

  redirect(`/app/stores/confirm?${params.toString()}`)
}
