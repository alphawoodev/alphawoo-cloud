import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!url || !key) {
            throw new Error('Supabase credentials missing for browser ingest endpoint.')
        }

        supabaseClient = createClient(url, key)
    }

    return supabaseClient
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { store_id, email, cart_hash, total_amount } = body || {}

        if (!store_id || !email || typeof total_amount === 'undefined') {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        const supabase = getSupabaseClient()

        const { data: storeData } = await supabase.rpc('get_store_config', { _store_id: store_id }).single()

        if (!storeData) {
            return NextResponse.json({ status: 'ignored' }, { status: 200 })
        }

        const { shadow_mode } = storeData as { shadow_mode: boolean }

        if (shadow_mode) {
            const amountCents = Math.round(Number(total_amount) * 100)

            if (amountCents > 0) {
                await supabase.rpc('increment_shadow_revenue', {
                    _store_id: store_id,
                    _amount_cents: amountCents
                })
            }

            return NextResponse.json({ status: 'logged_shadow' }, { status: 200 })
        }

        // Active mode placeholder for future flows
        return NextResponse.json({ status: 'received' }, { status: 200 })
    } catch (error) {
        console.error('Browser ingest error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
