import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const adminEmailRaw = (body.admin_email || body.email || '').trim()
        const adminEmail = adminEmailRaw.toLowerCase()
        const siteUrl = (body.site_url || body.url || '').trim()
        const storeName = body.store_name || body.name || 'WooCommerce Store'
        const currency = body.currency || 'USD'

        if (!adminEmail || !siteUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
        }

        const cleanUrl = siteUrl.replace(/\/$/, '')

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1) Resolve user via RPC (exact match, lowercased)
        const { data: existingUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_email', {
            email_input: adminEmail,
        })
        if (rpcError) {
            return NextResponse.json({ error: `RPC failed: ${rpcError.message}` }, { status: 500, headers: corsHeaders })
        }

        let userId = existingUserId as string | null
        let isNewUser = false

        if (!userId) {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: adminEmail,
                email_confirm: true,
                user_metadata: { source: 'plugin_provision' },
            })
            if (createError) {
                return NextResponse.json(
                    { error: `User creation failed: ${createError.message}` },
                    { status: 500, headers: corsHeaders }
                )
            }
            userId = newUser.user.id
            isNewUser = true
        }

        if (!userId) {
            return NextResponse.json({ error: 'User resolution failed.' }, { status: 500, headers: corsHeaders })
        }

        // 2) Resolve store first by URL to reuse its organization if it exists
        const { data: existingStore } = await supabaseAdmin
            .from('stores')
            .select('id, api_key, organization_id, url')
            .eq('url', cleanUrl)
            .single()

        // 3) Resolve/create organization (reusing store's org when present)
        let orgId: string
        if (existingStore?.organization_id) {
            orgId = existingStore.organization_id
        } else {
            const { data: newOrg, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert({
                    owner_user_id: userId,
                    name: storeName || 'New Store',
                    subscription_status: 'inactive',
                })
                .select('id')
                .single()

            if (orgError || !newOrg) {
                return NextResponse.json(
                    { error: `Org creation failed: ${orgError?.message || 'unknown error'}` },
                    { status: 500, headers: corsHeaders }
                )
            }
            orgId = newOrg.id
        }

        let storeId: string
        let apiKey: string

        if (existingStore) {
            storeId = existingStore.id
            apiKey = existingStore.api_key

            if (existingStore.organization_id !== orgId) {
                const { error: transferError } = await supabaseAdmin
                    .from('stores')
                    .update({ organization_id: orgId })
                    .eq('id', storeId)
                if (transferError) {
                    return NextResponse.json(
                        { error: `Store transfer failed: ${transferError.message}` },
                        { status: 500, headers: corsHeaders }
                    )
                }
            }
        } else {
            const newApiKey = 'aw_' + crypto.randomUUID().replace(/-/g, '')
            const { data: newStore, error: createStoreError } = await supabaseAdmin
                .from('stores')
                .insert({
                    organization_id: orgId,
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

            storeId = newStore.id
            apiKey = newStore.api_key
        }

        // Ensure store_users entry for owner
        await supabaseAdmin
            .from('store_users')
            .upsert({ user_id: userId, store_id: storeId, role: 'owner' }, { onConflict: 'user_id,store_id' })

        // 4) Only send magic link if we actually created the user
        if (isNewUser) {
            const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
                email: adminEmail,
                options: {
                    emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`,
                },
            })
            if (otpError) {
                console.error('Auto-Magic Link Failed:', otpError)
            }
        }

        return NextResponse.json(
            {
                success: true,
                store_id: storeId,
                api_key: apiKey,
                organization_id: orgId,
                message: 'Connection Successful',
                magic_link_sent: isNewUser,
            },
            { status: existingStore ? 200 : 201, headers: corsHeaders }
        )
    } catch (error: any) {
        console.error('Provision Error:', error)
        return NextResponse.json({ error: 'Provisioning Failed: ' + error.message }, { status: 500, headers: corsHeaders })
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    })
}
