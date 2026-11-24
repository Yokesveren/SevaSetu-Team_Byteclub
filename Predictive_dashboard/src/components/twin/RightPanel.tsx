import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wifi, WifiOff, Radio } from "lucide-react";
import { Area, AreaChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ASHAS, CLUSTERS, NOW, PLACES, WARDS, WATER, bandOf, waterStatus, wardById, DAYS } from "@/data/twin";
import { alertsFor } from "@/data/story";
import { DISTRICT_ALLOTMENT, PHC_BEDS, bedDemand, casesAt, reduction, summarize, wardCases, wardRisk } from "@/lib/sim";
import { t } from "@/lib/i18n";
import { useTwin } from "@/store/twinStore";
import { Button } from "@/components/ui/button";
import { bandColor } from "./VillageScene";
import { BandIcon } from "./LeftPanel";
import { EscalationLadder } from "./EscalationLadder";
import { toast } from "sonner";

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3 border-b border-border py-1.5 text-xs last:border-0">
    <span className="text-muted-foreground">{k}</span><span className="text-right font-mono text-foreground">{v}</span>
  </div>
);
const H = ({ children }: { children: React.ReactNode }) => <div className="mb-1 mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{children}</div>;

export function CapacityPanel() {
  const disease = useTwin((s) => s.disease), iv = useTwin((s) => s.interventions), lang = useTwin((s) => s.lang);
  const R = reduction(disease, iv);
  const cap = PHC_BEDS + DISTRICT_ALLOTMENT + iv.bedBuffer;
  const data = useMemo(() => Array.from({ length: DAYS - NOW + 1 }, (_, i) => {
    const d = NOW + i;
    return { d, demand: +bedDemand(disease, d, R).toFixed(1), cap };
  }), [disease, R, cap]);
  const s = summarize(disease, iv);
  return (
    <div className="glass p-4" data-tour="capacity">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("capacity", lang)}</div>
      <div className="h-28">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
            <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(d) => `D${d}`} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11 }} />
            <Area type="monotone" dataKey="demand" name="Bed demand" stroke="var(--risk-elevated)" fill="var(--risk-elevated)" fillOpacity={0.25} />
            <Line type="stepAfter" dataKey="cap" name="Capacity" stroke="var(--risk-low)" dot={false} strokeDasharray="4 3" />
            <ReferenceLine y={cap} stroke="var(--risk-low)" strokeDasharray="4 3" />
            {s.crossDay && <ReferenceLine x={s.crossDay} stroke="var(--risk-critical)" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[11px] text-muted-foreground">PHC {PHC_BEDS} beds + district allotment {DISTRICT_ALLOTMENT}{iv.bedBuffer ? ` + buffer ${iv.bedBuffer}` : ""}</div>
      {s.crossDay ? (
        <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-foreground">
          <b className="text-destructive">No confirmed capacity from day {s.crossDay}.</b> Escalate to the District Admin for reallocation.
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2 text-xs text-foreground">Predicted bed demand stays within capacity.</div>
      )}
    </div>
  );
}

function Spark({ wardId }: { wardId: string }) {
  const disease = useTwin((s) => s.disease), iv = useTwin((s) => s.interventions);
  const R = reduction(disease, iv);
  const data = Array.from({ length: 15 }, (_, i) => ({ d: i, c: wardCases(disease, wardId, i, R) }));
  return (
    <div className="h-12"><ResponsiveContainer><LineChart data={data}><Line dataKey="c" stroke="var(--saffron)" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></div>
  );
}

