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
        const { admin_email, site_url, currency, store_name } = await req.json()

        if (!admin_email || !site_url) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
        }

        const cleanUrl = site_url.replace(/\/$/, '')

        const { data: existingStore } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('url', cleanUrl)
            .single()

        if (existingStore) {
            const { data: users } = await supabase.auth.admin.listUsers()
            const existingUser = users.users.find(
                (user) => user.email?.toLowerCase() === admin_email.toLowerCase()
            )

            if (existingUser) {
                const { data: link } = await supabase
                    .from('store_users')
                    .select('role')
                    .eq('user_id', existingUser.id)
                    .eq('store_id', existingStore.id)
                    .single()

                if (link) {
                    const { data: fullStore } = await supabase
                        .from('stores')
                        .select('id, api_key, shadow_mode')
                        .eq('id', existingStore.id)
                        .single()

                    if (fullStore) {
                        return NextResponse.json(
                            {
                                success: true,
                                store_id: fullStore.id,
                                api_key: fullStore.api_key,
                                shadow_mode: fullStore.shadow_mode,
                                dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${fullStore.id}`,
                                message: 'AlphaWoo Re-Connected'
                            },
                            { status: 200, headers: corsHeaders }
                        )
                    }
                }
            }

            return NextResponse.json(
                {
                    error: 'This store URL is already registered to another organization. Please contact support to transfer ownership.'
                },
                { status: 409, headers: corsHeaders }
            )
        }

        const tempPassword = uuidv4()
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: admin_email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: 'Store Admin' }
        })

        let userId = userData.user?.id

        if (createError) {
            console.error('Supabase Admin Create Error:', createError.message)

            if (createError.message.includes('already been registered') || createError.status === 422) {
                const { data: users } = await supabase.auth.admin.listUsers()
                const existingUser = users.users.find(
                    (user) => user.email?.toLowerCase() === admin_email.toLowerCase()
                )

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
                name: store_name || 'My Organization',
                owner_user_id: userId,
                plan_id: 'FREE',
                stripe_customer_id: null
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
                name: store_name || 'WooCommerce Store',
                url: cleanUrl,
                currency_code: currency || 'USD',
                api_key: newApiKey,
                shadow_mode: true,
                active_modules: ['shadow_mode']
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
            role: 'owner'
        })

        return NextResponse.json(
            {
                success: true,
                store_id: store.id,
                api_key: newApiKey,
                shadow_mode: true,
                dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${store.id}`,
                message: 'AlphaWoo Connected: Shadow Mode Active'
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
