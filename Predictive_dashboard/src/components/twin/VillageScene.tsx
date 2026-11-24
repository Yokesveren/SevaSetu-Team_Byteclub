import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Hospital, School, Store, Landmark, Users, Baby, RadioTower, Cross, Maximize2, RotateCcw, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  ASHAS, BREEDING, CLUSTERS, DEAD_ZONES, GATEWAY, MAP_H, MAP_W, PLACES, PROFILES, WARDS, WATER,
  bandOf, mulberry32, rainAt, vulnerableTotal, waterStatus, type Pt, type RiskBand,
} from "@/data/twin";
import { reduction, wardCases, wardRisk } from "@/lib/sim";
import { useTwin, type LayerId } from "@/store/twinStore";
import { t } from "@/lib/i18n";

export const bandColor = (b: RiskBand) => `var(--risk-${b})`;
const MIN_K = 0.9, MAX_K = 4;

const JITTER = (() => {
  const rng = mulberry32(99);
  return WARDS.map(() => Array.from({ length: 90 }, () => [Math.round((rng() - 0.5) * 190), Math.round((rng() - 0.5) * 120)] as Pt));
})();

function pathD(pts: Pt[]) {
  return pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
}

type Hover = { x: number; y: number; title: string; lines: string[] } | null;

export function VillageScene() {
  const svgRef = useRef<SVGSVGElement>(null);
  const camRef = useRef<SVGGElement>(null);
  const miniRef = useRef<SVGRectElement>(null);
  const cam = useRef({ x: 0, y: 0, k: 1 });
  const anim = useRef<number | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const fly = useTwin((s) => s.fly);
  const lang = useTwin((s) => s.lang);
  const layers = useTwin((s) => s.layers);
  const loraNonce = useTwin((s) => s.loraNonce);
  const set = useTwin((s) => s.set);

  const apply = () => {
    const { x, y, k } = cam.current;
    camRef.current?.setAttribute("transform", `translate(${x},${y}) scale(${k})`);
    if (miniRef.current) {
      miniRef.current.setAttribute("x", String(-x / k));
      miniRef.current.setAttribute("y", String(-y / k));
      miniRef.current.setAttribute("width", String(MAP_W / k));
      miniRef.current.setAttribute("height", String(MAP_H / k));
    }
  };
  const clamp = (c: { x: number; y: number; k: number }) => {
    const k = Math.min(MAX_K, Math.max(MIN_K, c.k));
    const minX = MAP_W - MAP_W * k - 80, minY = MAP_H - MAP_H * k - 80;
    return { k, x: Math.min(80, Math.max(minX, c.x)), y: Math.min(80, Math.max(minY, c.y)) };
  };
  const animateTo = (target: { x: number; y: number; k: number }) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = { ...cam.current }, to = clamp(target), t0 = performance.now(), dur = reduce ? 1 : 700;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      cam.current = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e };
      apply();
      if (p < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  const focus = (p: Pt, k: number) => animateTo({ k, x: MAP_W / 2 - p[0] * k, y: MAP_H / 2 - p[1] * k });

  useEffect(() => { if (fly) focus([fly.x, fly.y], fly.k); }, [fly]); // eslint-disable-line react-hooks/exhaustive-deps

  const toLocal = (cx: number, cy: number): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [r.x, r.y];
  };

  useEffect(() => {
    const el = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const c = cam.current;
      const next = Math.min(MAX_K, Math.max(MIN_K, c.k * Math.exp(-dy * 0.0018)));
      const [px, py] = toLocal(e.clientX, e.clientY);
      const r = next / c.k;
      cam.current = clamp({ k: next, x: px - (px - c.x) * r, y: py - (py - c.y) * r });
      apply();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const [x, y] = toLocal(e.clientX, e.clientY);
    drag.current = { x, y, cx: cam.current.x, cy: cam.current.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || e.buttons !== 1) return;
    const [x, y] = toLocal(e.clientX, e.clientY);
    const dx = x - drag.current.x, dy = y - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      drag.current.moved = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
    if (drag.current.moved) {
      cam.current = clamp({ ...cam.current, x: drag.current.cx + dx, y: drag.current.cy + dy });
      apply();
    }
  };
  const onPointerUp = () => { setTimeout(() => (drag.current = null), 0); };

  const select = (sel: NonNullable<ReturnType<typeof useTwin.getState>["selected"]>, p: Pt) => {
    if (drag.current?.moved) return;
    set({ selected: sel, highlight: [] });
    focus(p, Math.max(cam.current.k, 1.6));
  };

  const hoverAt = (e: React.MouseEvent, title: string, lines: string[]) => {
    const r = svgRef.current!.getBoundingClientRect();
    setHover({ x: e.clientX - r.left, y: e.clientY - r.top, title, lines });
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border" style={{ background: "var(--map-bg)" }} data-tour="map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        role="application" aria-label="Interactive map of Kelamangalam village"
      >
        <SceneDefs />
        <g ref={camRef}>
          <Terrain />
          <Layers layers={layers} />
          <Entities select={select} hoverAt={hoverAt} clearHover={() => setHover(null)} />
          <AshaWalkers select={select} />
          {loraNonce > 0 && <LoraRelay key={loraNonce} />}
        </g>
        <Ambient />
      </svg>

      {hover && (
        <div className="pointer-events-none absolute z-20 glass px-3 py-2 text-xs shadow-xl" style={{ left: Math.min(hover.x + 14, 9999), top: hover.y + 14, maxWidth: 240 }}>
          <div className="font-semibold text-foreground">{hover.title}</div>
          {hover.lines.map((l) => <div key={l} className="text-muted-foreground">{l}</div>)}
        </div>
      )}

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <MapBtn label={t("fit", lang)} onClick={() => animateTo({ x: 0, y: 0, k: 1 })}><Maximize2 className="h-4 w-4" /></MapBtn>
        <MapBtn label={t("reset", lang)} onClick={() => { animateTo({ x: 0, y: 0, k: 1 }); set({ selected: null, highlight: [] }); }}><RotateCcw className="h-4 w-4" /></MapBtn>
        <MapBtn label={t("replayLora", lang)} onClick={() => {
          const s = useTwin.getState();
          set({ loraNonce: s.loraNonce + 1, layers: s.layers.includes("connectivity") ? s.layers : [...s.layers, "connectivity"] });
        }}><Radio className="h-4 w-4" /></MapBtn>
      </div>

      <div className="absolute bottom-3 left-3 hidden sm:block glass p-1" aria-hidden>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={150} height={96}>
          <rect width={MAP_W} height={MAP_H} fill="var(--map-bg)" />
          {WARDS.map((w) => <path key={w.id} d={pathD(w.polygon) + "Z"} fill="var(--map-hill)" stroke="var(--map-ink)" strokeOpacity={0.3} strokeWidth={4} />)}
          <path d="M 1000 250 C 850 300, 720 520, 520 560 S 200 600, 0 620" stroke="var(--map-water)" strokeWidth={18} fill="none" />
          <rect ref={miniRef} x={0} y={0} width={MAP_W} height={MAP_H} fill="none" stroke="var(--saffron)" strokeWidth={14} />
        </svg>
      </div>
      <Legend />
    </div>
  );
}

function MapBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="glass grid h-9 w-9 place-items-center text-foreground transition hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
      {children}
    </button>
  );
}

function SceneDefs() {
  return (
    <defs>
      {(["low", "watch", "elevated", "critical"] as RiskBand[]).map((b) => (
        <radialGradient key={b} id={`heat-${b}`}>
          <stop offset="0%" stopColor={bandColor(b)} stopOpacity={0.85} />
          <stop offset="55%" stopColor={bandColor(b)} stopOpacity={0.35} />
          <stop offset="100%" stopColor={bandColor(b)} stopOpacity={0} />
        </radialGradient>
      ))}
      <radialGradient id="mosq"><stop offset="0%" stopColor="var(--risk-elevated)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--risk-elevated)" stopOpacity={0} /></radialGradient>
      <radialGradient id="cover"><stop offset="0%" stopColor="var(--brand-blue)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--brand-blue)" stopOpacity={0} /></radialGradient>
      <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="var(--risk-critical)" strokeWidth="3" strokeOpacity="0.5" />
      </pattern>
      <filter id="blur"><feGaussianBlur stdDeviation="14" /></filter>
      <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
  );
}

const Terrain = memo(function Terrain() {
  return (
    <g aria-hidden>
      <rect x={-200} y={-200} width={MAP_W + 400} height={MAP_H + 400} fill="var(--map-bg)" />
      {[260, 200, 145, 95, 50].map((r, i) => (
        <ellipse key={r} cx={830} cy={140} rx={r * 1.5} ry={r} fill={i % 2 ? "var(--map-hill2)" : "var(--map-hill)"} opacity={0.9} />
      ))}
      {[200, 140, 85].map((r, i) => (
        <ellipse key={r} cx={250} cy={150} rx={r * 1.4} ry={r * 0.8} fill={i % 2 ? "var(--map-hill2)" : "var(--map-hill)"} opacity={0.7} />
      ))}
      <path d="M 700 0 L 1000 0 L 1000 280 C 940 250, 900 210, 860 240 C 820 260, 790 200, 740 160 C 700 120, 690 60, 700 0 Z" fill="var(--map-forest)" opacity={0.7} />
      {Array.from({ length: 26 }, (_, i) => {
        const x = 720 + ((i * 53) % 270), y = 20 + ((i * 37) % 210);
        return <circle key={i} cx={x} cy={y} r={9 + (i % 3) * 3} fill="var(--map-forest)" />;
      })}
      {([[120, 560], [210, 545], [560, 600], [660, 585], [90, 500]] as [number, number][]).map(([x, y], i) => (
        <g key={i} className="anim-sway" style={{ animationDelay: `${i * 0.4}s` }}>
          <rect x={x} y={y} width={80} height={40} rx={4} fill="var(--map-paddy)" stroke="var(--map-ink)" strokeOpacity={0.15} />
          {[12, 28, 44, 60].map((dx) => <line key={dx} x1={x + dx} y1={y + 6} x2={x + dx} y2={y + 34} stroke="var(--india-green)" strokeOpacity={0.4} />)}
        </g>
      ))}
      <path d="M 1000 250 C 850 300, 720 520, 520 560 S 200 600, 0 620" stroke="var(--map-water)" strokeWidth={16} fill="none" strokeLinecap="round" />
      <path d="M 1000 250 C 850 300, 720 520, 520 560 S 200 600, 0 620" stroke="var(--map-house)" strokeOpacity={0.35} strokeWidth={2} fill="none" strokeDasharray="6 14" className="anim-flow" />
      <path d="M 820 140 C 720 200, 600 240, 520 300" stroke="var(--map-water)" strokeWidth={5} fill="none" strokeDasharray="2 0" opacity={0.8} />
      <path d="M 820 140 C 720 200, 600 240, 520 300" stroke="var(--map-house)" strokeOpacity={0.4} strokeWidth={1.5} fill="none" strokeDasharray="4 10" className="anim-flow" />
      <path d="M 380 640 L 380 535 L 480 345 L 560 150 M 480 345 L 720 400 L 815 175 M 380 535 L 245 430 L 300 175 L 560 150" stroke="var(--map-road)" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(395 618)"><text fontSize={12} fill="var(--map-ink)" fontFamily="var(--font-mono)">↓ District Hospital · 38 km</text></g>
      {WARDS.map((w) => (
        <g key={w.id}>
          <path d={pathD(w.polygon) + "Z"} fill="none" stroke="var(--map-ink)" strokeOpacity={0.22} strokeDasharray="5 5" />
          <text x={w.centroid[0]} y={w.centroid[1] - 70} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--map-ink)" opacity={0.8}>{w.name}</text>
        </g>
      ))}
    </g>
  );
});

