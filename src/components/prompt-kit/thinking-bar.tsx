"use client";

import { Loader } from "./loader";

export function ThinkingBar({ label = "Conectando sinais da sua rede" }: { label?: string }) {
  return (
    <div className="thinking-bar" role="status">
      <Loader variant="dots" />
      <span>{label}</span>
      <i aria-hidden="true" />
    </div>
  );
}
