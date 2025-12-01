import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const { admin_email, site_url, currency, store_name } = await req.json()

        if (!admin_email || !site_url) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const tempPassword = uuidv4()
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: admin_email,
            password: tempPassword,
            options: {
                data: { full_name: 'Store Admin' },
                emailRedirectTo: site_url
            }
        })

        let userId = authData.user?.id

        if (authError) {
            console.error('Supabase Auth Error:', authError.message)

            if (authError.message.includes('already registered') || authError.status === 422) {
                const { data: users, error: listError } = await supabase.auth.admin.listUsers()

                if (listError) {
                    console.error('Admin List Error:', listError)
                    return NextResponse.json({ error: `Auth failed: ${listError.message}` }, { status: 500 })
                }

                const existingUser = users.users.find(
                    user => user.email?.toLowerCase() === admin_email.toLowerCase()
                )

                if (!existingUser) {
                    return NextResponse.json({
                        error: 'User collision detected but ID not found. Check Supabase Console.'
                    }, { status: 500 })
                }

                userId = existingUser.id
            } else {
                return NextResponse.json(
                    { error: `User creation failed: ${authError.message}` },
                    { status: 400 }
                )
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'User creation returned no ID and no error.' }, { status: 500 })
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
                { status: 500 }
            )
        }

        const newApiKey = 'aw_' + uuidv4().replace(/-/g, '')
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .insert({
                organization_id: org.id,
                name: store_name || 'WooCommerce Store',
                url: site_url,
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
                { status: 500 }
            )
        }

        await supabase.from('store_users').insert({
            user_id: userId,
            store_id: store.id,
            role: 'owner'
        })

        return NextResponse.json({
            success: true,
            store_id: store.id,
            api_key: newApiKey,
            shadow_mode: true,
            dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${store.id}`,
            message: 'AlphaWoo Connected: Shadow Mode Active'
        }, { status: 201 })
    } catch (error: any) {
        console.error('Provisioning Exception:', error)
        return NextResponse.json(
            { error: `Internal Server Error: ${error.message}` },
            { status: 500 }
        )
    }
}
