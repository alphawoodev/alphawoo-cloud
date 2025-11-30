import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-xl">
          <Zap className="h-8 w-8 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            AlphaWoo Cloud
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Revenue Insurance & Automation for High-Volume Merchants.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
              Enter Console
            </Button>
          </Link>
          <Link href="https://alphawoo.com">
            <Button variant="outline" size="lg" className="border-zinc-200 dark:border-zinc-800">
              Documentation
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
