import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const { store_id, api_key } = await req.json()

        if (!store_id || !api_key) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Verify credentials match a real store
        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('id', store_id)
            .eq('api_key', api_key)
            .single()

        if (!store) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 403 })
        }

        // 2. DELETE the store (Phase 0: hard delete to avoid duplicates)
        const { error: deleteError } = await supabase.from('stores').delete().eq('id', store_id)

        if (deleteError) {
            throw deleteError
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Disconnect Error:', error)
        return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })
    }
}
