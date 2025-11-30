import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, DollarSign, ShoppingCart } from "lucide-react";

interface StoreMetricsProps {
  storeId: string;
}

// Server Component shell for the CEO Digest metrics.
// Data fetching will be added later when RPC endpoints are ready.
export default function StoreMetrics({ storeId }: StoreMetricsProps) {
  const metrics = [
    {
      title: "Rescued Revenue (30 Days)",
      icon: DollarSign,
      value: "$4,521.89",
      change: "+12.3%",
      description: "Potential revenue saved from Ghost Orders.",
    },
    {
      title: "Carts Recovered (30 Days)",
      icon: ShoppingCart,
      value: "45",
      change: "+2.1%",
      description: "Total sales recovered by automated sequences.",
    },
    {
      title: "Operational Mode",
      icon: ArrowUpRight,
      value: "Live",
      change: "0% Margin Erosion",
      description: "Margin protected by Profit Guard.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric, index) => (
        <Card key={index} className="border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold">{metric.value}</div>
            <p className="mt-1 text-xs text-zinc-500">
              <span className="text-emerald-500">{metric.change}</span> vs last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