function Layers({ layers }: { layers: LayerId[] }) {
  const on = (l: LayerId) => (layers.includes(l) ? 1 : 0);
  return (
    <g>
      <g className="layer-fade" style={{ opacity: on("vulnerability") }} pointerEvents="none"><VulnLayer /></g>
      <g className="layer-fade" style={{ opacity: on("connectivity") }} pointerEvents="none"><ConnLayer /></g>
      <g className="layer-fade" style={{ opacity: on("risk") }} pointerEvents="none"><HeatLayer /></g>
      <g className="layer-fade" style={{ opacity: on("vector") }} pointerEvents="none"><VectorLayer /></g>
      <g className="layer-fade" style={{ opacity: on("water") }} pointerEvents="none"><WaterFlow /></g>
      <g className="layer-fade" style={{ opacity: on("mobility") }} pointerEvents="none"><MobilityLayer /></g>
      <g className="layer-fade" style={{ opacity: on("cases") }} pointerEvents="none"><CaseLayer /></g>
    </g>
  );
}

function useR() {
  const disease = useTwin((s) => s.disease);
  const iv = useTwin((s) => s.interventions);
  return useMemo(() => reduction(disease, iv), [disease, iv]);
}

function HeatLayer() {
  const day = useTwin((s) => s.day), disease = useTwin((s) => s.disease);
  const R = useR();
  const prof = PROFILES[disease];
  return (
    <g filter="url(#blur)">
      {WARDS.map((w) => {
        const r = wardRisk(disease, w.id, day, R);
        return <circle key={w.id} cx={w.centroid[0]} cy={w.centroid[1]} r={60 + r * 1.3} fill={`url(#heat-${bandOf(r)})`} opacity={0.35 + r / 160} style={{ transition: "r 300ms, opacity 300ms" }} />;
      })}
      {prof.hotspots.map((p, i) => {
        const w = WARDS.reduce((a, b) => (Math.hypot(b.centroid[0] - p[0], b.centroid[1] - p[1]) < Math.hypot(a.centroid[0] - p[0], a.centroid[1] - p[1]) ? b : a));
        const r = wardRisk(disease, w.id, day, R);
        return <circle key={i} cx={p[0]} cy={p[1]} r={20 + r * 0.6} fill={`url(#heat-${bandOf(r)})`} opacity={r / 110} />;
      })}
    </g>
  );
}

