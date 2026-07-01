"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteLogo } from "@/components/brand/site-logo";

export function AdminForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setError(data.message ?? "Não foi possível enviar o email.");
        setLoading(false);
        return;
      }

      setMessage(data.message ?? "Verifique o seu email.");
      setLoading(false);
    } catch {
      setError("Erro de ligação. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <SiteLogo size="xl" className="mb-2" />
        <CardTitle>Recuperar password</CardTitle>
        <CardDescription>
          Enviaremos um link para redefinir a password da conta admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>
          )}
          {message && (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg leading-relaxed">
              {message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email admin</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
          <Link href="/admin/login" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
