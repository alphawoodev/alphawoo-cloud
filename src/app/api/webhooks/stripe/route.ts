import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!stripeSecretKey || !stripeWebhookSecret) {
    throw new Error('Stripe environment variables are not configured.')
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin credentials are not configured.')
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const HANDLED_EVENT_TYPES = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'checkout.session.completed'
])

export async function POST(request: NextRequest) {
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
    }

    const rawBody = await request.text()
    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
    } catch (error: any) {
        console.error('Stripe webhook signature verification failed:', error?.message)
        return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
    }

    if (HANDLED_EVENT_TYPES.has(event.type)) {
        try {
            await handleBillingEvent(event)
        } catch (error) {
            console.error(`Stripe webhook handling failed for ${event.type}:`, error)
            return NextResponse.json({ error: 'Server error processing event.' }, { status: 500 })
        }
    } else {
        console.log(`Stripe webhook received unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
}

async function handleBillingEvent(event: Stripe.Event) {
    const dataObject = event.data.object as Record<string, any>
    const customerId: string | null = dataObject.customer || null

    if (!customerId) {
        console.warn(`Stripe event ${event.type} missing customer identifier.`)
        return
    }

    const planUpdate: Record<string, any> = mapEventToPlanUpdate(event, dataObject)

    if (Object.keys(planUpdate).length === 0) {
        return
    }

    const { error } = await supabase
        .from('organizations')
        .update(planUpdate)
        .eq('stripe_customer_id', customerId)

    if (error) {
        throw new Error(`DB update failed: ${error.message}`)
    }
}

function mapEventToPlanUpdate(event: Stripe.Event, dataObject: Record<string, any>): Record<string, any> {
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const priceLookupKey = dataObject.items?.data?.[0]?.price?.lookup_key || null
            return {
                stripe_subscription_id: dataObject.id,
                plan_id: priceLookupKey ? priceLookupKey.toUpperCase() : 'UNKNOWN'
            }
        }
        case 'customer.subscription.deleted':
            return { plan_id: 'FREE' }
        case 'invoice.payment_failed':
            return { plan_id: 'PAST_DUE' }
        case 'checkout.session.completed':
            return { stripe_customer_id: dataObject.customer }
        default:
            return {}
    }
}
