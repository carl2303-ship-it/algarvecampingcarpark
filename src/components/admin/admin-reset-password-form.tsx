"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/admin/password-input";
import { SiteLogo } from "@/components/brand/site-logo";
import { adminT } from "@/lib/admin-i18n";

export function AdminResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(adminT.resetPassword.mismatch);
      return;
    }

    if (password.length < 8) {
      setError(adminT.resetPassword.minLength);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });
      const data = (await res.json()) as { message?: string };

      if (!res.ok) {
        setError(data.message ?? adminT.resetPassword.updateFailed);
        setLoading(false);
        return;
      }

      window.location.assign("/admin/login?reset=success");
    } catch {
      setError(adminT.common.connectionError);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <SiteLogo size="xl" className="mb-2" />
        <CardTitle>{adminT.resetPassword.title}</CardTitle>
        <CardDescription>{adminT.resetPassword.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">{adminT.resetPassword.newPassword}</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{adminT.resetPassword.confirmPassword}</Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {adminT.resetPassword.save}
          </Button>
          <Link href="/admin/login" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
            {adminT.resetPassword.backToLogin}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
