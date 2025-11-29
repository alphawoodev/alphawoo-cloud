// src/app/api/v1/event/route.ts
import { NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr' 
import crypto from 'crypto'

// The Ingestion API is strictly for Plugin traffic (Section 4)
export async function POST(request: Request) {
  
  // 1. Read Body and Parse Payload IMMEDIATELY
  const rawBody = await request.text()
  
  let payload: Record<string, any>; 
  try {
    payload = JSON.parse(rawBody)
  } catch (e) {
    // If the request body isn't valid JSON, reject it
    console.warn("DEBUG: Invalid JSON payload received. Payload start:", rawBody.substring(0, 50));
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // 2. Extract Security Credentials from the Body (FINAL FIX: Bypassing headers)
  const storeId = payload.aw_store_id as string
  const signature = payload.aw_signature as string
  
  if (!storeId || !signature) {
    // This is the correct guard rail against missing *body* credentials
    return NextResponse.json({ error: 'Missing security payload data (aw_store_id/aw_signature)' }, { status: 400 })
  }

  // 3. Prepare Payload for Verification (Remove security fields)
  // This is the portion of the payload the client signed.
  const payloadToSign = { ...payload }
  delete payloadToSign.aw_store_id
  delete payloadToSign.aw_signature
  delete payloadToSign.aw_timestamp_utc;
  const rawBodyToVerify = JSON.stringify(payloadToSign, Object.keys(payloadToSign).sort()); 

  // 4. Retrieve API Key from the Data SSOT (Now safe to do)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: storeData, error: dbError } = await supabase
    .from('stores')
    .select('api_key')
    .eq('id', storeId)
        
  if (dbError || !storeData || storeData.length === 0) {
    console.error('Store lookup failed:', dbError?.message);
    // Log the error returned by Supabase
    return NextResponse.json({ error: 'Unauthorized access (Store ID not found or RLS block).' }, { status: 401 });
  }

  // Extract the API Key from the first (and only expected) result
  const apiKey = storeData[0].api_key;

  // 5. HMAC Signature Verification (The core security logic)
  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(rawBodyToVerify)
    .digest('hex')

  // --- DEBUG LOGGING: CRITICAL DIAGNOSTIC STEP ---
  console.log("DEBUG: --- HMAC CHECK ---");
  console.log("DEBUG: Store ID:", storeId);
  console.log("DEBUG: Raw Body to Verify:", rawBodyToVerify);
  console.log("DEBUG: Expected Signature:", expectedSignature);
  console.log("DEBUG: Received Signature:", signature);
  console.log("DEBUG: --- END CHECK ---");
  // ------------------------------------------------
  
  if (expectedSignature !== signature) {
    console.warn(`HMAC Mismatch for Store ID: ${storeId}. Payload Tampered.`)
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 403 })
  }
  
  // 6. Successful Verification: Forward to Make.com
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL
  
  if (makeWebhookUrl) {
      await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: rawBodyToVerify, // Forwarding the clean, verified body
      });
  }
  
  console.log(`Payload received and verified for Store: ${storeId}. Event Type: ${payload.event_type}`)

  // 7. Return Success
  return NextResponse.json({ success: true, message: 'Payload received and authenticated.' }, { status: 200 })
}
