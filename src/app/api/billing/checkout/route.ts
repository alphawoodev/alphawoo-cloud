import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Target the Clover release (type cast to allow pre-release API version)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover' as unknown as Stripe.LatestApiVersion,
    typescript: true,
})

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Authenticate User
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            console.error('❌ Checkout Failed: No User Session Found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Parse Payload
        const body = await request.json()
        const { priceId, organizationId } = body

        // --- DEBUG LOGS (Check Vercel Logs for this) ---
        console.log(`🔍 [Checkout Debug] User ID: ${user.id}`)
        console.log(`🔍 [Checkout Debug] Request Org ID: ${organizationId}`)
        // ------------------------------------------------

        if (!priceId || !organizationId) {
            console.error('❌ Checkout Failed: Missing Parameters', body)
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        // 3. Verify Ownership & Get Current ID
        const { data: org, error: dbError } = (await supabase
            .from('organizations')
            .select('stripe_customer_id, owner_user_id, name, email')
            .eq('id', organizationId)
            .single()) as unknown as { data: any; error: any }

        // --- DEBUG LOGS ---
        if (dbError) console.error(`❌ [Checkout Debug] DB Error: ${dbError.message}`)
        if (org) console.log(`🔍 [Checkout Debug] Found Org Owner: ${org.owner_user_id}`)
        // ------------------

        if (!org || org.owner_user_id !== user.id) {
            console.error('❌ Checkout Failed: Ownership Mismatch or Org Not Found')
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        let customerId = org.stripe_customer_id
        let shouldCreateNewCustomer = !customerId

        // SELF-HEALING LOGIC
        if (customerId) {
            try {
                const customer = await stripe.customers.retrieve(customerId)
                if ((customer as Stripe.DeletedCustomer).deleted) {
                    console.warn(`⚠️ Customer ${customerId} was deleted in Stripe. Generating new one.`)
                    shouldCreateNewCustomer = true
                }
            } catch (error) {
                console.warn(`⚠️ Customer ${customerId} not found in Stripe. Generating new one.`)
                shouldCreateNewCustomer = true
            }
        }

        // 4. JIT Customer Creation
        if (shouldCreateNewCustomer) {
            console.log(`⚙️ Creating new Stripe Customer for Org: ${organizationId}`)
            const customer = await stripe.customers.create({
                email: user.email,
                name: org.name || 'AlphaWoo Agency',
                metadata: {
                    supabaseOrgId: organizationId,
                    alphaWooVersion: '8.5',
                },
            })

            customerId = customer.id

            await supabase
                .from('organizations')
                // @ts-ignore: runtime schema includes stripe_customer_id
                .update({ stripe_customer_id: customerId } as any)
                .eq('id', organizationId)
        }

        // 5. Generate Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
            subscription_data: {
                metadata: { organizationId: organizationId },
            },
            allow_promotion_codes: true,
        })

        return NextResponse.json({ url: session.url })
    } catch (err: any) {
        console.error('🔥 Stripe Checkout Fatal Error:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
