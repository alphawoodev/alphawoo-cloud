import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

type LogisticsItemPayload = {
    hs_code: string
    value?: number | string
    value_cents?: number | string
    quantity: number | string
}

type LogisticsGuardPayload = {
    store_id?: string
    country_code?: string
    currency?: string
    items?: LogisticsItemPayload[]
    aw_signature?: string
    aw_timestamp_utc?: string
}

type GeoRule = {
    hs_code: string
    duty_rate_percent: number
    vat_gst_rate_percent: number
    de_minimis_threshold_local_currency: number
}

type StoreConfig = {
    api_key: string
}

type NormalizedItem = {
    hs_code: string
    quantity: number
    value_cents: number
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
    const rawBody = await request.text()

    let payload: LogisticsGuardPayload
    try {
        payload = JSON.parse(rawBody)
    } catch (error) {
        console.error('Logistics Guard: Invalid JSON payload', error)
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    if (!isValidPayload(payload)) {
        return NextResponse.json({ error: 'Missing required payload fields.' }, { status: 400 })
    }

    const { store_id, aw_signature } = payload
    const canonicalPayload = buildCanonicalPayload(payload)

    // 1. Fetch Store Config
    const { data: storeData, error: storeLookupError } = await supabase
        .rpc('get_store_config', { _store_id: store_id })
        .single()

    if (storeLookupError || !storeData) {
        console.error('Logistics Guard: Store lookup failed', storeLookupError?.message)
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
    }

    // 2. HMAC Verification
    const { api_key } = storeData as StoreConfig
    const expectedSignature = crypto
        .createHmac('sha256', api_key)
        .update(canonicalPayload)
        .digest('hex')

    if (expectedSignature !== aw_signature) {
        console.warn(`Logistics Guard: Signature mismatch for store ${store_id}`)
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 })
    }

    let normalizedItems: NormalizedItem[]
    try {
        normalizedItems = normalizeItems(payload.items!)
    } catch (error: any) {
        console.error('Logistics Guard: Invalid item payload', error?.message)
        return NextResponse.json({ error: error?.message || 'Invalid item payload' }, { status: 422 })
    }

    // 3. Fetch geo rules via RPC for batch efficiency
    const hsCodes = Array.from(new Set(normalizedItems.map(item => item.hs_code)))

    const { data: geoRules, error: geoRuleError } = await supabase.rpc('fetch_geo_rules_for_items', {
        _store_id: store_id,
        _country_code: payload.country_code,
        _hs_codes: hsCodes
    })

    if (geoRuleError) {
        console.error('Logistics Guard: Geo rule lookup failed', geoRuleError.message)
        return NextResponse.json({ error_detail: 'Logistics data unavailable.' }, { status: 500 })
    }

    const materializedRules = (geoRules || []) as GeoRule[]
    const missingCodes = hsCodes.filter(code => !materializedRules.some(rule => rule.hs_code === code))
    if (missingCodes.length > 0) {
        return NextResponse.json({
            error: 'Missing geo rules for requested items',
            missing_hs_codes: missingCodes
        }, { status: 422 })
    }

    const costs = calculateCharges(normalizedItems, materializedRules)

    return NextResponse.json({
        duties: costs.duties_cents,
        taxes: costs.taxes_cents,
        currency: payload.currency,
        total_all_in_cents: costs.duties_cents + costs.taxes_cents,
        calculation_method: costs.calculation_method
    })
}

function isValidPayload(payload: LogisticsGuardPayload): payload is LogisticsGuardPayload & Required<Pick<LogisticsGuardPayload, 'store_id' | 'country_code' | 'currency' | 'items' | 'aw_signature'>> {
    return Boolean(
        payload.store_id &&
        payload.country_code &&
        payload.currency &&
        payload.aw_signature &&
        Array.isArray(payload.items) &&
        payload.items.length > 0
    )
}

function buildCanonicalPayload(payload: LogisticsGuardPayload): string {
    const payloadToSign: Record<string, unknown> = { ...payload }
    delete payloadToSign.aw_signature
    delete payloadToSign.aw_timestamp_utc
    delete payloadToSign.store_id

    const sortedKeys = Object.keys(payloadToSign).sort()
    const sortedPayload: Record<string, unknown> = {}
    sortedKeys.forEach(key => {
        sortedPayload[key] = payloadToSign[key]
    })

    return JSON.stringify(sortedPayload)
}

function normalizeItems(items: LogisticsItemPayload[]): NormalizedItem[] {
    return items.map(item => {
        if (!item.hs_code) {
            throw new Error('All items must include an hs_code.')
        }

        const quantity = Number(item.quantity)
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity for hs_code ${item.hs_code}.`)
        }

        const lineValueCents = resolveLineValueCents(item, quantity)
        if (!Number.isFinite(lineValueCents) || lineValueCents < 0) {
            throw new Error(`Invalid value for hs_code ${item.hs_code}.`)
        }

        return {
            hs_code: item.hs_code,
            quantity,
            value_cents: lineValueCents
        }
    })
}

function resolveLineValueCents(item: LogisticsItemPayload, quantity: number): number {
    if (item.value_cents !== undefined) {
        const rawCents = Number(item.value_cents)
        if (!Number.isFinite(rawCents)) {
            throw new Error(`value_cents must be numeric for hs_code ${item.hs_code}.`)
        }
        return Math.round(rawCents)
    }

    const rawValue = typeof item.value === 'string' ? parseFloat(item.value) : item.value
    if (rawValue === undefined || !Number.isFinite(rawValue)) {
        throw new Error(`value must be numeric for hs_code ${item.hs_code}.`)
    }
    const unitValue = Number(rawValue)
    return Math.round(unitValue * 100 * quantity)
}

function calculateCharges(items: NormalizedItem[], rules: GeoRule[]) {
    let dutiesTotal = 0
    let taxesTotal = 0

    for (const item of items) {
        const rule = rules.find(r => r.hs_code === item.hs_code)
        if (!rule) {
            continue
        }

        const itemValue = item.value_cents / 100
        const threshold = rule.de_minimis_threshold_local_currency || 0

        if (itemValue <= threshold) {
            continue
        }

        const dutyAmount = (itemValue * (rule.duty_rate_percent || 0)) / 100
        dutiesTotal += dutyAmount

        const taxAmount = (itemValue * (rule.vat_gst_rate_percent || 0)) / 100
        taxesTotal += taxAmount
    }

    const dutiesCents = Math.round(dutiesTotal * 100)
    const taxesCents = Math.round(taxesTotal * 100)

    return {
        duties_cents: dutiesCents,
        taxes_cents: taxesCents,
        calculation_method: (dutiesCents + taxesCents) > 0 ? 'DDP_CALCULATED' : 'DDU_ASSUMED'
    }
}
