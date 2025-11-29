'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

/**
 * Handles the secure submission of new store credentials.
 * This Next.js Server Action links the store to the user's organization.
 */
export async function storeConnectAction(formData: FormData) {
  const domain = formData.get('domain') as string
  const supabase = createClient()

  if (!domain) {
    console.error('Store connect validation failed: missing domain')
    return
  }

  // 1. Get current authenticated user session
  const { data: userSession, error: authError } = await supabase.auth.getSession()

  if (authError || !userSession.session) {
    redirect('/login')
  }

  const userId = userSession.session.user.id

  // 2. Find the Organization ID for the current user
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

  // 3. Securely insert the new store data
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
