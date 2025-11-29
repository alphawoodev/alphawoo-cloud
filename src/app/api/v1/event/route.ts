// src/app/api/v1/event/route.ts
import { NextResponse } from 'next/server'
// FIX: We now import the 'createClient' helper, which correctly calls cookies() internally.
import { createClient } from '@/lib/supabase/server' // Secure Server Client
import crypto from 'crypto'

// The Ingestion API is strictly for Plugin traffic (Section 4)
export async function POST(request: Request) {
  // 1. Extract Headers and Signature
  const storeId = request.headers.get('X-AlphaWoo-Store-ID')
  const signature = request.headers.get('X-AlphaWoo-Signature')
  
  if (!storeId || !signature) {
    // Missing required security headers. Immediate 400 rejection.
    return NextResponse.json({ error: 'Missing security headers' }, { status: 400 })
  }

  // 2. Read Body and Get Raw Text (Crucial for HMAC verification)
  // We must use the raw text body BEFORE parsing it as JSON.
  const rawBody = await request.text()
  
  // 3. Retrieve API Key from the Data SSOT
  const supabase = createClient() // The fixed helper function is used here
  const { data: store, error: dbError } = await supabase
    .from('stores')
    .select('api_key')
    .eq('id', storeId)
    .single()

  if (dbError || !store) {
    console.error('Store lookup failed:', dbError?.message)
    // Avoid confirming the store ID exists to prevent enumeration attacks.
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
  }

  const apiKey = store.api_key

  // 4. HMAC Signature Verification (The core security logic)
  // This validates the integrity and authenticity of the payload (Section 4)
  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody)
    .digest('hex')

  if (expectedSignature !== signature) {
    // The signature doesn't match the one we generated. Tampered or incorrect key.
    console.warn(`HMAC Mismatch for Store ID: ${storeId}. Expected: ${expectedSignature}, Received: ${signature}`)
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 403 })
  }
  
  // 5. Successful Verification: Process the Data
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (e) {
    // Should not happen if the plugin is working correctly, but safe fail.
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // --- DAY 3: The First Flow Action ---
  // Forward the verified payload to Make.com via Webhook (Section 4)
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL
  
  if (makeWebhookUrl) {
      // NOTE: This fetch should ideally be non-blocking (e.g., pushed to a queue like QStash)
      // for true high-performance, but we use direct fetch for the POC (Queue, Section 4).
      await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
      });
  }
  
  // Log the receipt for analytics and verification
  console.log(`Payload received and verified for Store: ${storeId}. Event Type: ${payload.event_type}`)

  // 6. Return Success
  return NextResponse.json({ success: true, message: 'Payload received and authenticated.' }, { status: 200 })
}