import { useEffect, useId, useRef, type CSSProperties } from "react";
import "./Watcher.css";

const R = 50;
const GAP = 0.19;
const TILT = 64;
type Eye = { w: number; h: number; r: number };

const EYE_STYLES: Record<string, Eye> = {
  Slant: { w: 9, h: 15, r: 4.5 },
  Dots: { w: 11, h: 11, r: 5.5 },
  Squares: { w: 12, h: 12, r: 3.5 },
};

const SHAPES: Record<string, string> = {
  Ball: "M50 0 A50 50 0 1 1 49.99 0 Z",
  Circle: "M50 7 A43 43 0 1 1 49.99 7 Z",
  Cube: "M30 6 H70 A24 24 0 0 1 94 30 V70 A24 24 0 0 1 70 94 H30 A24 24 0 0 1 6 70 V30 A24 24 0 0 1 30 6 Z",
  Pill: "M34 17 H66 A33 33 0 0 1 66 83 H34 A33 33 0 0 1 34 17 Z",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function Watcher({
  follow = 60,
  bounce = 30,
  size = 100,
  shape = "Cube",
  eyes: look = "Slant",
  eyeScale = 1,
  eyeWidth = 1,
  eyeRound = 1,
  eyeHeight = 1,
}: {
  follow?: number;
  bounce?: number;
  size?: number;
  shape?: string;
  eyes?: string;
  eyeScale?: number;
  eyeWidth?: number;
  eyeRound?: number;
  eyeHeight?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const eyeGroups = useRef<(SVGGElement | null)[]>([]);
  const knobs = useRef({ follow, bounce });
  knobs.current = { follow, bounce };
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const base = EYE_STYLES[look] ?? EYE_STYLES.Slant;
  const eye = {
    w: base.w * eyeScale * eyeWidth,
    h: base.h * eyeScale * eyeHeight,
    r: base.r * eyeScale * eyeWidth * eyeRound,
  };
  const eyeNow = useRef(eye);
  eyeNow.current = eye;

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const turn = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    let frame = 0;
    let previous = 0;
    let blinkStarted = 0;
    let nextBlink = performance.now() + 2200;

    const aim = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      const dx = event.clientX - (bounds.left + bounds.width / 2);
      const dy = event.clientY - (bounds.top + bounds.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.max(180, Math.min(window.innerWidth, window.innerHeight) * 0.42);
      const amount = Math.min(0.85, Math.tanh(distance / reach) * 1.5) * (clamp(knobs.current.follow, 0, 100) / 100);
      turn.tx = (dx / distance) * amount;
      turn.ty = (dy / distance) * amount;
    };
    const rest = () => { turn.tx = 0; turn.ty = 0; };

    const tick = (now: number) => {
      const dt = previous ? Math.min(2.5, (now - previous) / 16.67) : 1;
      previous = now;
      if (reducedMotion) {
        turn.x = turn.tx;
        turn.y = turn.ty;
      } else {
        const damping = 0.34 - (clamp(knobs.current.bounce, 0, 100) / 100) * 0.22;
        turn.vx += ((turn.tx - turn.x) * 0.06 - turn.vx * damping) * dt;
        turn.vy += ((turn.ty - turn.y) * 0.06 - turn.vy * damping) * dt;
        turn.x += turn.vx * dt;
        turn.y += turn.vy * dt;
      }
      if (now > nextBlink) {
        blinkStarted = now;
        nextBlink = now + 2600 + Math.random() * 3200;
      }
      const blinkAge = now - blinkStarted;
      const lid = blinkAge < 160 ? 1 - 0.9 * Math.sin((blinkAge / 160) * Math.PI) : 1;
      const yaw = Math.asin(clamp(turn.x, -0.92, 0.92));
      const pitch = -Math.asin(clamp(turn.y, -0.92, 0.92));
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const tilt = TILT * turn.x * turn.y;

      [-GAP, GAP].forEach((x0, index) => {
        const group = eyeGroups.current[index];
        if (!group) return;
        const z0 = Math.sqrt(1 - x0 * x0);
        const x1 = x0 * cy + z0 * sy;
        const z1 = -x0 * sy + z0 * cy;
        const y2 = -z1 * sp;
        const z2 = z1 * cp;
        const near = clamp(z2, 0, 1);
        const depthScale = 0.45 + 0.55 * near;
        const widthScale = depthScale * (0.7 + 0.3 * near);
        const currentEye = eyeNow.current;
        const width = currentEye.w * widthScale;
        const height = Math.max(0.6, currentEye.h * depthScale * lid);
        const rect = group.firstElementChild as SVGRectElement | null;
        if (rect) {
          rect.setAttribute("x", (-width / 2).toFixed(2));
          rect.setAttribute("y", (-height / 2).toFixed(2));
          rect.setAttribute("width", width.toFixed(2));
          rect.setAttribute("height", height.toFixed(2));
          rect.setAttribute("rx", Math.min(currentEye.r, width / 2, height / 2).toFixed(2));
        }
        group.setAttribute("transform", `translate(${(50 + x1 * R).toFixed(2)} ${(50 + y2 * R).toFixed(2)}) rotate(${tilt.toFixed(2)})`);
        group.style.opacity = z2 < 0.05 ? "0" : "1";
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", aim, { passive: true });
    document.documentElement.addEventListener("pointerleave", rest);
    window.addEventListener("blur", rest);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", aim);
      document.documentElement.removeEventListener("pointerleave", rest);
      window.removeEventListener("blur", rest);
    };
  }, [reducedMotion]);

  const clipId = `watcher-${useId().replace(/:/g, "")}`;
  const body = SHAPES[shape] ?? SHAPES.Cube;
  return (
    <div ref={box} className="watcher" style={{ "--watcher-size": `${clamp(size, 16, 180)}px` } as CSSProperties} role="img" aria-label="Personagem da Data Sight olhando para o cursor">
      <svg className="watcher__svg" viewBox="0 0 100 100">
        <defs>
          <clipPath id={clipId}><path d={body} /></clipPath>
          <linearGradient id={`${clipId}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8b60" />
            <stop offset="0.48" stopColor="#ff5a1f" />
            <stop offset="1" stopColor="#b92f00" />
          </linearGradient>
        </defs>
        <path className="watcher__body" d={body} fill={`url(#${clipId}-body)`} />
        <g clipPath={`url(#${clipId})`}>
          {[0, 1].map((index) => (
            <g key={index} ref={(node) => { eyeGroups.current[index] = node; }}>
              <rect className="watcher__eye" x={-eye.w / 2} y={-eye.h / 2} width={eye.w} height={eye.h} rx={eye.r} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
