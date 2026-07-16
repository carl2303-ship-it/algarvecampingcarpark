"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { adminT } from "@/lib/admin-i18n";

export function StaffNotepadPanel() {
  const [body, setBody] = useState("");
  const [updatedByEmail, setUpdatedByEmail] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-notepad");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? adminT.staff.notepadLoadError);
      setBody(data.notepad?.body ?? "");
      setUpdatedByEmail(data.notepad?.updated_by_email ?? null);
      setUpdatedAt(data.notepad?.updated_at ?? null);
      setDirty(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : adminT.staff.notepadLoadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/staff-notepad", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : adminT.staff.notepadSaveError);
      return;
    }

    setUpdatedByEmail(data.notepad?.updated_by_email ?? null);
    setUpdatedAt(data.notepad?.updated_at ?? null);
    setDirty(false);
    setMessage(adminT.staff.notepadSaved);
  }

  let meta = "";
  if (updatedAt) {
    try {
      const when = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Lisbon",
      }).format(new Date(updatedAt));
      meta = adminT.staff.notepadUpdated
        .replace("{email}", updatedByEmail ?? "—")
        .replace("{when}", when);
    } catch {
      meta = "";
    }
  }

  return (
    <Card className="flex flex-col min-h-[28rem]">
      <CardHeader>
        <CardTitle>{adminT.staff.notepadTitle}</CardTitle>
        <CardDescription>{adminT.staff.notepadDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {adminT.common.loading}
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
                setMessage(null);
              }}
              rows={16}
              placeholder={adminT.staff.notepadPlaceholder}
              className="font-mono text-sm min-h-[18rem]"
            />
            {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving || !dirty}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {adminT.staff.notepadSave}
              </Button>
              {dirty && (
                <span className="text-xs text-amber-700">{adminT.staff.notepadUnsaved}</span>
              )}
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
