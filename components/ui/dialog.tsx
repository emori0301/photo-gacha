"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  hideTitle = false,
  showClose = true,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  hideTitle?: boolean;
  showClose?: boolean;
  overlayClassName?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-ink/55 backdrop-blur-[2px] data-[state=open]:animate-fade-in",
          overlayClassName,
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col",
          "rounded-3xl border-2 border-ink bg-paper shadow-hard-lg outline-none data-[state=open]:animate-rise",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-4 px-6 pt-5",
            hideTitle && "sr-only",
          )}
        >
          <div className="min-w-0">
            <DialogPrimitive.Title className="pr-10 font-display text-xl leading-snug [overflow-wrap:anywhere]">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-ink-2">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {typeof title === "string" ? title : ""}
              </DialogPrimitive.Description>
            )}
          </div>
        </div>
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border-2 border-ink bg-card transition-colors hover:bg-paper-2"
            aria-label="閉じる"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-3 border-t-2 border-dashed border-line px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
