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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Parse payload
        const { priceId, organizationId } = await request.json()

        if (!priceId || !organizationId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        // 3. Verify Ownership & Get Current ID
        const { data: org } = (await supabase
            .from('organizations')
            .select('stripe_customer_id, owner_user_id, name, email')
            .eq('id', organizationId)
            .single()) as unknown as { data: any }

        if (!org || org.owner_user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        let customerId = org.stripe_customer_id as string | null
        let shouldCreateNewCustomer = !customerId

        // SELF-HEALING LOGIC: Verify the ID actually exists in Stripe
        if (customerId) {
            try {
                const customer = await stripe.customers.retrieve(customerId)
                // If Stripe returns a "deleted" object, we must create a new one
                if ((customer as Stripe.DeletedCustomer).deleted) {
                    console.warn(`⚠️ Customer ${customerId} was deleted in Stripe. Generating new one.`)
                    shouldCreateNewCustomer = true
                }
            } catch (error) {
                // If Stripe throws "resource_missing", the ID is invalid
                console.warn(`⚠️ Customer ${customerId} not found in Stripe. Generating new one.`)
                shouldCreateNewCustomer = true
            }
        }

        // 4. JIT Customer Creation (If missing or invalid)
        if (shouldCreateNewCustomer) {
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

        // 5. Generate checkout session
        const resolvedCustomerId = customerId as string

        const session = await stripe.checkout.sessions.create({
            customer: resolvedCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
            metadata: {
                organizationId,
            },
            subscription_data: {
                metadata: {
                    organizationId,
                },
            },
            allow_promotion_codes: true,
        })

        return NextResponse.json({ url: session.url })
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
