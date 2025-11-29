'use server'

import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

import { createClient } from '@/lib/supabase/server'

export async function storeConnectAction(formData: FormData) {
  const domain = formData.get('domain') as string

  if (!domain) {
    console.error('Store connect validation failed: missing domain')
    return
  }

  try {
    const supabase = createClient()

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

    redirect(
      `/app/stores/confirm?storeId=${newStoreId}&domain=${encodeURIComponent(domain)}&apiKey=${encodeURIComponent(newApiKey)}`,
    )
  } catch (error) {
    console.error('Critical Server Action Failure:', error)
    redirect('/login')
  }
}
