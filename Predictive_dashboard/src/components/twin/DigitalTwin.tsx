import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DAYS, NOW } from "@/data/twin";
import { SCENES } from "@/data/story";
import { NO_INTERVENTIONS, RECOMMENDED } from "@/lib/sim";
import { useTwin } from "@/store/twinStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar, SimBadge } from "./TopBar";
import { VillageScene } from "./VillageScene";
import { LeftPanel, RiskGauge, ForecastHeadline } from "./LeftPanel";
import { RightPanel, CapacityPanel } from "./RightPanel";
import { TimeBar } from "./TimeBar";
import { InterventionDrawer } from "./InterventionDrawer";
import { GuidedTour, IntroCaption, WhyDrawer } from "./Overlays";

function usePlayback() {
  const isPlaying = useTwin((s) => s.isPlaying);
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const s = useTwin.getState();
      const next = s.day + 0.05 * s.speed;
      if (s.intro && next >= NOW) { s.set({ day: NOW, isPlaying: false, intro: false }); return; }
      if (next >= DAYS) { s.set({ day: DAYS, isPlaying: false }); return; }
      s.set({ day: next });
    }, 50);
    return () => clearInterval(id);
  }, [isPlaying]);
}

function useIntro() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { set, flyTo } = useTwin.getState();
    if (reduce) { set({ day: NOW, intro: false }); return; }
    set({ caption: "Kelamangalam: 6 hamlets, 1,200 people, 1 PHC, zero guesswork.", day: 8 });
    const ts = [
      setTimeout(() => set({ isPlaying: true, speed: 2 }), 700),
      setTimeout(() => flyTo([520, 360], 1.25), 1500),
      setTimeout(() => set({ caption: null, speed: 1 }), 5500),
      setTimeout(() => {
        let seen = false;
        try { seen = !!localStorage.getItem("twin-tour"); } catch { /* ignore */ }
        if (!seen) set({ tourStep: 0 });
      }, 8500),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
}

function useKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useTwin.getState();
      if (e.key === "p" || e.key === "P") { s.set({ presenter: !s.presenter }); return; }
      if (e.key === " " && tag !== "BUTTON") { e.preventDefault(); s.set({ isPlaying: !s.isPlaying, intro: false }); return; }
      if (s.presenter && /^[1-6]$/.test(e.key)) {
        const sc = SCENES[+e.key - 1]!;
        s.set({ day: sc.day, isPlaying: false, intro: false, interventions: sc.applied ? RECOMMENDED : NO_INTERVENTIONS, caption: null, simOpen: false });
        setScene(sc.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

let setScene: (n: number) => void = () => {};

export function DigitalTwin() {
  const theme = useTwin((s) => s.theme), presenter = useTwin((s) => s.presenter), lang = useTwin((s) => s.lang);
  const [scene, setSceneState] = useState<number | null>(null);
  setScene = setSceneState;
  usePlayback(); useIntro(); useKeys();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
  }, [theme, lang]);
  useEffect(() => { if (!presenter) setSceneState(null); }, [presenter]);
  const sc = scene ? SCENES[scene - 1] : null;

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
        className="flex min-h-screen flex-col gap-3 bg-background p-3 font-sans text-foreground lg:h-screen lg:overflow-hidden">
        {!presenter && <TopBar />}
        <div className={`grid min-h-0 flex-1 gap-3 ${presenter ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-[300px_1fr_320px]"}`}>
          <aside className="order-2 min-h-0 lg:order-1" aria-label="Early-warning engine">
            {presenter ? <div className="flex flex-col gap-3"><RiskGauge /><ForecastHeadline /><CapacityPanel /></div> : <LeftPanel />}
          </aside>
          <main className="relative order-1 h-[58vh] min-h-[380px] lg:order-2 lg:h-auto">
            <VillageScene />
            <IntroCaption />
            {presenter && (
              <div className="absolute left-3 top-3 flex flex-col gap-2">
                <SimBadge />
                <div className="glass px-3 py-1.5 text-[11px] text-muted-foreground">Presenter · keys 1–6 jump to scenes · P to exit</div>
              </div>
            )}
            <AnimatePresence>
              {sc && (
                <motion.div key={sc.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 glass px-4 py-2 text-center text-base font-medium text-foreground">
                  <span className="mr-2 font-mono text-primary">{sc.key}</span>{lang === "hi" ? sc.hi : sc.en}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          {!presenter && <aside className="order-3 min-h-0" aria-label="Context panel"><RightPanel /></aside>}
        </div>
        <TimeBar />
      </motion.div>
      <InterventionDrawer />
      <WhyDrawer />
      <GuidedTour />
    </TooltipProvider>
  );
}
