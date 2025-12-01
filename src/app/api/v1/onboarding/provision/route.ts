import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

let supabaseServerClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
    if (!supabaseServerClient) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!url || !serviceKey) {
            throw new Error('Supabase credentials missing for provisioning endpoint.')
        }

        supabaseServerClient = createClient(url, serviceKey)
    }

    return supabaseServerClient
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { admin_email, site_url, currency, store_name } = body || {}

        if (!admin_email || !site_url) {
            return NextResponse.json(
                { error: 'Missing required fields: admin_email, site_url' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseClient()
        const tempPassword = uuidv4()

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: admin_email,
            password: tempPassword,
            options: {
                data: { full_name: 'Store Admin' }
            }
        })

        let userId = authData?.user?.id || null

        if (!userId) {
            const { data: userList, error: listError } = await supabase.auth.admin.listUsers()

            if (listError) {
                console.error('List Users Error:', listError.message)
                return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
            }

            const existingUser = userList.users.find(user => user.email?.toLowerCase() === admin_email.toLowerCase())

            if (!existingUser) {
                console.error('Provisioning: unable to locate admin user after sign-up attempt.')
                return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
            }

            userId = existingUser.id
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
            console.error('Org Creation Error:', orgError.message)
            return NextResponse.json({ error: 'Organization creation failed' }, { status: 500 })
        }

        const newApiKey = `aw_${uuidv4().replace(/-/g, '')}`
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .insert({
                organization_id: org.id,
                name: store_name || 'WooCommerce Store',
                url: site_url,
                currency: currency || 'USD',
                api_key: newApiKey,
                shadow_mode: true,
                active_modules: ['shadow_mode']
            })
            .select('id')
            .single()

        if (storeError) {
            console.error('Store Creation Error:', storeError.message)
            return NextResponse.json({ error: 'Store creation failed' }, { status: 500 })
        }

        const { error: linkError } = await supabase
            .from('store_users')
            .insert({
                user_id: userId,
                store_id: store.id,
                role: 'owner'
            })

        if (linkError) {
            console.error('Store User Link Error:', linkError.message)
            return NextResponse.json({ error: 'Failed to link user to store' }, { status: 500 })
        }

        const dashboardUrlBase = process.env.NEXT_PUBLIC_APP_URL || 'https://app.alphawoo.com'

        return NextResponse.json(
            {
                success: true,
                store_id: store.id,
                api_key: newApiKey,
                shadow_mode: true,
                dashboard_url: `${dashboardUrlBase}/dashboard/${store.id}`,
                message: 'AlphaWoo Connected: Shadow Mode Active'
            },
            { status: 201 }
        )
    } catch (error: any) {
        console.error('Provisioning Exception:', error?.message || error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
