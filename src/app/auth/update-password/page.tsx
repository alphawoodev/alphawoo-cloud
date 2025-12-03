"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function UpdatePasswordContent() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"verifying" | "ready" | "error">("verifying");

  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const type = searchParams.get("type");

  useEffect(() => {
    const verifyToken = async () => {
      const validTypes = ["recovery", "invite", "signup", "magiclink"];

      if (!token || !email || !validTypes.includes(type || "")) {
        setStatus("error");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as any,
      });

      if (error) {
        console.error("Verification Error:", error);
        setStatus("error");
      } else {
        setStatus("ready");
        toast.success("Identity verified. Please set your password.");
      }
    };

    verifyToken();
  }, [token, email, type, supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Password secured!");
      router.push("/dashboard");
    }
  };

  if (status === "verifying") {
    return <div className="p-12 text-center text-zinc-500 font-mono">Verifying Security Token...</div>;
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
        <div className="p-8 bg-white rounded-lg shadow border border-red-200 text-center">
          <h2 className="text-red-600 font-bold mb-2">Invalid or Expired Link</h2>
          <p className="text-sm text-zinc-600 mb-4">This security token is no longer valid.</p>
          <Button onClick={() => router.push("/auth/login")}>Return to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 p-8 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-2 text-center">Secure Your Account</h1>
        <p className="text-sm text-center text-zinc-500 mb-6">Set a strong password to continue.</p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Securing..." : "Set Password & Enter"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdatePasswordContent />
    </Suspense>
  );
}
