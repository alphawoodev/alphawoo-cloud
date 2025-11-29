'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

import { Database } from '@/lib/database.types'

const createAuthenticatedSupabaseClient = () => {
  const cookieStore = cookies() as any
  const token = cookieStore.get('sb-access-token')?.value

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
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
}

export async function storeConnectAction(formData: FormData) {
  const domain = formData.get('domain') as string

  if (!domain) {
    console.error('Store connect validation failed: missing domain')
    return
  }

  const supabase = createAuthenticatedSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const userId = user.id

  const { data: organization, error: orgError } = await supabase
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

  const { error: storeError } = await supabase.from('stores').insert([
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
