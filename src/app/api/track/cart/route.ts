import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    // 1. Data Validation
    const {
      organization_id,
      email,
      cart_key,
      cart_total,
      currency,
      checkout_url,
      items
    } = body

    // 2. "No Email No Lead" Guard
    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 202 })
    }

    // 3. Call the Smart RPC
    const { error } = await supabase.rpc('ingest_cart_v3', {
      p_organization_id: organization_id,
      p_email: email,
      p_cart_key: cart_key,
      p_currency: currency,
      p_amount: cart_total,
      p_items: items,
      p_checkout_url: checkout_url
    })

    if (error) {
      console.error('RPC Error:', error)
      // Still return 202 to not break checkout
      return NextResponse.json({ ok: true, error: 'Ingest Failed' }, { status: 202 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    // Fail silently
    return NextResponse.json({ ok: true }, { status: 202 })
  }
}
