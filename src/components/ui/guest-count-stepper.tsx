"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  decreaseLabel?: string;
  increaseLabel?: string;
};

export function GuestCountStepper({
  id,
  value,
  onChange,
  min = 1,
  max = 10,
  className,
  decreaseLabel = "Moins",
  increaseLabel = "Plus",
}: Props) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commitDraft(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange(min);
      setDraft(String(min));
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      onChange(min);
      setDraft(String(min));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(clamped);
    setDraft(String(clamped));
  }

  function step(delta: number) {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0"
        disabled={value <= min}
        aria-label={decreaseLabel}
        onClick={() => step(-1)}
      >
        <Minus className="h-5 w-5" />
      </Button>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "");
          setDraft(next);
        }}
        onBlur={() => commitDraft(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft(draft);
            (event.target as HTMLInputElement).blur();
          }
        }}
        className="h-11 w-14 shrink-0 px-1 text-center text-lg font-semibold tabular-nums"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0"
        disabled={value >= max}
        aria-label={increaseLabel}
        onClick={() => step(1)}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}
