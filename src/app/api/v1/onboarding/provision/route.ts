import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const adminEmail = (body.admin_email || body.email || '').trim()
        const siteUrl = body.site_url || body.url
        const storeName = body.store_name || body.name || 'WooCommerce Store'
        const currency = body.currency || 'USD'

        if (!adminEmail || !siteUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
        }

        const cleanUrl = siteUrl.replace(/\/$/, '')

        // Resolve/create user
        const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            email_confirm: true,
        })

        let userId = createdUser.user?.id

        if (createUserError) {
            if (createUserError.message?.includes('already been registered') || createUserError.status === 422) {
                const { data: usersList } = await supabaseAdmin.auth.admin.listUsers()
                const found = usersList.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase())
                if (!found) {
                    return NextResponse.json(
                        { error: 'User exists but ID not found.' },
                        { status: 500, headers: corsHeaders }
                    )
                }
                userId = found.id
            } else {
                return NextResponse.json(
                    { error: `User creation failed: ${createUserError.message}` },
                    { status: 400, headers: corsHeaders }
                )
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'User resolution failed.' }, { status: 500, headers: corsHeaders })
        }

        // Resolve/create organization for this user
        const { data: existingOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('owner_user_id', userId)
            .single()

        let targetOrgId = existingOrg?.id

        if (!targetOrgId) {
            const { data: newOrg, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: `${storeName} Org`,
                    owner_user_id: userId,
                    plan_id: 'FREE',
                    stripe_customer_id: null,
                })
                .select('id')
                .single()

            if (orgError || !newOrg) {
                return NextResponse.json(
                    { error: `Org creation failed: ${orgError?.message || 'unknown error'}` },
                    { status: 500, headers: corsHeaders }
                )
            }

            targetOrgId = newOrg.id
        }

        // Check for existing store by URL
        const { data: existingStore } = await supabaseAdmin
            .from('stores')
            .select('id, api_key, organization_id')
            .eq('url', cleanUrl)
            .single()

        if (existingStore) {
            if (existingStore.organization_id !== targetOrgId) {
                const { error: transferError } = await supabaseAdmin
                    .from('stores')
                    .update({ organization_id: targetOrgId })
                    .eq('id', existingStore.id)

                if (transferError) {
                    return NextResponse.json(
                        { error: `Transfer failed: ${transferError.message}` },
                        { status: 500, headers: corsHeaders }
                    )
                }
            }

            // Ensure store_users entry for new owner
            await supabaseAdmin
                .from('store_users')
                .upsert({ user_id: userId, store_id: existingStore.id, role: 'owner' }, { onConflict: 'user_id,store_id' })

            return NextResponse.json(
                {
                    success: true,
                    store_id: existingStore.id,
                    api_key: existingStore.api_key,
                    message: 'Connection Successful (Ownership Transferred)',
                },
                { status: 200, headers: corsHeaders }
            )
        }

        // Create new store
        const newApiKey = 'aw_' + crypto.randomUUID().replace(/-/g, '')
        const { data: newStore, error: createStoreError } = await supabaseAdmin
            .from('stores')
            .insert({
                organization_id: targetOrgId,
                name: storeName,
                url: cleanUrl,
                currency_code: currency,
                api_key: newApiKey,
                shadow_mode: true,
                active_modules: ['shadow_mode'],
            })
            .select('id, api_key')
            .single()

        if (createStoreError || !newStore) {
            return NextResponse.json(
                { error: `Store creation failed: ${createStoreError?.message || 'unknown error'}` },
                { status: 500, headers: corsHeaders }
            )
        }

        await supabaseAdmin
            .from('store_users')
            .upsert({ user_id: userId, store_id: newStore.id, role: 'owner' }, { onConflict: 'user_id,store_id' })

        return NextResponse.json(
            {
                success: true,
                store_id: newStore.id,
                api_key: newStore.api_key,
                message: 'Connection Successful',
            },
            { status: 201, headers: corsHeaders }
        )
    } catch (error: any) {
        console.error('Provision Error:', error)
        return NextResponse.json({ error: 'Provisioning Failed: ' + error.message }, { status: 500, headers: corsHeaders })
    }
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    })
}
