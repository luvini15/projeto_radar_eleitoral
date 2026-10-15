"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ExternalLink, Globe2 } from "lucide-react";

const SourceContext = createContext({ href: "#" });

export function Source({ href, children }: { href: string; children: ReactNode }) {
  return <SourceContext.Provider value={{ href }}><span className="prompt-source">{children}</span></SourceContext.Provider>;
}

export function SourceTrigger({ showFavicon = false, children }: { showFavicon?: boolean; children?: ReactNode }) {
  const { href } = useContext(SourceContext);
  return (
    <a className="prompt-source__trigger" href={href}>
      {showFavicon && <Globe2 className="h-3.5 w-3.5" />}
      {children ?? "Fonte"}
      <ExternalLink className="h-3 w-3 opacity-45" />
    </a>
  );
}

export function SourceContent({ title, description }: { title: string; description: string }) {
  return <span className="prompt-source__content"><strong>{title}</strong><small>{description}</small></span>;
}
