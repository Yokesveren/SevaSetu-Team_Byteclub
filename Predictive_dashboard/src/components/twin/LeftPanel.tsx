import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, ArrowDownRight, CircleCheck, Eye, OctagonAlert, HelpCircle } from "lucide-react";
import { alertsFor, DRIVERS } from "@/data/story";
import { NOW, bandOf, type RiskBand } from "@/data/twin";
import { reduction, villageRisk, summarize } from "@/lib/sim";
import { t } from "@/lib/i18n";
import { useTwin } from "@/store/twinStore";
import { bandColor } from "./VillageScene";

export const BandIcon = ({ band, className = "h-4 w-4" }: { band: RiskBand; className?: string }) => {
  const I = band === "low" ? CircleCheck : band === "watch" ? Eye : band === "elevated" ? AlertTriangle : OctagonAlert;
  return <I className={className} style={{ color: bandColor(band) }} aria-hidden />;
};

export function RiskGauge() {
  const day = useTwin((s) => s.day), disease = useTwin((s) => s.disease), iv = useTwin((s) => s.interventions), lang = useTwin((s) => s.lang);
  const R = reduction(disease, iv);
  const v = villageRisk(disease, day, R);
  const prev = villageRisk(disease, Math.max(0, day - 2), R);
  const band = bandOf(v);
  const pct = prev > 0 ? Math.round(((v - prev) / prev) * 100) : 0;
  const arc = 251.3; // half-circle length for r=80
  return (
    <div className="glass p-4" data-tour="gauge">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("score", lang)}</div>
      <div className="relative mx-auto mt-1 w-full max-w-[220px]">
        <svg viewBox="0 0 200 115" className="w-full" role="img" aria-label={`Risk score ${Math.round(v)} of 100, ${band}`}>
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth={14} strokeLinecap="round" />
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={bandColor(band)} strokeWidth={14} strokeLinecap="round"
            strokeDasharray={arc} strokeDashoffset={arc * (1 - v / 100)} style={{ transition: "stroke-dashoffset 400ms ease, stroke 300ms" }} />
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <div className="font-mono text-4xl font-semibold text-foreground">{Math.round(v)}</div>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: bandColor(band) }}><BandIcon band={band} />{t(band, lang)}</span>
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          {pct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {pct >= 0 ? "rising" : "falling"} {Math.abs(pct)}% in 48h
        </span>
      </div>
    </div>
  );
}

export function ForecastHeadline() {
  const disease = useTwin((s) => s.disease), iv = useTwin((s) => s.interventions), lang = useTwin((s) => s.lang), day = useTwin((s) => s.day);
  const s = useMemo(() => summarize(disease, iv), [disease, iv]);
  const R = reduction(disease, iv);
  const lead = Math.max(1, s.peakDay - NOW);
  const conf = Math.round(82 - R * 30);
  return (
    <div className="glass p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Forecast</div>
      <div className="mt-1 text-sm text-foreground">
        {t("predicted", lang)} <span className="font-mono font-semibold text-primary">~{lead} {t("days", lang)}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-mono">{conf}%</span> ({t("confidence", lang)} <span className="font-mono">{conf - 14}–{Math.min(97, conf + 9)}%</span>) · peak ~<span className="font-mono">{s.peak}</span> {t("cases_day", lang)}
      </div>
      {day > NOW && <div className="mt-1 text-[11px] text-muted-foreground">Viewing forecast day {Math.round(day)} – uncertainty widens.</div>}
    </div>
  );
}

export function DriverBars() {
  const disease = useTwin((s) => s.disease), lang = useTwin((s) => s.lang), set = useTwin((s) => s.set), flyTo = useTwin((s) => s.flyTo);
  const drivers = DRIVERS[disease];
  const max = Math.max(...drivers.map((d) => d.contribution));
  return (
    <div className="glass p-4" data-tour="drivers">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("drivers", lang)}</div>
        <button onClick={() => set({ whyOpen: true })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-accent" data-tour="why">
          <HelpCircle className="h-3.5 w-3.5" />{t("why", lang)}
        </button>
      </div>
      <ul className="space-y-2">
        {drivers.map((d) => (
          <li key={d.id}>
            <button className="group w-full text-left" onClick={() => { set({ highlight: d.related, selected: null }); flyTo(d.target, d.k); }}
              aria-label={`${d.label}, contributes plus ${d.contribution} percent. Show on map`}>
              <div className="flex justify-between text-xs"><span className="text-foreground group-hover:text-primary">{lang === "hi" ? d.labelHi : d.label}</span><span className="font-mono text-muted-foreground">+{d.contribution}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-saffron" initial={{ width: 0 }} animate={{ width: `${(d.contribution / max) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AlertsFeed() {
  const disease = useTwin((s) => s.disease), day = useTwin((s) => s.day), lang = useTwin((s) => s.lang), set = useTwin((s) => s.set), flyTo = useTwin((s) => s.flyTo), acked = useTwin((s) => s.acked);
  const visible = alertsFor(disease).filter((a) => a.day <= day).reverse();
  return (
    <div className="glass flex min-h-0 flex-1 flex-col p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("alerts", lang)} · <span className="font-mono">{visible.length}</span></div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        <AnimatePresence initial={false}>
          {visible.map((a) => (
            <motion.li key={a.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <button onClick={() => { set({ selected: { kind: "alert", id: a.id }, highlight: a.wardId ? [a.wardId] : [] }); flyTo(a.target, 2); }}
                className="w-full rounded-lg border border-border bg-background/40 p-2.5 text-left transition hover:bg-accent" style={{ borderLeft: `3px solid ${bandColor(a.band)}` }}>
                <div className="flex items-start gap-2">
                  <BandIcon band={a.band} className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs leading-snug text-foreground">{lang === "hi" ? a.titleHi : a.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      <span>D{a.day} · {a.day === NOW ? "now" : `${NOW - a.day}d ago`}</span>
                      {a.review && <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">{t("recommendReview", lang)}</span>}
                      {acked[a.id] && <span className="rounded bg-muted px-1.5 py-0.5">{acked[a.id]}</span>}
                    </div>
                  </div>
                </div>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function LeftPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RiskGauge />
      <ForecastHeadline />
      <DriverBars />
      <AlertsFeed />
    </div>
  );
}
