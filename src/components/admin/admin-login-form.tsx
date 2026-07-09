"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/admin/password-input";
import { SiteLogo } from "@/components/brand/site-logo";
import { adminT } from "@/lib/admin-i18n";

export function AdminLoginForm({
  initialError,
  resetSuccess,
}: {
  initialError?: string | null;
  resetSuccess?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialError === "unauthorized") {
      setError(adminT.login.unauthorized);
    }
    if (initialError === "auth") {
      setError(adminT.login.invalidLink);
    }
  }, [initialError]);

  useEffect(() => {
    if (resetSuccess) {
      setSuccess(adminT.login.resetSuccess);
    }
  }, [resetSuccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        if (data.error === "config") {
          setError(adminT.login.supabaseNotConfigured);
        } else {
          setError(data.message ?? adminT.login.signInFailed);
        }
        setLoading(false);
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError(adminT.common.connectionError);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <SiteLogo size="xl" className="mb-2" />
        <CardTitle>{adminT.login.title}</CardTitle>
        <CardDescription>{adminT.login.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
              {success}
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg leading-relaxed">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{adminT.common.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{adminT.common.password}</Label>
              <Link
                href="/admin/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {adminT.login.forgotPassword}
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {adminT.login.signIn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
