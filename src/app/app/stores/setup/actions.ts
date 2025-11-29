'use server'

import crypto from 'crypto'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { getServerActionUser } from '@/lib/supabase/server-action-client'

export async function storeConnectAction(formData: FormData) {
  const domain = formData.get('domain') as string
  if (!domain) {
    console.error('Store connect validation failed: missing domain')
    return
  }

  let successRedirectUrl: string | null = null

  try {
    const user = await getServerActionUser()
    const supabase = await createSupabaseServerClient()

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
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

    const encodedDomain = encodeURIComponent(domain)
    const encodedKey = encodeURIComponent(newApiKey)
    successRedirectUrl = `/app/stores/confirm?storeId=${newStoreId}&domain=${encodedDomain}&apiKey=${encodedKey}`
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      redirect('/login')
    }

    console.error('Critical Server Action Failure:', error)
    return
  }

  if (successRedirectUrl) {
    redirect(successRedirectUrl)
  }
}
