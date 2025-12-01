type ShadowViewProps = {
    storeId: string
    currencyCode?: string | null
}

export default function ShadowView({ storeId, currencyCode }: ShadowViewProps) {
    return (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 shadow-inner">
            <p className="text-sm uppercase tracking-wide text-rose-500">
                Shadow Mode · Store {storeId}
            </p>
            <div className="mt-4 text-5xl font-semibold text-rose-700">
                {currencyCode || 'USD'} 0.00
            </div>
            <p className="mt-2 text-zinc-600">
                Revenue Leakage Detector is running. Shadow totals will appear as traffic arrives.
            </p>
        </section>
    )
}
