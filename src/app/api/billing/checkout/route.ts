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

        // 3. Verify ownership
        const { data: org } = (await supabase
            .from('organizations')
            .select('stripe_customer_id, owner_user_id, name')
            .eq('id', organizationId)
            .single()) as unknown as { data: any }

        if (!org || org.owner_user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        let customerId = org.stripe_customer_id as string | null

        // 4. JIT Customer creation
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                name: org.name || 'AlphaWoo Agency',
                metadata: {
                    supabaseOrgId: organizationId,
                    alphaWooVersion: '8.5',
                },
            })

            customerId = customer.id

            await supabase
                .from('organizations')
                // @ts-ignore: stripe_customer_id column exists in runtime schema
                .update({ stripe_customer_id: customerId } as any)
                .eq('id', organizationId)
        }

        // 5. Generate checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
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
