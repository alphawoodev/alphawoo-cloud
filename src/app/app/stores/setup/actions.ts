'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
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
      console.error('DEBUG: Store insertion failed.')
      console.error('DEBUG: Postgres Code:', storeError.code)
      console.error('DEBUG: Postgres Message:', storeError.message)

      // Optional: map common constraint violation for observability without changing return type
      if (storeError.code === '23505') {
        console.error('DEBUG: Unique constraint violated for domain/api key.')
      }

      return
    }

    const encodedDomain = encodeURIComponent(domain)
    const encodedKey = encodeURIComponent(newApiKey)
    revalidatePath('/app/stores')
    redirect(`/app/stores/confirm?storeId=${newStoreId}&domain=${encodedDomain}&apiKey=${encodedKey}`)
  } catch (error: any) {
    if (error?.digest?.includes('NEXT_REDIRECT')) {
      throw error
    }

    if (error?.message?.includes('Unauthorized')) {
      redirect('/login')
    }

    console.error('Critical Server Action Failure:', error)
    return
  }
}
