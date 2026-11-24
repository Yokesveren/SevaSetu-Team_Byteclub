import { useMemo } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DAYS, NOW } from "@/data/twin";
import { DISTRICT_ALLOTMENT, NO_INTERVENTIONS, PHC_BEDS, RECOMMENDED, bedDemand, casesAt, effort, reduction, summarize, type Interventions } from "@/lib/sim";
import { t } from "@/lib/i18n";
import { useTwin } from "@/store/twinStore";

const TOGGLES: { k: keyof Interventions; label: string; kn: string }[] = [
  { k: "larvicide", label: "Larvicide / source-reduction across aggregate zones", kn: "திரட்டு மண்டலங்களில் கொசு மூலக் கட்டுப்பாடு" },
  { k: "fogging", label: "Fogging in affected aggregate zones", kn: "பாதிக்கப்பட்ட மண்டலங்களில் புகை தெளிப்பு" },
  { k: "chlorinate", label: "Chlorinate water sources · simulated", kn: "நீர் மூலங்களில் குளோரினேஷன் · உருவகம்" },
  { k: "stock", label: "Pre-position ORS & test kits · planning", kn: "ORS & சோதனை கருவிகள் முன் இருப்பு" },
  { k: "drainage", label: "Clear drainage in low-lying lanes", kn: "தாழ்வான தெருக்களில் வடிகால்களைச் சுத்தம் செய்யவும்" },
  { k: "awareness", label: "School & Anganwadi awareness session", kn: "பள்ளி & அங்கன்வாடி விழிப்புணர்வு" },
];

