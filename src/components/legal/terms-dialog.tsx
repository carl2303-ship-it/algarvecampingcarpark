"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TermsContent } from "@/lib/legal/terms-content";
import { cn } from "@/lib/utils";

export function TermsDialog({
  label,
  content,
  triggerClassName,
}: {
  label: string;
  content: TermsContent;
  triggerClassName?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "text-primary underline underline-offset-2 hover:text-primary/80",
          triggerClassName
        )}
      >
        {label}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0 pr-12">
          <DialogTitle className="font-heading text-left text-lg md:text-xl">
            {content.title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-5 py-4 space-y-8 text-left">
          {content.sections.map((section) => (
            <article key={section.title}>
              <h3 className="font-heading text-base font-semibold mb-3">{section.title}</h3>

              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-muted-foreground leading-relaxed mb-3 last:mb-0 text-sm"
                >
                  {paragraph}
                </p>
              ))}

              {section.list && (
                <ul className="space-y-3 mt-2">
                  {section.list.map((item) => (
                    <li key={item.label} className="text-muted-foreground leading-relaxed text-sm">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <p className="mt-1">{item.text}</p>
                    </li>
                  ))}
                </ul>
              )}

              {section.bullets && (
                <ul className="list-disc pl-5 space-y-2 mt-2 text-muted-foreground leading-relaxed text-sm">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 48)}>{bullet}</li>
                  ))}
                </ul>
              )}

              {section.closingParagraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-muted-foreground leading-relaxed mt-3 text-sm"
                >
                  {paragraph}
                </p>
              ))}
            </article>
          ))}

          <p className="pt-4 border-t text-xs text-muted-foreground">
            {content.lastUpdatedLabel}: {content.lastUpdated}.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
