import { NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function POST(request: Request) {
  const rawBody = await request.text()
  console.log('DEBUG: Raw Payload received:', rawBody.substring(0, 500))

  let payload: Record<string, any>
  try {
    payload = JSON.parse(rawBody)
  } catch (e) {
    console.error('JSON Parse Error on:', rawBody)
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const storeId = payload.aw_store_id as string
  const signature = payload.aw_signature as string

  if (!storeId || !signature) {
    console.error('Missing body credentials. Received keys:', Object.keys(payload))
    return NextResponse.json({ error: 'Missing security payload data (aw_store_id/aw_signature)' }, { status: 400 })
  }

  const payloadToSign = { ...payload }
  delete payloadToSign.aw_store_id
  delete payloadToSign.aw_signature
  delete payloadToSign.aw_timestamp_utc

  const rawBodyToVerify = JSON.stringify(payloadToSign, Object.keys(payloadToSign).sort())

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: storeData, error: dbError } = await supabase.from('stores').select('api_key').eq('id', storeId)

  if (dbError || !storeData || storeData.length === 0) {
    console.error('Store lookup failed:', dbError?.message || 'No store found')
    return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 })
  }

  const apiKey = storeData[0].api_key

  const expectedSignature = crypto.createHmac('sha256', apiKey).update(rawBodyToVerify).digest('hex')

  if (expectedSignature !== signature) {
    console.warn(`HMAC Mismatch!`)
    console.warn(`Expected: ${expectedSignature}`)
    console.warn(`Received: ${signature}`)
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 403 })
  }

  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL
  if (makeWebhookUrl) {
    await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBodyToVerify,
    })
  }

  console.log(`✅ SUCCESS: Payload verified for Store: ${storeId}`)

  return NextResponse.json({ success: true }, { status: 200 })
}