function CaseLayer() {
  const day = useTwin((s) => s.day), disease = useTwin((s) => s.disease);
  const R = useR();
  return (
    <g>
      {WARDS.map((w, wi) => {
        const n = Math.min(90, wardCases(disease, w.id, day, R) * 2 + 1);
        return JITTER[wi]!.slice(0, n).map((j, i) => (
          <circle key={`${w.id}${i}`} cx={w.centroid[0] + j[0] * 0.8} cy={w.centroid[1] + j[1] * 0.8} r={3} fill="var(--risk-critical)" stroke="var(--map-house)" strokeWidth={0.8} opacity={0.85} />
        ));
      })}
    </g>
  );
}

function VectorLayer() {
  const day = useTwin((s) => s.day);
  const R = useR();
  const idx = Math.min(1, (rainAt(day - 2) + rainAt(day - 3) + rainAt(day - 1)) / 120 + (day > 8 ? 0.4 : 0)) * (day > 14 ? 1 - R * 0.8 : 1);
  return (
    <g>
      {BREEDING.map((b) => (
        <g key={b.id}>
          <circle cx={b.pos[0]} cy={b.pos[1]} r={30 + idx * 80} fill="url(#mosq)" />
          <circle cx={b.pos[0]} cy={b.pos[1]} r={8} fill="none" stroke="var(--risk-elevated)" strokeWidth={2} className="anim-pulse" />
        </g>
      ))}
    </g>
  );
}

