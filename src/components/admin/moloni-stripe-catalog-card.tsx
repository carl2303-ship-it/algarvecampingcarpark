"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminT } from "@/lib/admin-i18n";
import { MOLONI_ARTICLE_LIST, formatVatDescription } from "@/lib/moloni-articles";

export function MoloniStripeCatalogCard() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    setError(false);
    const res = await fetch("/api/admin/stripe-moloni", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSyncing(false);
    if (res.ok) {
      setMessage(adminT.stripe.moloniSynced);
    } else {
      setError(true);
      setMessage(typeof data.error === "string" ? data.error : adminT.stripe.moloniSyncError);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          {adminT.stripe.moloniTitle}
        </CardTitle>
        <CardDescription>{adminT.stripe.moloniDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{adminT.stripe.moloniColName}</th>
                <th className="px-3 py-2 font-medium">{adminT.stripe.moloniColPrice}</th>
                <th className="px-3 py-2 font-medium">{adminT.stripe.moloniColVat}</th>
              </tr>
            </thead>
            <tbody>
              {MOLONI_ARTICLE_LIST.map((article) => (
                <tr key={article.sku} className="border-t">
                  <td className="px-3 py-2 font-medium">{article.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {(article.unitAmountCents / 100).toFixed(2)} €
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatVatDescription(article.unitAmountCents, article.vatPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? adminT.stripe.moloniSyncing : adminT.stripe.moloniSync}
          </Button>
          <a
            href="https://dashboard.stripe.com/products"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline text-muted-foreground"
          >
            {adminT.stripe.moloniProductsLink}
          </a>
        </div>

        {message && (
          <p className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
