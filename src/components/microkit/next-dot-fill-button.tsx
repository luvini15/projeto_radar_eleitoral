import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NextDotFillButtonProps {
  label: string;
  to: string;
  compact?: boolean;
  className?: string;
}

export function NextDotFillButton({ label, to, compact = false, className }: NextDotFillButtonProps) {
  return (
    <Link to={to} className={cn("group relative inline-flex cursor-pointer appearance-none items-center justify-center overflow-hidden rounded-full border border-white/24 bg-white p-0 font-sans font-semibold leading-none tracking-[-.02em] text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5a1f]", compact ? "h-10 min-w-[112px] px-5 text-xs" : "h-[50px] min-w-[168px] px-6 text-sm", className)}>
      <span className={cn("absolute z-[1] rounded-full bg-[#ff5a1f] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[32] group-focus-visible:scale-[32] motion-reduce:transition-none", compact ? "left-[21px] top-[calc(50%_-_4px)] size-2" : "left-[26px] top-[calc(50%_-_4.5px)] size-[9px]")} aria-hidden="true" />
      <span className="relative z-0 translate-x-[6px] [transition:transform_.35s_cubic-bezier(.16,1,.3,1),opacity_.3s_ease] group-hover:translate-x-[46px] group-hover:opacity-0 group-focus-visible:translate-x-[46px] group-focus-visible:opacity-0 motion-reduce:transition-none">{label}</span>
      <span className="absolute inset-0 z-[2] inline-flex translate-x-[46px] items-center justify-center gap-2 text-black opacity-0 [transition:transform_.35s_cubic-bezier(.16,1,.3,1),opacity_.3s_ease] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none" aria-hidden="true">
        {label}
        <ArrowRight className="shrink-0" size={19} strokeWidth={2.4} />
      </span>
    </Link>
  );
}
