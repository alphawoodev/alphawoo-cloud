import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: Request) {
  const rawBody = await request.text()
  
  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody)
  } catch (e) {
    console.error('JSON Parse Error:', e)
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const storeId = payload.aw_store_id as string
  const signature = payload.aw_signature as string

  if (!storeId || !signature) {
    return NextResponse.json({ error: 'Missing security payload data (aw_store_id/aw_signature)' }, { status: 400 })
  }

  // 1. Reconstruct the Canonical Payload for Verification (Bible 12.1)
  // We must match PHP's ksort() and json_encode() behavior.
  const payloadToSign = { ...payload }
  delete payloadToSign.aw_store_id
  delete payloadToSign.aw_signature
  delete payloadToSign.aw_timestamp_utc
  
  // Remove "deep_data" if present, as PHP excludes it from signing
  if (payloadToSign.deep_data) {
    delete payloadToSign.deep_data
  }

  // Sort keys alphabetically to match PHP ksort()
  const sortedKeys = Object.keys(payloadToSign).sort()
  const sortedPayload: Record<string, any> = {}
  sortedKeys.forEach(key => {
    sortedPayload[key] = payloadToSign[key]
  })

  // Note: We assume standard JSON.stringify matches PHP's output for these simple fields.
  // Complex characters (<, >) might cause mismatch due to PHP's JSON_HEX_TAG.
  const rawBodyToVerify = JSON.stringify(sortedPayload)

  // 2. Secure Database Lookup
  // Use Service Role Key to bypass RLS and read sensitive API Key + Shadow Mode
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: storeData, error: dbError } = await supabase
    .from('stores')
    .select('api_key, shadow_mode')
    .eq('id', storeId)
    .single()

  if (dbError || !storeData) {
    console.error('Store lookup failed:', dbError?.message || 'No store found')
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
  }

  const { api_key, shadow_mode } = storeData

  // 3. Verify HMAC Signature
  const expectedSignature = crypto.createHmac('sha256', api_key).update(rawBodyToVerify).digest('hex')

  if (expectedSignature !== signature) {
    console.warn(`HMAC Mismatch for Store ${storeId}`)
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 403 })
  }

  // 4. Forward to Make.com (The "Make.com Logic" Requirement)
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL
  if (makeWebhookUrl) {
    // Construct the specific payload requested by the Blueprint
    const makePayload = {
      cart_id: payload.order_id, // Mapping order_id to cart_id as requested
      store_id: storeId,
      customer_email: payload.customer_email,
      total_amount: payload.order_total,
      currency: payload.currency,
      store_shadow_mode: shadow_mode, // Injected from DB
      event_type: payload.event_type,
      // Pass through deep data if needed, but Blueprint didn't explicitly ask for it
      deep_data: payload.deep_data || {} 
    }

    try {
      const makeResponse = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makePayload),
      })

      if (!makeResponse.ok) {
        console.error(`Make.com Webhook Failed: ${makeResponse.statusText}`)
      }
    } catch (err) {
      console.error('Failed to send to Make.com:', err)
    }
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
