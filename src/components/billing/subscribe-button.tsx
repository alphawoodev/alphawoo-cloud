'use client'

import { useState } from 'react'
import { Loader2, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface SubscribeButtonProps {
    priceId: string
    organizationId: string
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

            if (!res.ok) throw new Error(data.error || 'Initialization failed')

            if (data.url) {
                window.location.href = data.url
            }
        } catch (error: any) {
            console.error(error)
            toast.error('Protocol Error', {
                description: 'Could not initialize secure checkout session.',
            })
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleCheckout}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 shadow-sm transition-all"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="font-mono text-xs tracking-wider">CONNECTING...</span>
                </>
            ) : (
                <>
                    <Terminal className="mr-2 h-4 w-4 text-emerald-500" />
                    <span className="font-mono font-medium tracking-tight">
                        INITIALIZE <span className="text-emerald-400">$RECOVERY</span>
                    </span>
                </>
            )}
        </Button>
    )
}
