import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

type ResolutionPayload = {
    store_id?: string
    customer_email?: string
    order_id?: string
    issue_type?: 'WISMO' | 'ADDRESS_CHANGE' | 'RETURN_REQUEST'
    aw_signature?: string
    aw_timestamp_utc?: string
}

type CustomerMetrics = {
    customer_id: string
    store_id: string
    customer_segment: string
    retention_risk_score: number
    lifetime_value: number
}

type ResolutionPlan = {
    resolution_type: string
    message_to_customer: string
    coupon_code: string | null
    next_action: string
    customer_segment: string
    retention_risk_score: number | null
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ISSUE_TYPES = new Set(['WISMO', 'ADDRESS_CHANGE', 'RETURN_REQUEST'])

export async function POST(request: NextRequest) {
    const rawBody = await request.text()

    let payload: ResolutionPayload
    try {
        payload = JSON.parse(rawBody)
    } catch (error) {
        console.error('Resolution Agent: Invalid JSON payload', error)
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
    }

    if (!isValidPayload(payload)) {
        return NextResponse.json({ error: 'Missing or invalid payload fields.' }, { status: 400 })
    }

    const canonicalPayload = buildCanonicalPayload(payload)

    // 1. Fetch Store Config + HMAC verification material
    const { data: storeData, error: storeError } = await supabase
        .rpc('get_store_config', { _store_id: payload.store_id })
        .single()

    if (storeError || !storeData) {
        console.error('Resolution Agent: store lookup failed', storeError?.message)
        return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
    }

    const expectedSignature = crypto
        .createHmac('sha256', (storeData as { api_key: string }).api_key)
        .update(canonicalPayload)
        .digest('hex')

    if (expectedSignature !== payload.aw_signature) {
        console.warn(`Resolution Agent: signature mismatch for store ${payload.store_id}`)
        return NextResponse.json({ error: 'Signature verification failed.' }, { status: 403 })
    }

    // 2. Fetch CLV metrics
    const metrics = await getCustomerMetrics(payload.store_id, payload.customer_email.toLowerCase())

    // 3. Determine resolution
    const resolution = determineResolution(payload.issue_type, metrics)

    return NextResponse.json(resolution, { status: 200 })
}

function isValidPayload(payload: ResolutionPayload): payload is Required<Omit<ResolutionPayload, 'aw_timestamp_utc'>> {
    return Boolean(
        payload.store_id &&
        payload.customer_email &&
        payload.order_id &&
        payload.aw_signature &&
        payload.issue_type &&
        ISSUE_TYPES.has(payload.issue_type)
    )
}

function buildCanonicalPayload(payload: ResolutionPayload): string {
    const payloadToSign: Record<string, unknown> = { ...payload }
    delete payloadToSign.aw_signature
    delete payloadToSign.aw_timestamp_utc
    delete payloadToSign.store_id

    const sortedKeys = Object.keys(payloadToSign).sort()
    const sortedPayload: Record<string, unknown> = {}
    sortedKeys.forEach((key) => {
        sortedPayload[key] = payloadToSign[key]
    })

    return JSON.stringify(sortedPayload)
}

async function getCustomerMetrics(storeId: string, email: string): Promise<CustomerMetrics | null> {
    try {
        const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('email', email)
            .single()

        if (customerError || !customerData) {
            return null
        }

        const { data: metrics, error: metricsError } = await supabase
            .from('customer_clv_metrics')
            .select('customer_id, store_id, customer_segment, retention_risk_score, lifetime_value')
            .eq('customer_id', customerData.id)
            .eq('store_id', storeId)
            .single()

        if (metricsError || !metrics) {
            return null
        }

        return metrics as CustomerMetrics
    } catch (error) {
        console.error('Resolution Agent: metrics lookup failed', error)
        return null
    }
}

function determineResolution(
    issueType: 'WISMO' | 'ADDRESS_CHANGE' | 'RETURN_REQUEST',
    metrics: CustomerMetrics | null
): ResolutionPlan {
    const segment = metrics?.customer_segment || 'NEW'
    const risk = metrics?.retention_risk_score || 0

    if (issueType === 'WISMO') {
        if (segment === 'VIP' || risk > 70) {
            return {
                resolution_type: 'VIP_RESOLUTION_OFFER',
                message_to_customer: 'We noticed the delay and have issued a $10 credit to your account. Your tracking is now updated.',
                coupon_code: 'RESOLVE10',
                next_action: 'TRIGGER_POSTMARK_EMAIL_VIP',
                customer_segment: segment,
                retention_risk_score: risk
            }
        }

        return {
            resolution_type: 'STANDARD_TRACKING_UPDATE',
            message_to_customer: 'Your order is currently in transit. Please use the tracking link provided.',
            coupon_code: null,
            next_action: 'TRIGGER_POSTMARK_EMAIL_STANDARD',
            customer_segment: segment,
            retention_risk_score: risk
        }
    }

    return {
        resolution_type: 'HUMAN_ESCALATION',
        message_to_customer: 'We are escalating your complex request to a human agent now.',
        coupon_code: null,
        next_action: 'CREATE_HIGH_PRIORITY_TICKET',
        customer_segment: segment,
        retention_risk_score: risk
    }
}
