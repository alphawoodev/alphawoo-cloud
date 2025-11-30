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
    redirect('/app/stores/setup?error=missing_domain')
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

    const { data: existingStoreData, error: existingLookupError } = await supabase
      .from('stores')
      .select('id, deleted_at, organization_id')
      .eq('woocommerce_domain', domain)
      .maybeSingle()

    const existingStore = existingStoreData as {
      id: string
      deleted_at: string | null
      organization_id: string
    } | null

    if (existingLookupError && existingLookupError.code !== 'PGRST116') {
      console.error('Existing store lookup failed:', existingLookupError.message)
      redirect('/app/stores/setup?error=store_create_failed')
    }

    if (existingStore && existingStore.organization_id !== organizationId && !existingStore.deleted_at) {
      redirect('/app/stores/setup?error=domain_exists')
    }

    let targetStoreId = newStoreId
    if (existingStore && existingStore.deleted_at) {
      targetStoreId = existingStore.id
      const { error: reviveError } = await supabase
        .from('stores')
        .update(
          {
            deleted_at: null,
            api_key: newApiKey,
            organization_id: organizationId,
            shadow_mode: true,
          } as any,
        )
        .eq('id', targetStoreId)
        .eq('organization_id', organizationId)

      if (reviveError) {
        console.error('Store revival failed:', reviveError.message)
        redirect('/app/stores/setup?error=store_create_failed')
      }
    } else if (!existingStore) {
      const { error: storeError } = await supabase.from('stores').insert([
        {
          id: targetStoreId,
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

        if (storeError.code === '23505') {
          redirect('/app/stores/setup?error=domain_exists')
        }

        redirect('/app/stores/setup?error=store_create_failed')
      }
    } else {
      redirect('/app/stores/setup?error=domain_exists')
    }

    const encodedDomain = encodeURIComponent(domain)
    const encodedKey = encodeURIComponent(newApiKey)
    revalidatePath('/app/stores')
    redirect(`/app/stores/confirm?storeId=${targetStoreId}&domain=${encodedDomain}&apiKey=${encodedKey}`)
  } catch (error: any) {
    const isNextRedirect = error && typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT')
    if (isNextRedirect) {
      throw error
    }

    if (error?.message?.includes('Unauthorized')) {
      redirect('/login')
    }

    console.error('Critical Server Action Failure:', error)
    return
  }
}
