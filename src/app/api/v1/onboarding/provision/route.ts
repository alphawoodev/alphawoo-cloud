import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
}

export async function POST(req: NextRequest) {
    try {
        // Phase 0 payload alignment
        const body = await req.json()
        const email = (body.email || body.admin_email || '').trim()
        const siteUrl = body.url || body.site_url
        const currency = body.currency
        const storeName = body.name || body.store_name

        if (!email || !siteUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
        }

        const cleanUrl = siteUrl.replace(/\/$/, '')

        const { data: existingStore } = await supabase
            .from('stores')
            .select(
                `id, api_key, organization_id, shadow_mode,
                 organizations (
                    owner_user_id,
                    users:owner_user_id ( email )
                 )`
            )
            .eq('url', cleanUrl)
            .single()

        // Auto-recovery: same owner gets keys back; otherwise block.
        if (existingStore) {
            // @ts-ignore nested select alias
            const ownerEmail = existingStore.organizations?.users?.email

            if (ownerEmail && ownerEmail.toLowerCase() === email.toLowerCase()) {
                return NextResponse.json(
                    {
                        success: true,
                        store_id: existingStore.id,
                        api_key: existingStore.api_key,
                        shadow_mode: existingStore.shadow_mode,
                        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${existingStore.id}`,
                        message: 'Recovered existing connection',
                    },
                    { status: 200, headers: corsHeaders }
                )
            }

            return NextResponse.json(
                { error: 'This store URL is already registered to another organization.' },
                { status: 409, headers: corsHeaders }
            )
        }

        // CREATE NEW FLOW (unchanged from earlier with normalized inputs)
        const tempPassword = uuidv4()
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: 'Store Admin' },
        })

        let userId = userData.user?.id

        if (createError) {
            console.error('Supabase Admin Create Error:', createError.message)

            if (createError.message.includes('already been registered') || createError.status === 422) {
                const { data: users } = await supabase.auth.admin.listUsers()
                const existingUser = users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())

                if (!existingUser) {
                    return NextResponse.json(
                        { error: 'User exists but ID not found.' },
                        { status: 500, headers: corsHeaders }
                    )
                }

                userId = existingUser.id
            } else {
                return NextResponse.json(
                    { error: `User creation failed: ${createError.message}` },
                    { status: 400, headers: corsHeaders }
                )
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'User creation returned no ID.' }, { status: 500, headers: corsHeaders })
        }

        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name: storeName || 'My Organization',
                owner_user_id: userId,
                plan_id: 'FREE',
                stripe_customer_id: null,
            })
            .select('id')
            .single()

        if (orgError) {
            console.error('Org Creation Error:', orgError)
            return NextResponse.json(
                { error: `Org creation failed: ${orgError.message}` },
                { status: 500, headers: corsHeaders }
            )
        }

        const newApiKey = 'aw_' + uuidv4().replace(/-/g, '')
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .insert({
                organization_id: org.id,
                name: storeName || 'WooCommerce Store',
                url: cleanUrl,
                currency_code: currency || 'USD',
                api_key: newApiKey,
                shadow_mode: true,
                active_modules: ['shadow_mode'],
            })
            .select('id')
            .single()

        if (storeError) {
            console.error('Store Creation Error:', storeError)
            return NextResponse.json(
                { error: `Store creation failed: ${storeError.message}` },
                { status: 500, headers: corsHeaders }
            )
        }

        await supabase.from('store_users').insert({
            user_id: userId,
            store_id: store.id,
            role: 'owner',
        })

        return NextResponse.json(
            {
                success: true,
                store_id: store.id,
                api_key: newApiKey,
                shadow_mode: true,
                dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${store.id}`,
                message: 'AlphaWoo Connected: Shadow Mode Active',
            },
            { status: 201, headers: corsHeaders }
        )
    } catch (error: any) {
        console.error('Provisioning Exception:', error)
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500, headers: corsHeaders }
        )
    }
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    })
}
