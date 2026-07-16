"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { adminT } from "@/lib/admin-i18n";
import { cn } from "@/lib/utils";

type StaffMessage = {
  id: string;
  author_id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

function formatMessageTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Lisbon",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StaffChatPanel() {
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const latestCreatedAt = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-chat?limit=80");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? adminT.staff.chatLoadError);
      const list = (data.messages ?? []) as StaffMessage[];
      setMessages(list);
      setCurrentUserId(data.current_user_id ?? null);
      latestCreatedAt.current = list.at(-1)?.created_at ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : adminT.staff.chatLoadError);
    } finally {
      setLoading(false);
      requestAnimationFrame(scrollToBottom);
    }
  }, [scrollToBottom]);

  const pollNew = useCallback(async () => {
    if (!latestCreatedAt.current) return;
    try {
      const res = await fetch(
        `/api/admin/staff-chat?after=${encodeURIComponent(latestCreatedAt.current)}&limit=50`
      );
      const data = await res.json();
      if (!res.ok) return;
      const incoming = (data.messages ?? []) as StaffMessage[];
      if (incoming.length === 0) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const msg of incoming) {
          if (!ids.has(msg.id)) merged.push(msg);
        }
        return merged;
      });
      latestCreatedAt.current = incoming.at(-1)?.created_at ?? latestCreatedAt.current;
      requestAnimationFrame(scrollToBottom);
    } catch {
      // ignore poll errors
    }
  }, [scrollToBottom]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void pollNew();
    }, 5000);
    return () => window.clearInterval(id);
  }, [pollNew]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);

    const res = await fetch("/api/admin/staff-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : adminT.staff.chatSendError);
      return;
    }

    const message = data.message as StaffMessage;
    setDraft("");
    setMessages((prev) => [...prev, message]);
    latestCreatedAt.current = message.created_at;
    requestAnimationFrame(scrollToBottom);
  }

  return (
    <Card className="flex flex-col min-h-[28rem]">
      <CardHeader>
        <CardTitle>{adminT.staff.chatTitle}</CardTitle>
        <CardDescription>{adminT.staff.chatDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 min-h-0">
        <div className="flex-1 min-h-[16rem] max-h-[24rem] overflow-y-auto rounded-lg border bg-muted/20 p-3 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {adminT.common.loading}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{adminT.staff.chatEmpty}</p>
          ) : (
            messages.map((msg) => {
              const mine = msg.author_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col max-w-[85%]", mine ? "ml-auto items-end" : "items-start")}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {msg.author_name || msg.author_email}
                    {" · "}
                    {formatMessageTime(msg.created_at)}
                  </p>
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-background border rounded-bl-md"
                    )}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={adminT.staff.chatPlaceholder}
            rows={2}
            className="min-h-[2.75rem] resize-none"
            maxLength={4000}
          />
          <Button type="submit" disabled={sending || !draft.trim()} size="icon" className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
