"use client";

import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface CaseStudyFlipStackItem {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  background: string;
  foreground: string;
}

interface CaseStudyFlipStackProps {
  items: CaseStudyFlipStackItem[];
  className?: string;
}

export function CaseStudyFlipStack({ items, className }: CaseStudyFlipStackProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 105,
    damping: 26,
    mass: 0.35,
  });

  if (!items.length) return null;

  return (
    <div
      ref={sectionRef}
      data-case-study-flip-stack
      className={cn("relative w-full", className)}
      style={{ height: `${Math.max(260, items.length * 92)}svh` }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden py-16">
        <div className="flip-stack-grid absolute inset-0" aria-hidden="true" />
        <div className="relative h-[min(680px,76svh)] w-[min(1180px,calc(100vw-40px))] [perspective:1800px]">
          {items.map((item, index) => (
            <FlipCard
              key={`${item.eyebrow}-${item.title}`}
              item={item}
              index={index}
              total={items.length}
              progress={progress}
            />
          ))}
        </div>
        <motion.div
          className="absolute bottom-0 left-0 h-1 origin-left bg-[#ff5a1f]"
          style={{ scaleX: scrollYProgress, width: "100%" }}
        />
      </div>
    </div>
  );
}

function FlipCard({
  item,
  index,
  total,
  progress,
}: {
  item: CaseStudyFlipStackItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const step = total > 1 ? 1 / (total - 1) : 1;
  const center = index * step;
  const enter = Math.max(0, center - step * 0.72);
  const focus = Math.min(0.999, Math.max(0.001, center));
  const leave = Math.min(1, center + step * 0.72);
  const fadeIn = Math.max(0.001, center - step * 0.2);
  const fadeOut = Math.min(0.999, center + step * 0.2);
  const opacity = useTransform(
    progress,
    [enter, fadeIn, fadeOut, leave],
    [index === 0 ? 1 : 0, 1, 1, index === total - 1 ? 1 : 0],
  );
  const y = useTransform(progress, [enter, focus, leave], [index === 0 ? "0%" : "72%", "0%", index === total - 1 ? "0%" : "-18%"]);
  const rotateX = useTransform(progress, [enter, focus, leave], [index === 0 ? 0 : 18, 0, index === total - 1 ? 0 : -9]);
  const rotateZ = useTransform(progress, [enter, focus, leave], [index === 0 ? 0 : index % 2 ? 3 : -3, 0, index === total - 1 ? 0 : index % 2 ? -1.5 : 1.5]);
  const scale = useTransform(progress, [enter, focus, leave], [index === 0 ? 1 : 0.84, 1, index === total - 1 ? 1 : 0.9]);
  const zIndex = total + index;

  return (
    <motion.article
      className="absolute inset-0 grid overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_45px_120px_rgba(0,0,0,.55)] lg:grid-cols-[.92fr_1.08fr]"
      style={{
        backgroundColor: item.background,
        color: item.foreground,
        opacity,
        y,
        rotateX,
        rotateZ,
        scale,
        zIndex,
        transformOrigin: "50% 100%",
        transformStyle: "preserve-3d",
      }}
    >
      <div className="relative z-10 flex min-h-0 flex-col justify-between p-7 md:p-12 lg:p-14">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[.18em] opacity-65">
          <span>{item.eyebrow}</span>
          <span>0{index + 1} / 0{total}</span>
        </div>
        <div>
          <h3 className="max-w-2xl text-[clamp(2.1rem,4.8vw,5.4rem)] font-semibold leading-[.88] tracking-[-.06em]">
            {item.title}
          </h3>
          <p className="mt-6 max-w-lg text-sm leading-6 opacity-72 md:text-base md:leading-7">
            {item.description}
          </p>
        </div>
      </div>
      <div className="relative min-h-0 overflow-hidden border-t border-current/15 lg:border-l lg:border-t-0">
        <img
          src={item.image}
          alt={item.imageAlt ?? item.title}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5" />
      </div>
    </motion.article>
  );
}