function Body() {
  const sel = useTwin((s) => s.selected), day = useTwin((s) => s.day), disease = useTwin((s) => s.disease), iv = useTwin((s) => s.interventions), lang = useTwin((s) => s.lang), set = useTwin((s) => s.set), acked = useTwin((s) => s.acked);
  const R = reduction(disease, iv);
  const d = Math.round(day);
  if (!sel) {
    return (
      <div className="space-y-3">
        <div className="glass p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("overview", lang)}</div>
          <div className="mt-2 space-y-1.5">
            {[...WARDS].sort((a, b) => wardRisk(disease, b.id, day, R) - wardRisk(disease, a.id, day, R)).map((w) => {
              const r = wardRisk(disease, w.id, day, R);
              return (
                <button key={w.id} onClick={() => { set({ selected: { kind: "ward", id: w.id } }); useTwin.getState().flyTo(w.centroid, 1.8); }} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent">
                  <BandIcon band={bandOf(r)} className="h-3.5 w-3.5" />
                  <span className="flex-1 text-foreground">{lang === "hi" ? w.nameHi : w.name}</span>
                  <span className="font-mono text-muted-foreground">{Math.round(r)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <CapacityPanel />
        <EscalationLadder />
      </div>
    );
  }
  if (sel.kind === "ward") {
    const w = wardById(sel.id), r = wardRisk(disease, w.id, day, R);
    return (
      <div>
        <Title band={bandOf(r)} title={lang === "hi" ? w.nameHi : w.name} sub={`Ward · risk ${Math.round(r)}`} />
        <Spark wardId={w.id} />
        <Row k="Population" v={w.population} />
        <Row k="Active syndromic cases (today)" v={wardCases(disease, w.id, day, R)} />
        <Row k="Under-5 / pregnant / elderly" v={`${w.children_u5} / ${w.pregnant} / ${w.elderly}`} />
        <Row k="Last ASHA visit" v={`${w.lastAshaVisitDaysAgo + (w.id === "pudhu" && d >= 12 ? d - 12 : 0)} days ago`} />
        <Row k="Elevation" v={`${w.elevation_m} m`} />
        <Row k="Nearest facility" v={`PHC · ${w.dist_to_phc_km} km`} />
        <Row k="Signal" v={w.signal} />
        <H>Recommended actions</H>
        <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">
          <li>Source-reduction sweep of containers & tyres</li>
          <li>Extra ASHA fever-survey round in the next 48h</li>
          <li>Flag to PHC doctor for review</li>
        </ul>
      </div>
    );
  }
  if (sel.kind === "cluster") {
    const c = CLUSTERS.find((x) => x.id === sel.id)!, w = wardById(c.wardId);
    const r = wardRisk(disease, w.id, day, R);
    return (
      <div>
        <Title band={bandOf(r)} title={`Household cluster`} sub={`${w.name} · anonymised`} />
        <p className="text-sm text-foreground">{c.households} households, {c.feverTags} with fever tags, last visit {c.visitDaysAgo} days ago.</p>
        <p className="mt-2 text-[11px] text-muted-foreground">Cluster-level summary only. SevaSetu never shows names or exact homes.</p>
      </div>
    );
  }
  if (sel.kind === "water") {
    const w = WATER.find((x) => x.id === sel.id)!, st = waterStatus(w, day, disease);
    const failed = w.id === "well1" && d >= 11;
    return (
      <div>
        <Title band={st} title={w.name} sub={`Water source · ${w.type}`} />
        <Row k="Last tested" v={`Day ${w.lastTestedDay}`} />
        <Row k="Residual chlorine" v={`${w.chlorine_ppm} ppm ${w.chlorine_ppm < 0.2 ? "✖ below 0.2" : "✓"}`} />
        <Row k="Turbidity" v={`${w.turbidity_ntu} NTU ${w.turbidity_ntu > 5 ? "▲" : "✓"}`} />
        <Row k="Coliform (H2S strip)" v={failed || w.id === "pond" ? "Positive ✖" : "Negative ✓"} />
        <Row k="Households served" v={w.householdsServed} />
        <Row k="Contamination risk (7d)" v={st === "low" ? "Low" : st === "watch" ? "Moderate" : "High"} />
      </div>
    );
  }
  if (sel.kind === "place") {
    const p = PLACES.find((x) => x.id === sel.id)!;
    if (p.kind === "phc") {
      const inflow = Array.from({ length: 7 }, (_, i) => Math.round(casesAt(disease, NOW + 1 + i, R) * 0.35));
      const s = summarize(disease, iv);
      return (
        <div>
          <Title band={s.crossDay ? "elevated" : "low"} title={p.name} sub="Primary Health Centre" />
          <Row k="Beds free" v={`${Math.max(0, PHC_BEDS - Math.round(bedDemand(disease, day, R)))} / ${PHC_BEDS + iv.bedBuffer}`} />
          <Row k="Doctor on duty" v="Dr. A. Prakash (MO)" />
          <Row k="Teleconsult" v="Online · district hub" />
          <H>Stock (days left at predicted demand)</H>
          <Row k="ORS sachets" v={disease === "diarrhoeal" ? (iv.stock ? "9 d" : "4 d") : "21 d"} />
          <Row k="Antimalarial (ACT)" v={disease === "malaria" ? (iv.stock ? "10 d" : "4 d") : "30 d"} />
          <Row k="Platelet test kits" v={disease === "dengue" ? (iv.stock ? "8 d" : `3 d · stock-out ~D${s.stockOutDay ?? "–"}`) : "18 d"} />
          <H>Expected inflow, next 7 days</H>
          <div className="flex items-end gap-1">{inflow.map((v, i) => <div key={i} className="flex-1 rounded-t bg-brand-blue/70" style={{ height: 4 + v * 2 }} title={`D${NOW + 1 + i}: ${v}`} />)}</div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">{inflow.join(" · ")} patients/day</div>
        </div>
      );
    }
    return (
      <div>
        <Title band="low" title={p.name} sub={p.kind} />
        <p className="text-sm text-foreground">{p.kind === "school" || p.kind === "anganwadi" ? "Child-health hotspot and cluster-spread site. Attendance is tracked as an early signal." : "Gathering point; contributes to mobility between hamlets."}</p>
      </div>
    );
  }
  if (sel.kind === "asha") {
    const a = ASHAS.find((x) => x.id === sel.id)!;
    const offline = a.deadZones.length > 0;
    return (
      <div>
        <Title band="low" title={`ASHA · ${a.name}`} sub="Field health worker" />
        <Row k="Visits completed today" v={a.visitsToday} />
        <Row k="Red / yellow flagged" v={`${a.flagged.red} / ${a.flagged.yellow}`} />
        <Row k="Sync status" v={<span className="inline-flex items-center gap-1">{offline ? <><Radio className="h-3 w-3" />Queued over LoRa</> : <><Wifi className="h-3 w-3" />Online</>}</span>} />
        <Row k="Dead-zones crossed" v={a.deadZones.length ? a.deadZones.join(", ") : "None"} />
        <Row k="Route" v={`${a.route.length - 1} stops`} />
        {offline && <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => { const s = useTwin.getState(); set({ loraNonce: s.loraNonce + 1, layers: s.layers.includes("connectivity") ? s.layers : [...s.layers, "connectivity"] }); }}><WifiOff className="mr-1 h-3.5 w-3.5" />{t("replayLora", lang)}</Button>}
      </div>
    );
  }
  const a = alertsFor(disease).find((x) => x.id === sel.id);
  if (!a) return null;
  const act = (s: "acknowledged" | "assigned" | "escalated") => { set({ acked: { ...acked, [a.id]: s } }); toast(`Alert ${s}`, { description: s === "escalated" ? "Sent to District Health Officer for review" : undefined }); };
  return (
    <div>
      <Title band={a.band} title={lang === "hi" ? a.titleHi : a.title} sub={`Alert · day ${a.day}`} />
      {a.review && <div className="mb-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{t("recommendReview", lang)} – SevaSetu flags; officials decide.</div>}
      <H>Evidence</H>
      <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">{a.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
      <H>Status</H>
      <div className="text-xs text-foreground">{acked[a.id] ?? "new"}</div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => act("acknowledged")}>{t("ack", lang)}</Button>
        <Button size="sm" variant="secondary" onClick={() => act("assigned")}>{t("assign", lang)}</Button>
        <Button size="sm" onClick={() => act("escalated")} className="text-[11px]">{t("escalate", lang)}</Button>
      </div>
    </div>
  );
}

function Title({ band, title, sub }: { band: Parameters<typeof bandColor>[0]; title: string; sub: string }) {
  const set = useTwin((s) => s.set);
  return (
    <div className="mb-3 flex items-start gap-2">
      <BandIcon band={band} className="mt-1 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-tight text-foreground">{title}</div>
        <div className="text-xs capitalize text-muted-foreground">{sub}</div>
      </div>
      <button aria-label="Close" onClick={() => set({ selected: null, highlight: [] })} className="rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
    </div>
  );
}

export function RightPanel() {
  const sel = useTwin((s) => s.selected);
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <AnimatePresence mode="wait">
        <motion.div key={sel ? sel.kind + sel.id : "none"} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}
          className={sel ? "glass p-4" : ""}>
          <Body />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
