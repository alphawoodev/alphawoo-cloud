'use client'

import { useState } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubscribeButtonProps {
    priceId: string
    organizationId: string
    userEmail: string
}

export function SubscribeButton({ priceId, organizationId }: SubscribeButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleCheckout = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    organizationId,
                }),
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Checkout initialization failed')

            if (data.url) {
                window.location.href = data.url
            }
        } catch (error: any) {
            console.error(error)
            // Fallback notification without external deps
            alert(`Payment Gateway Error: ${error.message || 'Unknown error'}`)
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleCheckout}
            disabled={loading}
            size="lg"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition-all"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to Stripe...
                </>
            ) : (
                <>
                    <Zap className="mr-2 h-4 w-4 fill-current" />
                    Activate Insurance ($49/mo)
                </>
            )}
        </Button>
    )
}
