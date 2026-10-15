import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Film, Lightbulb, TrendingUp } from "lucide-react";
import { CommandBar } from "@/components/ai/CommandBar";
import { MacKeyboard } from "@/components/ui/mac-keyboard";
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";
import { Source, SourceContent, SourceTrigger } from "@/components/prompt-kit/source";

const PROMPT = "O que mais preocupa minha audiência e como isso pode virar um vídeo?";

type DemoPhase = "idle" | "typing" | "thinking" | "answer";

function keyData(character: string) {
  if (character === " ") return { key: " ", code: "Space" };
  const normalized = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^[a-zA-Z]$/.test(normalized)) return { key: character, code: `Key${normalized.toUpperCase()}` };
  return { key: character, code: "Slash" };
}

export function AIInsightsShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let interval = 0;
    const timeouts: number[] = [];
    const clearSequence = () => {
      window.clearInterval(interval);
      timeouts.forEach(window.clearTimeout);
      timeouts.length = 0;
    };
    const run = () => {
      clearSequence();
      setTyped("");
      setPhase("typing");
      let index = 0;
      interval = window.setInterval(() => {
        const character = PROMPT[index];
        if (character === undefined) {
          window.clearInterval(interval);
          timeouts.push(window.setTimeout(() => setPhase("thinking"), 650));
          timeouts.push(window.setTimeout(() => setPhase("answer"), 2850));
          return;
        }
        setTyped(PROMPT.slice(0, index + 1));
        const { key, code } = keyData(character);
        window.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
        timeouts.push(window.setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent("keyup", { key, code, bubbles: true }));
        }, 64));
        index += 1;
      }, 42);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !activeRef.current) {
        activeRef.current = true;
        run();
      } else if (!entry?.isIntersecting && activeRef.current) {
        activeRef.current = false;
        clearSequence();
        setPhase("idle");
        setTyped("");
      }
    }, { threshold: 0.32 });
    observer.observe(root);
    return () => {
      observer.disconnect();
      clearSequence();
    };
  }, []);

  return (
    <div ref={rootRef} className="ai-demo-stage">
      <div className="ai-demo-grid" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1220px] flex-col items-center px-4 py-10 md:px-8 md:py-14">
        <div className="flex w-full items-center justify-between font-mono text-[8px] uppercase tracking-[.16em] text-white/35">
          <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-[#ff5a1f] shadow-[0_0_12px_#ff5a1f]" /> Contexto conectado</span>
          <span>IA / Data Sight</span>
        </div>

        <motion.div className="mt-10" animate={{ y: phase === "answer" ? -8 : 0 }}>
          <CommandBar value={typed} onValueChange={setTyped} />
        </motion.div>

        <AnimatePresence mode="wait">
          {(phase === "typing" || phase === "idle") && (
            <motion.div
              key="keyboard"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: phase === "typing" ? 1 : 0.35, y: 0 }}
              exit={{ opacity: 0, y: 35, scale: 0.96 }}
              className="ai-keyboard-window dark"
            >
              <MacKeyboard soundSrc="" className="!border-white/10 !bg-[#101010] text-white" />
            </motion.div>
          )}

          {phase === "thinking" && (
            <motion.div key="thinking" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} className="mt-20 w-full max-w-xl">
              <ThinkingBar />
              <div className="mt-7 grid grid-cols-3 gap-2 text-center font-mono text-[8px] uppercase tracking-[.12em] text-white/32">
                <span>Publicações</span><span>Comentários</span><span>Fontes abertas</span>
              </div>
            </motion.div>
          )}

          {phase === "answer" && (
            <motion.article key="answer" initial={{ opacity: 0, y: 36, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }} className="ai-answer-panel">
              <header className="flex items-center justify-between border-b border-white/10 pb-5">
                <span className="flex items-center gap-2 text-sm font-medium"><Bot className="h-4 w-4 text-[#ff5a1f]" /> Leitura da sua rede</span>
                <span className="font-mono text-[8px] uppercase tracking-[.14em] text-white/35">Contexto de 90 dias</span>
              </header>

              <div className="grid gap-5 pt-6 lg:grid-cols-[1.08fr_.92fr]">
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-[.16em] text-[#ff5a1f]">Síntese</span>
                  <h3 className="mt-3 max-w-xl text-3xl font-semibold leading-[.95] tracking-[-.045em] md:text-5xl">Sua audiência quer respostas práticas.</h3>
                  <p className="mt-5 max-w-xl text-sm leading-6 text-white/55">As dúvidas mais recorrentes se concentram em serviços do cotidiano. Conteúdos que mostram contexto, prazo e próximo passo recebem respostas mais construtivas.</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <Insight icon={<TrendingUp />} label="Sinal em alta" text="Perguntas objetivas cresceram nas últimas duas semanas." />
                    <Insight icon={<Lightbulb />} label="Oportunidade" text="Transforme a dúvida recorrente em uma série curta de explicações." />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/35 p-5 md:p-6">
                  <div className="flex items-center gap-2 text-sm font-medium"><Film className="h-4 w-4 text-[#ff5a1f]" /> Roteiro sugerido · 35s</div>
                  <ol className="mt-6 space-y-4">
                    <ScriptBeat time="00–03" title="Abra com a dúvida" text="Use a pergunta mais repetida como gancho." />
                    <ScriptBeat time="04–15" title="Mostre o contexto" text="Apresente o problema com um exemplo visual." />
                    <ScriptBeat time="16–28" title="Entregue a resposta" text="Explique prazo, decisão ou próximo passo." />
                    <ScriptBeat time="29–35" title="Convide para continuar" text="Peça novas dúvidas nos comentários." />
                  </ol>
                </div>
              </div>

              <footer className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                <Source href="#metodo"><SourceTrigger showFavicon>38 publicações</SourceTrigger><SourceContent title="Publicações monitoradas" description="Conteúdos usados para identificar temas e formatos recorrentes." /></Source>
                <Source href="#metodo"><SourceTrigger showFavicon>214 comentários</SourceTrigger><SourceContent title="Comentários da audiência" description="Dúvidas e reações agrupadas por recorrência." /></Source>
                <Source href="#metodo"><SourceTrigger showFavicon>6 vídeos</SourceTrigger><SourceContent title="Vídeos e Reels" description="Roteiros, respostas e sinais presentes em conteúdo audiovisual." /></Source>
                <Source href="#metodo"><SourceTrigger showFavicon>3 sites</SourceTrigger><SourceContent title="Sites acompanhados" description="Contexto público usado para conferir e enriquecer a leitura." /></Source>
                <Source href="#metodo"><SourceTrigger showFavicon>90 dias</SourceTrigger><SourceContent title="Janela analisada" description="Período considerado nesta demonstração de contexto." /></Source>
              </footer>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Insight({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><span className="flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-white/42">{icon}<b className="font-medium">{label}</b></span><p className="mt-3 text-xs leading-5 text-white/67">{text}</p></div>;
}

function ScriptBeat({ time, title, text }: { time: string; title: string; text: string }) {
  return <li className="grid grid-cols-[48px_1fr] gap-3"><span className="font-mono text-[9px] text-[#ff5a1f]">{time}</span><div><strong className="block text-sm font-medium">{title}</strong><p className="mt-1 text-xs leading-5 text-white/45">{text}</p></div></li>;
}
