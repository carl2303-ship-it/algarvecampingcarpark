"use client";

import { useState } from "react";
import { FileText, Loader2, PlugZap, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminT } from "@/lib/admin-i18n";
import { MOLONI_ARTICLE_LIST } from "@/lib/moloni-articles";
import type { MoloniSettingsView } from "@/lib/moloni-settings";

export function MoloniSettingsForm({ initial }: { initial: MoloniSettingsView }) {
  const [view, setView] = useState(initial);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(initial.enabled);
  const [closeDocuments, setCloseDocuments] = useState(initial.close_documents);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [moloniNames, setMoloniNames] = useState<string[]>([]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(false);
    const payload: Record<string, unknown> = {
      enabled,
      close_documents: closeDocuments,
    };
    if (clientId.trim()) payload.client_id = clientId.trim();
    if (clientSecret.trim()) payload.client_secret = clientSecret.trim();
    if (username.trim()) payload.username = username.trim();
    if (password) payload.password = password;

    const res = await fetch("/api/admin/moloni-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setView(data.settings);
      setEnabled(data.settings.enabled);
      setCloseDocuments(data.settings.close_documents);
      setClientId("");
      setClientSecret("");
      setUsername("");
      setPassword("");
      setMessage(adminT.moloni.saved);
    } else {
      setError(true);
      setMessage(typeof data.error === "string" ? data.error : adminT.moloni.saveError);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    setError(false);
    const payload: Record<string, unknown> = {
      action: "sync",
      enabled,
      close_documents: closeDocuments,
    };
    if (clientId.trim()) payload.client_id = clientId.trim();
    if (clientSecret.trim()) payload.client_secret = clientSecret.trim();
    if (username.trim()) payload.username = username.trim();
    if (password) payload.password = password;

    const res = await fetch("/api/admin/moloni-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSyncing(false);
    if (res.ok) {
      setView(data.settings);
      setEnabled(data.settings.enabled);
      setCloseDocuments(data.settings.close_documents);
      setClientId("");
      setClientSecret("");
      setUsername("");
      setPassword("");
      setMissing(data.catalog?.missing_articles ?? []);
      setMoloniNames(data.catalog?.moloni_product_names ?? []);
      setMessage(
        data.catalog?.missing_articles?.length
          ? adminT.moloni.syncedMissing
          : adminT.moloni.synced
      );
    } else {
      setError(true);
      setMessage(typeof data.error === "string" ? data.error : adminT.moloni.syncError);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {adminT.moloni.title}
        </CardTitle>
        <CardDescription>{adminT.moloni.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={view.configured ? "default" : "outline"}>
            {view.configured ? adminT.moloni.configured : adminT.common.missing}
          </Badge>
          <Badge variant={view.enabled ? "default" : "secondary"}>
            {view.enabled ? adminT.moloni.autoOn : adminT.moloni.autoOff}
          </Badge>
          {view.source === "database" ? (
            <Badge variant="secondary">{adminT.common.inApp}</Badge>
          ) : null}
          {view.source === "fallback" ? (
            <Badge variant="outline">{adminT.moloni.fallbackStorage}</Badge>
          ) : null}
        </div>

        {view.configured ? (
          <p className="text-xs text-muted-foreground">{adminT.moloni.savedHint}</p>
        ) : null}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moloni_client_id">{adminT.moloni.clientId}</Label>
            <Input
              id="moloni_client_id"
              autoComplete="off"
              placeholder={view.client_id_preview ?? "Developer ID"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moloni_client_secret">{adminT.moloni.clientSecret}</Label>
            <Input
              id="moloni_client_secret"
              type="password"
              autoComplete="off"
              placeholder={
                view.client_secret_configured ? adminT.common.leaveBlankToKeep : "Client Secret"
              }
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moloni_username">{adminT.moloni.username}</Label>
            <Input
              id="moloni_username"
              autoComplete="off"
              placeholder={view.username_preview ?? "email@moloni.pt"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moloni_password">{adminT.moloni.password}</Label>
            <Input
              id="moloni_password"
              type="password"
              autoComplete="off"
              placeholder={
                view.password_configured ? adminT.common.leaveBlankToKeep : adminT.common.password
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {adminT.moloni.enable}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={closeDocuments}
              onChange={(e) => setCloseDocuments(e.target.checked)}
            />
            {adminT.moloni.closeDocuments}
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {adminT.moloni.save}
          </Button>
        </form>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{adminT.moloni.syncHint}</p>
          <Button type="button" variant="secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PlugZap className="h-4 w-4 mr-2" />
            )}
            {syncing ? adminT.moloni.syncing : adminT.moloni.sync}
          </Button>
          {view.company_id ? (
            <p className="text-xs text-muted-foreground">
              Empresa {view.company_id}
              {view.document_set_id ? ` · série ${view.document_set_id}` : ""}
              {view.tax_id_6 ? ` · IVA 6% #${view.tax_id_6}` : ""}
              {view.tax_id_23 ? ` · IVA 23% #${view.tax_id_23}` : ""}
            </p>
          ) : null}
          <ul className="text-xs text-muted-foreground space-y-1">
            {MOLONI_ARTICLE_LIST.map((article) => (
              <li key={article.sku}>
                {article.name}
                {view.product_map[article.sku] ? ` → #${view.product_map[article.sku]}` : " —"}
              </li>
            ))}
          </ul>
          {missing.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                {adminT.moloni.missingArticles}: {missing.join(", ")}
              </p>
              {moloniNames.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {adminT.moloni.foundInMoloni}: {moloniNames.join(" · ")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{adminT.moloni.noneInMoloni}</p>
              )}
            </div>
          ) : null}
        </div>

        {message && (
          <p className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
        )}

        {view.table_missing ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">{adminT.moloni.tableMissing}</p>
        ) : null}

        <p className="text-xs text-muted-foreground">{adminT.moloni.developerHint}</p>
      </CardContent>
    </Card>
  );
}
