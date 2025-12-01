type ActiveViewProps = {
    storeId: string
}

export default function ActiveView({ storeId }: ActiveViewProps) {
    return (
        <section className="p-8 text-center text-zinc-600">
            <p className="text-lg font-semibold text-zinc-800">
                Active Recovery Dashboard
            </p>
            <p className="mt-2">
                Store {storeId} is live. Detailed recovery analytics are coming in the next phase.
            </p>
        </section>
    )
}
