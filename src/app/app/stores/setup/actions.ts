'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

import { Database } from '@/lib/database.types'

const createSessionChecker = () => {
  const cookieStore = cookies() as any

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {
          // no-op
        },
        remove: () => {
          // no-op
        },
      },
    },
  )
}

const createStatelessWriter = () =>
  createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const supabaseSessionChecker = createSessionChecker()

  // 1. Session validation
  const { data: userSession, error: authError } = await supabaseSessionChecker.auth.getSession()

  if (authError || !userSession.session) {
    redirect('/login')
  }

  const userId = userSession.session.user.id

  const supabaseDatabaseWriter = createStatelessWriter()

  // 2. Organization lookup
  const { data: organization, error: orgError } = await supabaseDatabaseWriter
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

  // 3. Generate credentials
  const newStoreId = uuidv4()
  const newApiKey = `awsk_${crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)}`

  // 4. Insert new store
  const { error: storeError } = await supabaseDatabaseWriter.from('stores').insert([
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

  redirect(
    `/app/stores/confirm?storeId=${newStoreId}&domain=${encodeURIComponent(domain)}&apiKey=${encodeURIComponent(newApiKey)}`,
  )
}
