type ShadowViewProps = {
    storeId: string
    currencyCode?: string | null
    totalLostCents?: number
    ghostCarts?: Array<{
        created_at?: string
        total_amount_cents?: number
        currency?: string
    }>
}

export default function ShadowView({ storeId, currencyCode, totalLostCents = 0, ghostCarts = [] }: ShadowViewProps) {
    const currency = currencyCode || 'USD'
    const totalLost = (totalLostCents || 0) / 100

    return (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 shadow-inner">
            <p className="text-sm uppercase tracking-wide text-rose-500">
                Shadow Mode · Store {storeId}
            </p>
            <div className="mt-4 text-5xl font-semibold text-rose-700">
                {currency} {totalLost.toFixed(2)}
            </div>
            <p className="mt-2 text-zinc-600">
                Revenue Leakage Detector is running. Shadow totals will appear as traffic arrives.
            </p>
            {ghostCarts.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-semibold text-zinc-700">Recent Ghost Carts</h3>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                        {ghostCarts.map((cart, idx) => (
                            <li key={idx} className="flex items-center justify-between rounded border border-rose-100 bg-white px-3 py-2">
                                <span className="text-zinc-600">
                                    {cart.created_at ? new Date(cart.created_at).toLocaleString() : 'Unknown'}
                                </span>
                                <span className="font-mono text-rose-700">
                                    {cart.currency || currency} {(cart.total_amount_cents || 0) / 100}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    )
}
