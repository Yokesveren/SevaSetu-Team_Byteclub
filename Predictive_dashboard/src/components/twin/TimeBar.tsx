import { useMemo } from "react";
import { Pause, Play } from "lucide-react";
import { Area, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DAYS, NOW, PROFILES } from "@/data/twin";
import { bandAt, reduction } from "@/lib/sim";
import { t } from "@/lib/i18n";
import { useTwin } from "@/store/twinStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function TimeBar() {
  const { day, isPlaying, speed, disease, interventions, lang, set } = useTwin();
  const R = reduction(disease, interventions);
  const data = useMemo(() => Array.from({ length: DAYS + 1 }, (_, d) => {
    const base = bandAt(disease, d, 0), adj = bandAt(disease, d, R);
    return {
      d,
      actual: d <= NOW ? +base.p50.toFixed(1) : null,
      p50: d >= NOW ? +base.p50.toFixed(1) : null,
      band: d >= NOW ? [+base.p10.toFixed(1), +base.p90.toFixed(1)] : null,
      adj: R > 0 && d >= NOW ? +adj.p50.toFixed(1) : null,
    };
  }), [disease, R]);
  return (
    <div className="glass flex flex-col gap-2 px-4 py-3" data-tour="time">
      <div className="flex items-center gap-3">
        <Button onClick={() => set({ isPlaying: !isPlaying, intro: false, day: !isPlaying && day >= DAYS ? 0 : day })} aria-label={isPlaying ? "Pause" : "Play"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border" role="group" aria-label="Playback speed">
          {[1, 2, 4].map((s) => (
            <Button key={s} onClick={() => set({ speed: s })} aria-pressed={speed === s} className={`px-2 py-1 font-mono text-xs ${speed === s ? "bg-accent text-foreground" : "text-muted-foreground"}`}>{s}x</Button>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute -top-0.5 h-2 rounded-r" style={{ left: `${(NOW / DAYS) * 100}%`, right: 0, background: "repeating-linear-gradient(45deg, color-mix(in oklab, var(--brand-blue) 35%, transparent) 0 4px, transparent 4px 8px)" }} />
          <Slider value={[day]} min={0} max={DAYS} step={0.1} onValueChange={([v]) => set({ day: v ?? 0, isPlaying: false, intro: false })} aria-label="Timeline day" />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>-14d</span><span className="font-semibold text-primary">◆ {t("now", lang)}</span><span>+14d · {t("forecastZone", lang)}</span>
          </div>
        </div>
        <div className="w-24 shrink-0 text-right">
          <div className="font-mono text-lg font-semibold text-foreground">{t("day", lang)} {Math.round(day)}</div>
          <div className="text-[10px] text-muted-foreground">{day < NOW - 0.5 ? `${Math.round(NOW - day)} ${lang === "ta" ? "நாட்களுக்கு முன்" : "d ago"}` : day > NOW + 0.5 ? `+${Math.round(day - NOW)} ${lang === "ta" ? "நாள் முன்னறிவிப்பு" : "d forecast"}` : t("now", lang)}</div>
        </div>
      </div>
      <div className="h-24">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <XAxis dataKey="d" type="number" domain={[0, DAYS]} ticks={[0, 7, 14, 21, 28]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(d) => (d === NOW ? "NOW" : `D${d}`)} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 11 }} labelFormatter={(d) => `Day ${d}`} />
            <ReferenceArea x1={NOW} x2={DAYS} fill="var(--brand-blue)" fillOpacity={0.06} />
            <Area dataKey="band" name="80% band" stroke="none" fill="var(--brand-blue)" fillOpacity={0.22} isAnimationActive={false} />
            <Line dataKey="actual" name={lang === "ta" ? "உருவகப்படுத்தப்பட்ட வரலாறு" : "Simulated history"} stroke="var(--foreground)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="p50" name={lang === "ta" ? "முன்னறிவிப்பு" : "Forecast (do nothing)"} stroke="var(--brand-blue)" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="adj" name={lang === "ta" ? "நடவடிக்கையுடன்" : "With interventions"} stroke="var(--risk-low)" strokeWidth={2.5} dot={false} />
            <ReferenceLine y={PROFILES[disease].threshold} stroke="var(--risk-critical)" strokeDasharray="3 3" label={{ value: lang === "ta" ? "எச்சரிக்கை வரம்பு" : "alert threshold", fontSize: 9, fill: "var(--risk-critical)", position: "insideTopLeft" }} />
            <ReferenceLine x={day} stroke="var(--saffron)" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
