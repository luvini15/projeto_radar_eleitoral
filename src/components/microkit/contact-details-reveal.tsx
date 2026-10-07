interface ContactDetailsRevealProps {
  title?: string;
  detail: string;
  href?: string;
}

export function ContactDetailsReveal({ title = "Fale com a gente", detail, href }: ContactDetailsRevealProps) {
  return (
    <a href={href ?? `mailto:${detail}`} className="group relative inline-flex h-[58px] w-[min(260px,calc(100vw_-_40px))] cursor-pointer appearance-none items-center justify-center overflow-hidden border-0 bg-transparent p-0 font-sans text-left text-white focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5a1f]">
      <span className="relative size-[14px] shrink-0 translate-x-[6px] rounded-full bg-white [transition:background-color_.32s_ease,transform_.42s_cubic-bezier(.16,1,.3,1)] group-hover:[transform:translate(6px,4px)] group-hover:bg-[#ff5a1f] group-focus-visible:[transform:translate(6px,4px)] group-focus-visible:bg-[#ff5a1f] motion-reduce:transition-none" aria-hidden="true" />
      <span className="relative ml-[15px] h-[46px] w-[205px] translate-x-[6px]">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[19px] font-normal leading-none tracking-[-.55px] [transition:top_.42s_cubic-bezier(.16,1,.3,1),transform_.42s_cubic-bezier(.16,1,.3,1)] group-hover:top-[6px] group-hover:translate-y-0 group-focus-visible:top-[6px] group-focus-visible:translate-y-0 motion-reduce:transition-none">{title}</span>
        <span className="absolute left-0 top-[30px] translate-y-[15px] whitespace-nowrap text-[12px] font-normal leading-none tracking-[-.2px] text-white/45 opacity-0 [transition:opacity_.24s_ease_.05s,transform_.42s_cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">{detail}</span>
      </span>
    </a>
  );
}
