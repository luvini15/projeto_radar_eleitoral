"use client";

import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Watcher } from "@/components/landing/Watcher";

interface ScrollSplitCardItem {
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
  icon?: React.ReactNode;
}

interface ScrollSplitCardProps {
  className?: string;
  imageSrc?: string;
  cards: ScrollSplitCardItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function ScrollSplitCard({
  className,
  cards,
  containerRef: externalContainerRef,
}: ScrollSplitCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [compact, setCompact] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const visibleCards = cards.slice(0, 3);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => {
      setCompact(query.matches);
      setViewportWidth(window.innerWidth);
    };
    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const { scrollYProgress } = useScroll({
    target: rootRef,
    container: externalContainerRef,
    offset: ["start start", "end end"],
  });
  const easedProgress = useSpring(scrollYProgress, {
    stiffness: 78,
    damping: 28,
    mass: 0.42,
  });
  const cardWidth = Math.min(viewportWidth * 0.64, 820);
  const cardStep = cardWidth + viewportWidth * 0.05;
  const firstCardX = (viewportWidth - cardWidth) / 2;
  const railX = useTransform(
    easedProgress,
    [0, 0.25, 0.52, 0.74, 1],
    [
      firstCardX,
      firstCardX - cardStep,
      firstCardX - cardStep * 2,
      firstCardX - cardStep * 2,
      firstCardX - cardStep * 2,
    ],
  );
  const railOpacity = useTransform(easedProgress, [0, 0.74, 0.84], [1, 1, 0]);
  const railY = useTransform(easedProgress, [0, 0.74, 0.84], ["0vh", "0vh", "-12vh"]);
  const guideX = useTransform(
    easedProgress,
    [0, 0.25, 0.52, 0.74, 0.84],
    compact
      ? ["-6vw", "0vw", "6vw", "6vw", "0vw"]
      : ["-29vw", "0vw", "29vw", "29vw", "0vw"],
  );
  const guideY = useTransform(easedProgress, [0, 0.74, 0.84], ["0svh", "0svh", "-30svh"]);
  const watcherScale = useTransform(easedProgress, [0, 0.74, 0.84], [1, 1, 2.2]);
  const guideTilt = useTransform(
    easedProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [-5, 4, -4, 4, 0],
  );

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Activate at the midpoint between card resting positions, so the
    // incoming card is already clear while it approaches the center.
    const next = latest < 0.125 ? 0 : latest < 0.385 ? 1 : 2;
    setActiveIndex((current) => (current === next ? current : next));
    const nextFinalState = latest >= 0.74;
    setShowFinalMessage((current) => current === nextFinalState ? current : nextFinalState);
  });

  const activeCard = visibleCards[activeIndex] ?? visibleCards[0];

  return (
    <div ref={rootRef} data-scroll-split-card className={cn("relative h-[580vh] w-full", className)}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#050505]">
        <div className="case-grid absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-x-0 top-24 z-20 flex items-center justify-between px-5 font-mono text-[9px] uppercase tracking-[.18em] text-white/35 md:px-9">
          <span>Role para avançar</span>
          <span>0{activeIndex + 1} / 0{visibleCards.length}</span>
        </div>

        <motion.div
          className="absolute top-[18svh] flex h-[53svh] min-h-[350px] gap-[5vw]"
          style={{ x: railX, y: railY, opacity: railOpacity }}
        >
          {visibleCards.map((card, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.article
                key={card.title}
                animate={{
                  opacity: isActive ? 1 : 0.62,
                  scale: isActive ? 1 : 0.94,
                  rotate: isActive ? 0 : index < activeIndex ? -2.5 : 2.5,
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="case-card relative w-[64vw] max-w-[820px] shrink-0 overflow-hidden rounded-[2rem] border border-white/10 p-7 shadow-[0_35px_100px_rgba(0,0,0,.5)] md:p-12"
                style={{ backgroundColor: card.bgColor, color: card.textColor }}
              >
                <span className="absolute right-8 top-7 font-mono text-[10px] tracking-[.15em] opacity-35">
                  CASO / 0{index + 1}
                </span>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-current/20">
                  {card.icon}
                </div>
                <div className="absolute inset-x-7 bottom-8 md:inset-x-12 md:bottom-11">
                  <h3 className="max-w-xl text-[clamp(2rem,4.5vw,4.8rem)] font-semibold leading-[.88] tracking-[-.055em]">
                    {card.title}
                  </h3>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        {activeCard && (
          <motion.div
            className={cn(
              "case-guide absolute bottom-[3svh] left-1/2 z-30 flex -translate-x-1/2 items-end gap-3 md:bottom-[5svh]",
              showFinalMessage && "case-guide--final",
            )}
            style={{ x: guideX, y: guideY, rotate: guideTilt }}
          >
            <motion.div
              style={{ scale: watcherScale }}
              className="origin-bottom-left"
              animate={showFinalMessage
                ? { y: [0, -16, 0, -7, 0], rotate: [0, -5, 4, -2, 0] }
                : { y: 0, rotate: 0 }}
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Watcher follow={54} bounce={32} size={82} shape="Cube" eyes="Slant" />
            </motion.div>
            <motion.div
              key={showFinalMessage ? 'final-message' : activeCard.title}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="case-speech relative mb-10 w-[min(320px,58vw)] rounded-2xl bg-white px-5 py-4 text-[#111] shadow-[0_15px_50px_rgba(0,0,0,.35)]"
            >
              <span className="font-mono text-[8px] uppercase tracking-[.16em] text-[#ff5a1f]">
                {showFinalMessage ? 'Próxima leitura' : 'Data Sight explica'}
              </span>
              <p className="mt-1.5 text-sm font-medium leading-5">
                {showFinalMessage
                  ? 'Você já viu o que o dado resolve. Agora veja onde encontramos cada sinal.'
                  : activeCard.description}
              </p>
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className="absolute inset-x-0 bottom-0 h-1 origin-left bg-[#ff5a1f]"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
    </div>
  );
}
