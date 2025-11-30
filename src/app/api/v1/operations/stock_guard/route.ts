import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

type StoreConfig = {
    api_key: string
    shadow_mode: boolean
}

type StockItem = {
    product_id: string
    variation_id: string
    quantity: string
    sku: string
}

type StockReservationRequest = {
    event_type: string
    cart_hash: string
    items: StockItem[]
    aw_store_id?: string
    aw_signature?: string
    aw_timestamp_utc?: string
}

/**
 * Stock Guard API Endpoint
 * Bible Reference: Section 6 (Stock Guard - Oversell Protection)
 * 
 * Purpose: Real-time stock reservation to prevent "Ghost Orders"
 * Flow: PHP Connector -> This API -> Supabase (stock reservation)
 */
export async function POST(request: Request) {
    const rawBody = await request.text()

    let payload: StockReservationRequest
    try {
        payload = JSON.parse(rawBody)
    } catch (e) {
        console.error('Stock Guard: JSON Parse Error:', e)
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const storeId = payload.aw_store_id as string
    const signature = payload.aw_signature as string

    if (!storeId || !signature) {
        return NextResponse.json({
            error: 'Missing security credentials',
            error_detail: 'Stock reservation failed. Please try again.'
        }, { status: 400 })
    }

    // 1. Reconstruct the Canonical Payload for Verification (Bible 12.1)
    const payloadToSign = { ...payload }
    delete payloadToSign.aw_store_id
    delete payloadToSign.aw_signature
    delete payloadToSign.aw_timestamp_utc

    // Sort keys alphabetically
    const sortedKeys = Object.keys(payloadToSign).sort()
    const sortedPayload: Record<string, any> = {}
    sortedKeys.forEach(key => {
        sortedPayload[key] = payloadToSign[key as keyof typeof payloadToSign]
    })

    const rawBodyToVerify = JSON.stringify(sortedPayload)

    // 2. Secure Database Lookup (using RPC for security)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: storeData, error: dbError } = await supabase
        .rpc('get_store_config', { _store_id: storeId })
        .single()

    if (dbError || !storeData) {
        console.error('Stock Guard: Store lookup failed:', dbError?.message)
        return NextResponse.json({
            error: 'Unauthorized access',
            error_detail: 'Stock reservation failed. Please contact support.'
        }, { status: 401 })
    }

    const { api_key } = storeData as StoreConfig

    // 3. Verify HMAC Signature
    const expectedSignature = crypto.createHmac('sha256', api_key).update(rawBodyToVerify).digest('hex')

    if (expectedSignature !== signature) {
        console.warn(`Stock Guard: HMAC Mismatch for Store ${storeId}`)
        return NextResponse.json({
            error: 'Signature verification failed',
            error_detail: 'Stock reservation failed. Please try again.'
        }, { status: 403 })
    }

    // 4. Stock Reservation Logic
    try {
        const reservationResult = await reserveStock(supabase, storeId, payload)

        if (!reservationResult.success) {
            return NextResponse.json({
                error: 'Stock reservation failed',
                error_detail: reservationResult.error_detail || 'One or more items are out of stock.'
            }, { status: 409 }) // 409 Conflict
        }

        return NextResponse.json({
            success: true,
            reservation_id: reservationResult.reservation_id,
            message: 'Stock reserved successfully'
        })

    } catch (error) {
        console.error('Stock Guard: Reservation error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            error_detail: 'Stock reservation failed. Please try again.'
        }, { status: 500 })
    }
}

/**
 * Reserve stock for the cart items
 * Uses Supabase RPC function to create reservations
 * 
 * @param supabase Supabase client
 * @param storeId Store ID
 * @param payload Stock reservation request
 * @returns Reservation result
 */
async function reserveStock(
    supabase: any,
    storeId: string,
    payload: StockReservationRequest
): Promise<{ success: boolean; reservation_id?: string; error_detail?: string }> {

    try {
        const reservationIds: string[] = []

        // Create a reservation for each item in the cart
        for (const item of payload.items) {
            const quantity = parseInt(item.quantity, 10)
            const productId = parseInt(item.product_id, 10)
            const variationId = parseInt(item.variation_id || '0', 10)

            // Call the create_stock_reservation RPC function
            const { data: reservationId, error } = await supabase
                .rpc('create_stock_reservation', {
                    _store_id: storeId,
                    _cart_hash: payload.cart_hash,
                    _product_id: productId,
                    _variation_id: variationId,
                    _quantity: quantity,
                    _sku: item.sku || ''
                })

            if (error) {
                console.error('Stock reservation error:', error)
                return {
                    success: false,
                    error_detail: `Failed to reserve stock for product ${item.product_id}: ${error.message}`
                }
            }

            if (reservationId) {
                reservationIds.push(reservationId)
            }
        }

        // Return the first reservation ID (all items share the same cart_hash)
        return {
            success: true,
            reservation_id: reservationIds[0] || `cart_${payload.cart_hash}`
        }

    } catch (error: any) {
        console.error('Stock reservation exception:', error)
        return {
            success: false,
            error_detail: 'Stock reservation failed due to system error'
        }
    }
}
