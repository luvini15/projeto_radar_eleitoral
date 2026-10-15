"use client";

import { cn } from "@/lib/utils";

export type LoaderVariant = "circular" | "classic" | "pulse" | "pulse-dot" | "dots" | "typing" | "wave" | "bars" | "terminal" | "text-blink" | "text-shimmer" | "loading-dots";

export function Loader({ variant = "dots", className }: { variant?: LoaderVariant; className?: string }) {
  return (
    <span className={cn("prompt-loader", `prompt-loader--${variant}`, className)} role="status" aria-label="Processando">
      <i /><i /><i />
    </span>
  );
}

export function DotsLoader({ className }: { className?: string }) {
  return <Loader variant="dots" className={className} />;
}
