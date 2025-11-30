'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getServerActionUser } from '@/lib/supabase/server-action-client'

export async function toggleShadowModeAction(storeId: string, newShadowModeState: boolean) {
  try {
    const user = await getServerActionUser()
    const supabase = await createClient()

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (orgError || !organization) {
      console.error('[ShadowMode] Organization lookup failed:', orgError?.message)
      return { success: false, error: 'Organization not found.' }
    }

    const { error: updateError } = await supabase
      .from('stores')
      .update({ shadow_mode: newShadowModeState })
      .eq('id', storeId)
      .eq('organization_id', organization.id)

    if (updateError) {
      console.error(`[ShadowMode] Update failed for store ${storeId}:`, updateError.message)
      return { success: false, error: 'Database update failed.' }
    }

    revalidatePath(`/app/stores/${storeId}`)
    return { success: true, message: 'Operational mode updated.' }
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return { success: false, error: 'Session expired or unauthorized.' }
    }

    console.error('[ShadowMode] Unexpected Server Action Error:', error)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function deleteStoreAction(storeId: string) {
  try {
    const user = await getServerActionUser()
    const supabase = await createClient()

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (orgError || !organization) {
      console.error('[DeleteStore] Organization lookup failed:', orgError?.message)
      return { success: false, error: 'Organization not found.' }
    }

    const { error: deleteError } = await supabase
      .from('stores')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', storeId)
      .eq('organization_id', organization.id)

    if (deleteError) {
      console.error(`[DeleteStore] Failure for store ${storeId}:`, deleteError.message)
      return { success: false, error: 'Database deletion failed.' }
    }

    revalidatePath('/app/stores')
    redirect('/app/stores')
  } catch (error: any) {
    if (error && typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT')) {
      throw error
    }
    if (error?.message?.includes('Unauthorized')) {
      redirect('/login')
    }
    console.error('[DeleteStore] Unexpected Server Action Error:', error)
    return { success: false, error: 'An unexpected error occurred during deletion.' }
  }
}