function WaterFlow() {
  const day = useTwin((s) => s.day), disease = useTwin((s) => s.disease);
  return (
    <g>
      {WATER.map((w) => {
        const st = waterStatus(w, day, disease);
        return <circle key={w.id} cx={w.position[0]} cy={w.position[1]} r={22} fill="none" stroke={bandColor(st)} strokeWidth={4} opacity={0.9} />;
      })}
      {day >= 11 && <path d="M 585 195 C 560 240, 540 270, 520 300 C 500 340, 470 360, 440 400" stroke="var(--risk-elevated)" strokeWidth={3} fill="none" strokeDasharray="6 8" className="anim-flow" />}
      {day >= 6 && <path d="M 520 300 C 580 360, 620 430, 655 475" stroke="var(--risk-watch)" strokeWidth={3} fill="none" strokeDasharray="6 8" className="anim-flow" />}
    </g>
  );
}

function ConnLayer() {
  return (
    <g>
      <circle cx={GATEWAY[0]} cy={GATEWAY[1]} r={420} fill="url(#cover)" />
      <circle cx={GATEWAY[0]} cy={GATEWAY[1]} r={420} fill="none" stroke="var(--brand-blue)" strokeDasharray="8 8" strokeOpacity={0.6} />
      {DEAD_ZONES.map((z, i) => (
        <g key={i}>
          <path d={pathD(z) + "Z"} fill="url(#hatch)" stroke="var(--risk-critical)" strokeWidth={1.5} />
          <text x={z[0]![0] + 20} y={z[0]![1] + 40} fontSize={11} fill="var(--risk-critical)" fontWeight={600}>Dead-zone</text>
        </g>
      ))}
    </g>
  );
}

function VulnLayer() {
  return (
    <g>
      {WARDS.map((w) => (
        <g key={w.id}>
          <circle cx={w.centroid[0]} cy={w.centroid[1] + 30} r={vulnerableTotal(w) / 2.2} fill="var(--brand-blue)" opacity={0.25} stroke="var(--brand-blue)" />
          <text x={w.centroid[0]} y={w.centroid[1] + 34} textAnchor="middle" fontSize={10} fill="var(--map-ink)" fontFamily="var(--font-mono)">👶{w.children_u5} 🤰{w.pregnant} 👵{w.elderly}</text>
        </g>
      ))}
    </g>
  );
}

function MobilityLayer() {
  const hubs: Pt[] = [[365, 250], [430, 470], [380, 535]];
  return (
    <g>
      {WARDS.flatMap((w) => hubs.map((h, i) => (
        <path key={w.id + i} d={`M${w.centroid[0]},${w.centroid[1]} Q ${(w.centroid[0] + h[0]) / 2 + 30},${(w.centroid[1] + h[1]) / 2 - 30} ${h[0]},${h[1]}`} stroke="var(--brand-blue)" strokeOpacity={0.45} strokeWidth={1.5} fill="none" strokeDasharray="3 9" className="anim-flow" />
      )))}
    </g>
  );
}

const PLACE_ICON = { phc: Hospital, subcentre: Cross, anganwadi: Baby, school: School, market: Store, temple: Landmark, hall: Users, gateway: RadioTower };

