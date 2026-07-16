"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminT } from "@/lib/admin-i18n";

type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
};

export function StaffAccessManager() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? adminT.staff.loadError);
      setUsers(data.users ?? []);
      setCurrentUserId(data.current_user_id ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : adminT.staff.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: name.trim() || undefined,
        password: password.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : adminT.staff.createError);
      return;
    }

    setEmail("");
    setName("");
    setPassword("");
    setMessage(data.invited ? adminT.staff.invited : adminT.staff.created);
    await load();
  }

  async function handleRevoke(id: string) {
    if (!confirm(adminT.staff.revokeConfirm)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : adminT.staff.revokeError);
      return;
    }
    setMessage(adminT.staff.revoked);
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{adminT.staff.accessTitle}</CardTitle>
          <CardDescription>{adminT.staff.accessDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff_email">{adminT.common.email}</Label>
                <Input
                  id="staff_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_name">{adminT.staff.name}</Label>
                <Input
                  id="staff_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={adminT.staff.namePlaceholder}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff_password">{adminT.staff.passwordOptional}</Label>
              <Input
                id="staff_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={adminT.staff.passwordHint}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">{adminT.staff.inviteHint}</p>
            </div>
            <Button type="submit" disabled={saving || !email.trim()}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {adminT.staff.addAccess}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.staff.listTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {adminT.common.loading}
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{adminT.staff.empty}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {user.name || user.email}
                      {user.id === currentUserId ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({adminT.staff.you})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {user.id !== currentUserId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(user.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {adminT.staff.revoke}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {message && <p className="text-sm text-muted-foreground mt-4">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
