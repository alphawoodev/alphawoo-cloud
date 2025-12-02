import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

// Stripe client (Clover release; cast to appease types)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover' as unknown as Stripe.LatestApiVersion,
    typescript: true,
})

// Supabase service-role client (bypasses RLS for system updates)
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: { autoRefreshToken: false, persistSession: false },
    }
)

export async function POST(req: Request) {
    const body = await req.text()
    const signature = (await headers()).get('stripe-signature') as string

    let event: Stripe.Event

    // 1) Verify signature
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`)
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
    }

    // 2) Handle events
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                await handleCheckoutCompleted(session)
                break
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionUpdated(subscription)
                break
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                await handleSubscriptionDeleted(subscription)
                break
            }
            default:
                console.log(`Unhandled event type: ${event.type}`)
        }
    } catch (error: any) {
        console.error(`❌ Webhook handler failed: ${error.message}`)
        return NextResponse.json({ error: 'Handler Failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}

// --- Helpers ---

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const orgId = session.metadata?.supabaseOrgId || session.metadata?.organizationId
    const subscriptionId = session.subscription as string

    if (!orgId) {
        console.error('❌ Missing organizationId in session metadata')
        return
    }

    console.log(`✅ Activating Protocol for Org: ${orgId}`)

    const { error } = await supabaseAdmin
        .from('organizations')
        // @ts-ignore: columns exist in runtime schema
        .update({
            subscription_status: 'active',
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
        } as any)
        .eq('id', orgId)

    if (error) throw error
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string
    const status = subscription.status

    const { error } = await supabaseAdmin
        .from('organizations')
        // @ts-ignore: columns exist in runtime schema
        .update({
            subscription_status: status,
            updated_at: new Date().toISOString(),
        } as any)
        .eq('stripe_customer_id', customerId)

    if (error) throw error
    console.log(`🔄 Subscription updated for Customer ${customerId}: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string

    const { error } = await supabaseAdmin
        .from('organizations')
        // @ts-ignore: columns exist in runtime schema
        .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
        } as any)
        .eq('stripe_customer_id', customerId)

    if (error) throw error
    console.log(`⚠️ Subscription canceled for Customer ${customerId}`)
}