function Entities({ select, hoverAt, clearHover }: {
  select: (s: { kind: "ward" | "cluster" | "water" | "place" | "asha" | "alert"; id: string }, p: Pt) => void;
  hoverAt: (e: React.MouseEvent, title: string, lines: string[]) => void; clearHover: () => void;
}) {
  const day = useTwin((s) => s.day), disease = useTwin((s) => s.disease), layers = useTwin((s) => s.layers);
  const highlight = useTwin((s) => s.highlight), selected = useTwin((s) => s.selected);
  const R = useR();
  const ashaOn = layers.includes("asha"), waterOn = layers.includes("water");
  const a11y = (label: string, fn: () => void) => ({
    role: "button", tabIndex: 0, "aria-label": label, style: { cursor: "pointer" },
    onClick: fn, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } },
    onMouseLeave: clearHover,
  });
  const hl = (id: string) => highlight.includes(id) || (selected && selected.id === id);

  return (
    <g>
      {WARDS.map((w) => {
        const r = wardRisk(disease, w.id, day, R), b = bandOf(r);
        return (
          <path key={w.id} d={pathD(w.polygon) + "Z"} fill="transparent" stroke={hl(w.id) ? "var(--saffron)" : "transparent"} strokeWidth={3}
            {...a11y(`Ward ${w.name}, risk ${Math.round(r)} ${b}`, () => select({ kind: "ward", id: w.id }, w.centroid))}
            onMouseMove={(e) => hoverAt(e, w.name, [`Risk ${Math.round(r)} · ${b}`, `Pop. ${w.population} · ${wardCases(disease, w.id, day, R)} cases/day`])} />
        );
      })}
      {CLUSTERS.map((c) => {
        const r = wardRisk(disease, c.wardId, day, R) * (0.85 + c.feverTags * 0.08), b = bandOf(r);
        const stale = c.visitDaysAgo + Math.max(0, Math.floor(day) - 12) * (c.wardId === "pudhu" ? 1 : 0);
        return (
          <g key={c.id} transform={`translate(${c.pos[0]} ${c.pos[1]})`}
            {...a11y(`Household cluster of ${c.households} homes`, () => select({ kind: "cluster", id: c.id }, c.pos))}
            onMouseMove={(e) => hoverAt(e, `Cluster · ${c.households} households`, [`Last ASHA visit ${stale} days ago`, `${c.feverTags} with fever tags`])}>
            {ashaOn && stale >= 6 && <circle r={13} fill="var(--risk-watch)" opacity={0.35} filter="url(#glow)" />}
            <path d="M -7 0 L 0 -7 L 7 0 L 7 6 L -7 6 Z" fill="var(--map-house)" stroke={bandColor(b)} strokeWidth={2} />
            {hl(c.id) && <circle r={12} fill="none" stroke="var(--saffron)" strokeWidth={2} />}
          </g>
        );
      })}
      {WATER.map((w) => {
        const st = waterStatus(w, day, disease);
        return (
          <g key={w.id} transform={`translate(${w.position[0]} ${w.position[1]})`}
            {...a11y(`${w.name}, water status ${st}`, () => select({ kind: "water", id: w.id }, w.position))}
            onMouseMove={(e) => hoverAt(e, w.name, [`Status: ${st}`, `Chlorine ${w.chlorine_ppm} ppm · ${w.householdsServed} households`])}>
            {w.type === "pond" || w.type === "tank" ? (
              <ellipse rx={w.type === "pond" ? 22 : 16} ry={w.type === "pond" ? 13 : 10} fill="var(--map-water)" stroke={waterOn ? bandColor(st) : "var(--map-ink)"} strokeOpacity={waterOn ? 1 : 0.3} strokeWidth={2} />
            ) : (
              <circle r={7} fill="var(--map-water)" stroke={bandColor(st)} strokeWidth={2.5} />
            )}
            {w.type === "handpump" && <rect x={-1.5} y={-14} width={3} height={8} fill="var(--map-ink)" />}
            {hl(w.id) && <circle r={20} fill="none" stroke="var(--saffron)" strokeWidth={2} className="anim-pulse" />}
          </g>
        );
      })}
      {BREEDING.map((b) => hl(b.id) && (
        <circle key={b.id} cx={b.pos[0]} cy={b.pos[1]} r={14} fill="none" stroke="var(--saffron)" strokeWidth={3} className="anim-pulse" />
      ))}
      {PLACES.map((p) => {
        const Icon = PLACE_ICON[p.kind];
        const big = p.kind === "phc";
        const s = big ? 34 : 24;
        return (
          <g key={p.id} transform={`translate(${p.pos[0]} ${p.pos[1]})`}
            {...a11y(p.name, () => select({ kind: "place", id: p.id }, p.pos))}
            onMouseMove={(e) => hoverAt(e, p.name, [p.kind === "phc" ? "8 beds · 1 doctor on duty" : p.kind])}>
            <rect x={-s / 2 - 4} y={-s / 2 - 4} width={s + 8} height={s + 8} rx={8} fill="var(--card)" stroke={hl(p.id) ? "var(--saffron)" : big ? "var(--india-green)" : "var(--border)"} strokeWidth={hl(p.id) ? 3 : 1.5} />
            <Icon x={-s / 2} y={-s / 2} width={s} height={s} color={big ? "var(--india-green)" : p.kind === "anganwadi" ? "var(--saffron)" : "var(--brand-blue)"} strokeWidth={1.8} />
            {big && (
              <g transform="translate(14 -34)"><RadioTower x={0} y={0} width={18} height={18} color="var(--brand-blue)" /></g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function AshaWalkers({ select }: { select: (s: { kind: "asha"; id: string }, p: Pt) => void }) {
  const refs = useRef<(SVGGElement | null)[]>([]);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const pos = useRef<Pt[]>(ASHAS.map((a) => a.route[0]!));
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = (now: number) => {
      ASHAS.forEach((a, i) => {
        const p = paths.current[i], g = refs.current[i];
        if (!p || !g) return;
        const len = p.getTotalLength();
        const pt = p.getPointAtLength(((now / 1000) * (14 + i * 3) + i * 200) % len);
        pos.current[i] = [pt.x, pt.y];
        g.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      });
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const highlight = useTwin((s) => s.highlight);
  return (
    <g>
      {ASHAS.map((a, i) => (
        <g key={a.id}>
          <path ref={(el) => { paths.current[i] = el; }} d={pathD(a.route)} fill="none" stroke="var(--saffron)" strokeOpacity={0.25} strokeDasharray="2 6" />
          <g ref={(el) => { refs.current[i] = el; }} role="button" tabIndex={0} aria-label={`ASHA worker ${a.name}`} style={{ cursor: "pointer" }}
            onClick={() => select({ kind: "asha", id: a.id }, pos.current[i]!)}
            onKeyDown={(e) => { if (e.key === "Enter") select({ kind: "asha", id: a.id }, pos.current[i]!); }}>
            {highlight.includes(a.id) && <circle r={16} fill="none" stroke="var(--saffron)" strokeWidth={2} className="anim-pulse" />}
            <circle r={9} fill="var(--saffron)" stroke="var(--map-house)" strokeWidth={2} />
            <circle cy={-3} r={2.6} fill="var(--map-house)" />
            <path d="M -4 4 Q 0 -1 4 4" fill="var(--map-house)" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Ambient() {
  const day = useTwin((s) => s.day);
  const raining = rainAt(day) > 30;
  return (
    <g pointerEvents="none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i} className="anim-drift" style={{ animationDelay: `${-i * 30}s`, animationDuration: `${80 + i * 25}s` }}>
          <ellipse cx={0} cy={80 + i * 170} rx={90} ry={22} fill="var(--map-house)" opacity={0.12} />
          <ellipse cx={50} cy={70 + i * 170} rx={60} ry={18} fill="var(--map-house)" opacity={0.1} />
        </g>
      ))}
      {raining && Array.from({ length: 70 }, (_, i) => (
        <line key={i} x1={(i * 137) % MAP_W} y1={(i * 71) % 200 - 200} x2={(i * 137) % MAP_W - 4} y2={(i * 71) % 200 - 186}
          stroke="var(--map-water)" strokeWidth={1.4} opacity={0.6} className="anim-rain" style={{ animationDelay: `${(i % 10) * -0.09}s` }} />
      ))}
    </g>
  );
}

function LoraRelay() {
  const start: Pt = [840, 175];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [
      setTimeout(() => setStage(1), 1500),
      setTimeout(() => setStage(2), 3000),
      setTimeout(() => { setStage(3); toast.info("Yellow case received via LoRa, 4.2 km (simulated)", { description: "PHC Kelamangalam · Malai Adivaram cluster" }); }, 5200),
      setTimeout(() => setStage(4), 6400),
      setTimeout(() => { setStage(5); toast.success("Doctor reply delivered to ASHA Lakshmi R. (simulated)", { description: "Advice: start ORS, recheck temperature in 6h" }); }, 8600),
      setTimeout(() => setStage(6), 10500),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);
  const badge = ["Online", "Offline", "Queued over LoRa", "Delivered", "Delivered", "Reply received", "Reply received"][stage];
  const badgeColor = stage === 1 ? "var(--risk-critical)" : stage === 2 ? "var(--risk-watch)" : "var(--risk-low)";
  if (stage >= 6) return null;
  return (
    <g pointerEvents="none">
      <line x1={start[0]} y1={start[1]} x2={GATEWAY[0]} y2={GATEWAY[1]} stroke="var(--brand-blue)" strokeWidth={2} strokeDasharray="4 6" opacity={stage >= 2 ? 0.8 : 0} />
      <motion.g initial={{ x: 760, y: 240 }} animate={{ x: start[0], y: start[1] }} transition={{ duration: 1.4 }}>
        <circle r={11} fill="var(--saffron)" stroke="var(--map-house)" strokeWidth={2} />
        <g transform="translate(14 -30)">
          <rect width={128} height={22} rx={11} fill="var(--card)" stroke={badgeColor} />
          <circle cx={11} cy={11} r={4} fill={badgeColor} />
          <text x={20} y={15} fontSize={11} fill="var(--map-ink)">{badge}</text>
        </g>
      </motion.g>
      {stage >= 2 && stage < 4 && (
        <motion.circle r={7} fill="var(--risk-watch)" filter="url(#glow)" initial={{ cx: start[0], cy: start[1] }} animate={{ cx: GATEWAY[0], cy: GATEWAY[1] }} transition={{ duration: 2.2, ease: "easeInOut" }} />
      )}
      {stage >= 4 && stage < 6 && (
        <motion.circle r={6} fill="var(--risk-low)" filter="url(#glow)" initial={{ cx: GATEWAY[0], cy: GATEWAY[1] }} animate={{ cx: start[0], cy: start[1] }} transition={{ duration: 2.2, ease: "easeInOut" }} />
      )}
      <g transform="translate(560 290)">
        <rect width={150} height={24} rx={12} fill="var(--card)" stroke="var(--brand-blue)" />
        <text x={75} y={16} textAnchor="middle" fontSize={11} fill="var(--map-ink)" fontWeight={600}>LoRa relay · Simulated</text>
      </g>
    </g>
  );
}

function Legend() {
  const layers = useTwin((s) => s.layers), lang = useTwin((s) => s.lang);
  const bands: RiskBand[] = ["low", "watch", "elevated", "critical"];
  const icons: Record<RiskBand, string> = { low: "●", watch: "▲", elevated: "◆", critical: "✖" };
  return (
    <div className="absolute bottom-3 right-3 glass max-w-[260px] px-3 py-2 text-[11px]" aria-label="Map legend">
      <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1">
        {bands.map((b) => (
          <span key={b} className="inline-flex items-center gap-1 text-foreground">
            <span style={{ color: bandColor(b) }} aria-hidden>{icons[b]}</span>{t(b, lang)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 text-muted-foreground">
        {layers.map((l) => <span key={l} className="rounded bg-muted px-1.5 py-0.5">{t(l, lang)}</span>)}
      </div>
    </div>
  );
}
