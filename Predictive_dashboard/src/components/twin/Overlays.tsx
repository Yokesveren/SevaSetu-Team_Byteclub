import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DRIVERS, SCENES } from "@/data/story";
import { bandOf } from "@/data/twin";
import { reduction, topWard, villageRisk } from "@/lib/sim";
import { t } from "@/lib/i18n";
import { useTwin } from "@/store/twinStore";

export function WhyDrawer() {
  const { whyOpen, set, disease, day, interventions, lang } = useTwin();
  const R = reduction(disease, interventions);
  const v = villageRisk(disease, day, R);
  const w = topWard(disease, day)!;
  const ds = DRIVERS[disease];
  return (
    <Sheet open={whyOpen} onOpenChange={(o) => set({ whyOpen: o })}>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("why", lang)}</SheetTitle>
          <SheetDescription>Plain-language explanation of today's score.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 text-sm leading-relaxed text-foreground">
          <p>The village score is <b className="font-mono">{Math.round(v)}</b> ({t(bandOf(v), lang)}). It looks about three days ahead, so it rises before cases do.</p>
          <p><b>{w.name}</b> carries most of the risk right now.</p>
          <ol className="list-decimal space-y-1.5 pl-5">
            {ds.map((d) => <li key={d.id}><b>{d.label}</b> adds about <span className="font-mono">+{d.contribution}%</span> to the score.</li>)}
          </ol>
          <p className="text-muted-foreground">Contributions are estimated and carry uncertainty. This is a flag for human review: a PHC doctor or District Health Officer decides what happens next. SevaSetu never declares containment zones.</p>
          <Button onClick={() => set({ whyOpen: false, simOpen: true })}>{t("test", lang)}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const TOUR = [
  { sel: "layers", title: "Layers", body: "Overlay risk, cases, water, mosquitoes, connectivity and more. Combine as many as you like." },
  { sel: "time", title: "Time machine", body: "Drag through 14 days of history and 14 days of forecast. The hatched zone is the model forecast with an 80% band." },
  { sel: "drivers", title: "Why is this red?", body: "Each driver explains part of the score. Click one to fly to the places behind it." },
  { sel: "test", title: "Test a response", body: "Try larvicide, chlorination or extra ASHA rounds and watch the forecast bend down." },
  { sel: "ladder", title: "Escalation ladder", body: "SevaSetu raises the flag. Only government officials declare containment zones." },
];

export function GuidedTour() {
  const step = useTwin((s) => s.tourStep), set = useTwin((s) => s.set);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (step === null) return;
    const el = document.querySelector(`[data-tour="${TOUR[step]!.sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);
  if (step === null) return null;
  const s = TOUR[step]!;
  const close = () => { set({ tourStep: null }); try { localStorage.setItem("twin-tour", "1"); } catch { /* ignore */ } };
  const pad = 8;
  const boxTop = rect ? (rect.bottom + 180 < window.innerHeight ? rect.bottom + 12 : Math.max(12, rect.top - 170)) : 100;
  const boxLeft = rect ? Math.min(window.innerWidth - 340, Math.max(12, rect.left)) : 100;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label={`Tour step ${step + 1}: ${s.title}`}>
      {rect && (
        <div className="pointer-events-none absolute rounded-xl transition-all duration-300"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--background) 72%, transparent)", outline: "2px solid var(--saffron)" }} />
      )}
      <div className="glass absolute w-[320px] p-4 shadow-2xl" style={{ top: boxTop, left: boxLeft }}>
        <div className="font-mono text-[10px] text-muted-foreground">{step + 1} / {TOUR.length}</div>
        <div className="mt-1 font-semibold text-foreground">{s.title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
        <div className="mt-3 flex justify-between">
          <Button size="sm" variant="ghost" onClick={close}>Skip tour</Button>
          <div className="flex gap-2">
            {step > 0 && <Button size="sm" variant="secondary" onClick={() => set({ tourStep: step - 1 })}>Back</Button>}
            <Button size="sm" onClick={() => (step < TOUR.length - 1 ? set({ tourStep: step + 1 }) : close())}>{step < TOUR.length - 1 ? "Next" : "Done"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntroCaption() {
  const caption = useTwin((s) => s.caption);
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!caption) return;
    const id = setInterval(() => setN((x) => (x >= caption.length ? x : x + 1)), 35);
    return () => clearInterval(id);
  }, [caption]);
  return (
    <AnimatePresence>
      {caption && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 glass px-4 py-2 text-center text-sm text-foreground md:text-base">
          {caption.slice(0, n)}<span className="opacity-50">▍</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { SCENES };
