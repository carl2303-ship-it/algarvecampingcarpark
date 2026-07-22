"use client";

import { useState } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminT } from "@/lib/admin-i18n";
import type { EmailSettingsView } from "@/lib/email-settings";

function SourceBadge({
  source,
}: {
  source: EmailSettingsView["resend_api_key_source"] | EmailSettingsView["email_from_source"];
}) {
  if (source === "default") {
    return <Badge variant="outline">Défaut</Badge>;
  }
  if (!source) {
    return <Badge variant="outline">{adminT.common.missing}</Badge>;
  }
  return (
    <Badge variant={source === "database" ? "default" : "secondary"}>
      {source === "database" ? adminT.common.inApp : adminT.common.netlifyFallback}
    </Badge>
  );
}

export function EmailSettingsForm({ initial }: { initial: EmailSettingsView }) {
  const [view, setView] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload: Record<string, string> = {};
    if (apiKey.trim()) payload.resend_api_key = apiKey.trim();
    if (emailFrom.trim()) payload.email_from = emailFrom.trim();

    if (Object.keys(payload).length === 0) {
      setSaving(false);
      setMessage(adminT.email.fillOneField);
      return;
    }

    const res = await fetch("/api/admin/email-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      setView(data.settings);
      setApiKey("");
      setEmailFrom("");
      setMessage(adminT.email.saved);
    } else {
      setMessage(typeof data.error === "string" ? data.error : adminT.email.saveError);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {adminT.email.title}
        </CardTitle>
        <CardDescription>{adminT.email.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b">
            <div>
              <p className="font-medium text-sm">{adminT.email.apiKey}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{adminT.email.apiKeyHint}</p>
            </div>
            <div className="flex items-center gap-3">
              {view.resend_api_key_configured && view.resend_api_key_preview && (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {view.resend_api_key_preview}
                </code>
              )}
              <SourceBadge source={view.resend_api_key_source} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
            <div>
              <p className="font-medium text-sm">{adminT.email.from}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{adminT.email.fromHint}</p>
            </div>
            <div className="flex items-center gap-3">
              <code className="text-xs bg-muted px-2 py-1 rounded">{view.email_from}</code>
              <SourceBadge source={view.email_from_source} />
            </div>
          </div>
          {/@(gmail|googlemail|hotmail|outlook|yahoo)\./i.test(view.email_from) && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {adminT.email.gmailWarning}
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="resend_api_key">{adminT.email.newApiKey}</Label>
            <Input
              id="resend_api_key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="re_..."
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="email_from">{adminT.email.newFrom}</Label>
            <Input
              id="email_from"
              type="text"
              value={emailFrom}
              onChange={(event) => setEmailFrom(event.target.value)}
              placeholder="Algarve Camping <noreply@seudominio.pt>"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {adminT.email.save}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
