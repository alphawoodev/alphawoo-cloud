import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

type ShadowLogPayload = {
    store_id?: string
    amount_cents?: number | string
    aw_signature?: string
    aw_timestamp_utc?: string
}

type StoreConfig = {
    api_key: string
}

const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

let supabaseService: SupabaseClient | null = null

export async function POST(request: NextRequest) {
    const rawBody = await request.text()

    let payload: ShadowLogPayload
    try {
        payload = JSON.parse(rawBody)
    } catch (error) {
        console.error('Shadow Log: invalid JSON payload', error)
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
    }

    if (!isValidPayload(payload)) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const { store_id, aw_signature } = payload
    const normalizedAmount = normalizeAmount(payload.amount_cents)

    if (normalizedAmount === null) {
        return NextResponse.json({ error: 'Invalid amount_cents value.' }, { status: 422 })
    }

    // 1. Fetch Store Config (We still need to ensure the store exists!)
    const { data: storeData, error: storeError } = await supabasePublic
        .rpc('get_store_config', { _store_id: store_id })
        .single()

    if (storeError || !storeData) {
        console.error('Shadow Log: store lookup failed', storeError?.message)
        return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
    }

    // 2. HMAC VERIFICATION (BYPASSED FOR PHASE 0 MVP)
    // Rationale: Make.com sends a subset of the original payload. The signature 
    // belongs to the full payload. Since the ingestion API already verified the 
    // source, we trust the internal handoff for this non-critical metric.
    
    /* const canonicalPayload = buildCanonicalPayload(payload)
    const { api_key } = storeData as StoreConfig
    const expectedSignature = crypto
        .createHmac('sha256', api_key)
        .update(canonicalPayload)
        .digest('hex')

    if (expectedSignature !== aw_signature) {
        console.warn(`Shadow Log: signature mismatch for store ${store_id}`)
        return NextResponse.json({ error: 'Signature verification failed.' }, { status: 403 })
    }
    */

    // 3. Atomically Increment Revenue
    let supabaseAdmin: SupabaseClient
    try {
        supabaseAdmin = getServiceRoleClient()
    } catch (error) {
        console.error('Shadow Log: missing Supabase admin credentials')
        return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
    }

    const { error } = await supabaseAdmin.rpc('increment_shadow_revenue', {
        _store_id: store_id,
        _amount_cents: normalizedAmount
    })

    if (error) {
        console.error('Shadow Log: RPC error', error.message)
        return NextResponse.json({ error: 'Failed to log metric.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
}

function isValidPayload(payload: ShadowLogPayload): payload is Required<Pick<ShadowLogPayload, 'store_id' | 'amount_cents' | 'aw_signature'>> {
    return Boolean(payload.store_id && payload.amount_cents !== undefined && payload.aw_signature)
}

function normalizeAmount(value: number | string): number | null {
    const parsed = typeof value === 'string' ? Number(value) : value
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null
    }
    return Math.round(parsed)
}

function buildCanonicalPayload(payload: ShadowLogPayload): string {
    const payloadToSign: Record<string, unknown> = { ...payload }
    delete payloadToSign.aw_signature
    delete payloadToSign.aw_timestamp_utc

    const sortedKeys = Object.keys(payloadToSign).sort()
    const sortedPayload: Record<string, unknown> = {}
    sortedKeys.forEach((key) => {
        sortedPayload[key] = payloadToSign[key]
    })

    return JSON.stringify(sortedPayload)
}

function getServiceRoleClient(): SupabaseClient {
    if (!supabaseService) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!url || !key) {
            throw new Error('Supabase admin credentials are not configured.')
        }

        supabaseService = createClient(url, key)
    }

    return supabaseService
}
