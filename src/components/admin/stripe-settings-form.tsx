"use client";

import { useState } from "react";
import { CreditCard, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminT } from "@/lib/admin-i18n";
import type { StripeSettingsView } from "@/lib/stripe-settings";

function SourceBadge({ source }: { source: StripeSettingsView["secret_key_source"] }) {
  if (!source) return <Badge variant="outline">{adminT.common.missing}</Badge>;
  return (
    <Badge variant={source === "database" ? "default" : "secondary"}>
      {source === "database" ? adminT.common.inApp : adminT.common.netlifyFallback}
    </Badge>
  );
}

function ConfiguredRow({
  label,
  hint,
  configured,
  preview,
  source,
}: {
  label: string;
  hint: string;
  configured: boolean;
  preview: string | null;
  source: StripeSettingsView["secret_key_source"];
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b last:border-0">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        {configured && preview && (
          <code className="text-xs bg-muted px-2 py-1 rounded">{preview}</code>
        )}
        <SourceBadge source={source} />
      </div>
    </div>
  );
}

export function StripeSettingsForm({ initial }: { initial: StripeSettingsView }) {
  const [view, setView] = useState(initial);
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload: Record<string, string> = {};
    if (secretKey.trim()) payload.secret_key = secretKey.trim();
    if (publishableKey.trim()) payload.publishable_key = publishableKey.trim();
    if (webhookSecret.trim()) payload.webhook_secret = webhookSecret.trim();

    if (Object.keys(payload).length === 0) {
      setSaving(false);
      setMessage(adminT.stripe.fillOneField);
      return;
    }

    const res = await fetch("/api/admin/stripe-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      setView(data.settings);
      setSecretKey("");
      setPublishableKey("");
      setWebhookSecret("");
      setMessage(adminT.stripe.saved);
    } else {
      setMessage(typeof data.error === "string" ? data.error : adminT.stripe.saveError);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {adminT.stripe.title}
        </CardTitle>
        <CardDescription>{adminT.stripe.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <ConfiguredRow
            label={adminT.stripe.secretKey}
            hint={adminT.stripe.secretHint}
            configured={view.secret_key_configured}
            preview={view.secret_key_preview}
            source={view.secret_key_source}
          />
          <ConfiguredRow
            label={adminT.stripe.publishableKey}
            hint={adminT.stripe.publishableHint}
            configured={view.publishable_key_configured}
            preview={view.publishable_key_preview}
            source={view.publishable_key_source}
          />
          <ConfiguredRow
            label={adminT.stripe.webhookSecret}
            hint={adminT.stripe.webhookHint}
            configured={view.webhook_secret_configured}
            preview={view.webhook_secret_preview}
            source={view.webhook_secret_source}
          />
        </div>

        <form onSubmit={handleSave} className="space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label htmlFor="stripe_secret_key">{adminT.stripe.newSecretKey}</Label>
            <Input
              id="stripe_secret_key"
              type="password"
              autoComplete="off"
              placeholder={view.secret_key_configured ? adminT.common.leaveBlankToKeep : "sk_live_…"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripe_publishable_key">{adminT.stripe.newPublishableKey}</Label>
            <Input
              id="stripe_publishable_key"
              type="password"
              autoComplete="off"
              placeholder={view.publishable_key_configured ? adminT.common.leaveBlankToKeep : "pk_live_…"}
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripe_webhook_secret">{adminT.stripe.newWebhookSecret}</Label>
            <Input
              id="stripe_webhook_secret"
              type="password"
              autoComplete="off"
              placeholder={view.webhook_secret_configured ? adminT.common.leaveBlankToKeep : "whsec_…"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {adminT.stripe.save}
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>

        <p className="text-xs text-muted-foreground">
          {adminT.stripe.footer}{" "}
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            dashboard.stripe.com/apikeys
          </a>
          . {adminT.stripe.webhookNote}{" "}
          <code className="text-xs bg-muted px-1 rounded">/api/webhooks/stripe</code>.
        </p>
      </CardContent>
    </Card>
  );
}