export function InterventionDrawer() {
  const { simOpen, set, setIv, interventions: iv, disease, lang } = useTwin();
  const L = (en: string, kn: string) => lang === "ta" ? kn : en;
  const base = useMemo(() => summarize(disease, NO_INTERVENTIONS), [disease]);
  const after = useMemo(() => summarize(disease, iv), [disease, iv]);
  const R = reduction(disease, iv);
  const eff = effort(iv);
  const averted = base.total - after.total;
  const data = useMemo(() => Array.from({ length: DAYS - NOW + 1 }, (_, i) => {
    const d = NOW + i;
    return { d, before: +casesAt(disease, d).toFixed(1), after: +casesAt(disease, d, R).toFixed(1), bedsB: +bedDemand(disease, d).toFixed(1), bedsA: +bedDemand(disease, d, R).toFixed(1) };
  }), [disease, R]);
  const cap = PHC_BEDS + DISTRICT_ALLOTMENT + iv.bedBuffer;
  return (
    <Sheet open={simOpen} onOpenChange={(o) => set({ simOpen: o })}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("test", lang)}</SheetTitle>
          <SheetDescription>{lang === "ta" ? "திட்டமிடல் உருவகம் மட்டும். மதிப்பீடுகளில் நிச்சயமின்மை உண்டு." : "Simulated response planning · estimates carry uncertainty."}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <div className="space-y-2">
            {TOGGLES.map(({ k, label, kn }) => (
              <label key={k} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span>{lang === "ta" ? kn : label}</span>
                <Switch checked={iv[k] as boolean} onCheckedChange={(v) => setIv({ [k]: v })} />
              </label>
            ))}
            <div className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex justify-between"><span>{lang === "ta" ? "கூடுதல் ஆஷா வருகை சுற்றுகள்" : "Extra ASHA visit rounds"}</span><span className="font-mono">{iv.ashaRounds}</span></div>
              <Slider className="mt-2" min={0} max={3} step={1} value={[iv.ashaRounds]} onValueChange={([v]) => setIv({ ashaRounds: v ?? 0 })} aria-label="Extra ASHA rounds" />
            </div>
            <div className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex justify-between"><span>{lang === "ta" ? "PHC படுக்கை இருப்பு" : "Raise PHC bed buffer"}</span><span className="font-mono">+{iv.bedBuffer} {L("beds", "படுக்கைகள்")}</span></div>
              <Slider className="mt-2" min={0} max={10} step={1} value={[iv.bedBuffer]} onValueChange={([v]) => setIv({ bedBuffer: v ?? 0 })} aria-label="Bed buffer" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setIv(RECOMMENDED)}>{lang === "ta" ? "பரிந்துரைக்கப்பட்டதைப் பயன்படுத்து" : "Apply recommended set"}</Button>
              <Button size="sm" variant="ghost" onClick={() => set({ interventions: NO_INTERVENTIONS })}>{lang === "ta" ? "அழி" : "Clear"}</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat label={L("Predicted peak cases/day", "கணிக்கப்பட்ட அதிகபட்ச வழக்குகள்/நாள்")} v={`${base.peak} → ${after.peak}`} />
            <Stat label={L("Peak day", "அதிகபட்சம் நாள்")} v={`D${base.peakDay} → D${after.peakDay}`} />
            <Stat label={L("Estimated cases averted (peak day)", "தடுக்கப்பட்ட மதிப்பீட்டு வழக்குகள் (அதிகபட்ச நாள்)")} v={base.peak - after.peak > 0 ? `~${base.peak - after.peak}` : "–"} sub={averted > 0 ? `${L("range", "வரம்பு")} ${Math.round((base.peak - after.peak) * 0.7)}–${Math.round((base.peak - after.peak) * 1.25)} · ~${averted} ${L("over 14 days", "14 நாட்களில்")}` : undefined} accent />
            <Stat label={L("Bed capacity exceeded", "படுக்கை திறன் மீறப்பட்டது")} v={after.crossDay ? `${L("from D", "நாளிலிருந்து ")}${after.crossDay}` : L("No", "இல்லை")} sub={base.crossDay ? `${L("do nothing: D", "நடவடிக்கை இல்லை: நாள் ")}${base.crossDay}` : undefined} />
            <Stat label={L("Staff-hours", "பணியாளர் மணிநேரம்")} v={`${eff.hours} h`} />
            <Stat label={L("Kits / supplies", "கருவிகள் / பொருட்கள்")} v={`${eff.kits}`} />
          </div>

          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{L("Cases/day – do nothing vs with interventions", "வழக்குகள்/நாள் – நடவடிக்கை இல்லை vs நடவடிக்கையுடன்")}</div>
            <div className="h-36"><ResponsiveContainer>
              <ComposedChart data={data} margin={{ left: -24, right: 4, top: 4 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(d) => `D${d}`} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11 }} />
                <Area dataKey="before" name={L("Do nothing", "நடவடிக்கை இல்லை")} stroke="var(--risk-critical)" fill="var(--risk-critical)" fillOpacity={0.15} strokeDasharray="4 3" />
                <Area dataKey="after" name={L("With interventions", "நடவடிக்கையுடன்")} stroke="var(--risk-low)" fill="var(--risk-low)" fillOpacity={0.25} />
              </ComposedChart>
            </ResponsiveContainer></div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{L("Bed demand vs capacity", "படுக்கை தேவை vs திறன்")} ({cap})</div>
            <div className="h-32"><ResponsiveContainer>
              <ComposedChart data={data} margin={{ left: -24, right: 4, top: 4 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(d) => `D${d}`} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11 }} />
                <Line dataKey="bedsB" name={L("Do nothing", "நடவடிக்கை இல்லை")} stroke="var(--risk-critical)" dot={false} strokeDasharray="4 3" />
                <Line dataKey="bedsA" name={L("With interventions", "நடவடிக்கையுடன்")} stroke="var(--risk-low)" dot={false} strokeWidth={2} />
                <ReferenceLine y={cap} stroke="var(--foreground)" strokeDasharray="2 4" label={{ value: L("capacity", "திறன்"), fontSize: 9, fill: "var(--muted-foreground)" }} />
              </ComposedChart>
            </ResponsiveContainer></div>
          </div>
          <Button className="w-full" onClick={() => set({ simOpen: false, day: 20 })}>{lang === "ta" ? "வரைபடத்தில் பார்க்கவும் (நாள் 20)" : "See it on the map (day 20)"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, v, sub, accent }: { label: string; v: string; sub?: string | undefined; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-mono text-lg font-semibold ${accent ? "text-risk-low" : "text-foreground"}`}>{v}</div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
