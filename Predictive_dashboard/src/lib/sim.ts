import { DAYS, NOW, PROFILES, WARDS, bandOf, type Disease } from "@/data/twin";

export interface Interventions {
  larvicide: boolean;
  chlorinate: boolean;
  ashaRounds: number; // 0..3
  stock: boolean;
  awareness: boolean;
  fogging: boolean;
  bedBuffer: number; // 0..10
  drainage: boolean;
}
export const NO_INTERVENTIONS: Interventions = {
  larvicide: false, chlorinate: false, ashaRounds: 0, stock: false, awareness: false, fogging: false, bedBuffer: 0, drainage: false,
};
export const RECOMMENDED: Interventions = {
  larvicide: true, chlorinate: true, ashaRounds: 2, stock: true, awareness: true, fogging: true, bedBuffer: 4, drainage: true,
};

// Effect size of each intervention on peak transmission, by disease.
const EFFECT: Record<Disease, Record<"larvicide" | "chlorinate" | "asha" | "awareness" | "fogging", number>> = {
  lepto: { larvicide: 0, chlorinate: 0.16, asha: 0.08, awareness: 0.18, fogging: 0 },
  dengue: { larvicide: 0.25, fogging: 0.15, asha: 0.065, awareness: 0.07, chlorinate: 0.02 },
  diarrhoeal: { larvicide: 0.02, fogging: 0, asha: 0.08, awareness: 0.1, chlorinate: 0.38 },
  ili: { larvicide: 0, fogging: 0, asha: 0.1, awareness: 0.22, chlorinate: 0 },
  malaria: { larvicide: 0.22, fogging: 0.18, asha: 0.07, awareness: 0.06, chlorinate: 0 },
};

/** Combined fractional reduction (0..1). Stacked effects multiply, so returns diminish. */
export function reduction(disease: Disease, iv: Interventions): number {
  const e = EFFECT[disease];
  const parts: number[] = [];
  if (iv.drainage) parts.push(disease === "lepto" ? 0.28 : disease === "diarrhoeal" ? 0.12 : disease === "ili" ? 0 : 0.035);
  if (iv.larvicide) parts.push(e.larvicide);
  if (iv.chlorinate) parts.push(e.chlorinate);
  if (iv.awareness) parts.push(e.awareness);
  if (iv.fogging) parts.push(e.fogging);
  for (let i = 0; i < iv.ashaRounds; i++) parts.push(e.asha * Math.pow(0.8, i));
  const remain = parts.reduce((acc, p) => acc * (1 - p), 1);
  return 1 - remain;
}

const noise = (d: number) => {
  const i = Math.round(d);
  return 0.88 + (((i * 9301 + 49297) % 233280) / 233280) * 0.24;
};

/** Expected cases/day for the village (p50). History is untouched by interventions. */
export function casesAt(disease: Disease, d: number, R = 0): number {
  const p = PROFILES[disease];
  const blend = d <= NOW ? 0 : Math.min(1, (d - NOW) / 4);
  const shift = 2 * Math.min(1, R / 0.5) * blend;
  const g = Math.exp(-((d - (p.peakDay + shift)) ** 2) / (2 * p.sigma ** 2));
  const v = p.base + p.peak * g * (1 - R * blend);
  return d <= NOW ? v * noise(d) : v;
}

export function bandAt(disease: Disease, d: number, R = 0) {
  const c = casesAt(disease, d, R);
  if (d <= NOW) return { p10: c, p50: c, p90: c };
  const k = d - NOW;
  return { p10: c * Math.max(0.45, 1 - 0.05 * k), p50: c, p90: c * (1 + 0.065 * k) };
}

/** Village outbreak risk score 0..100 — a leading indicator (looks ~3 days ahead). */
export function villageRisk(disease: Disease, d: number, R = 0): number {
  const p = PROFILES[disease];
  const ahead = Math.max(0, casesAt(disease, d + 3, d + 3 > NOW ? R : 0) - p.base) / p.peak;
  const env = d >= 6 ? 16 * Math.exp(-((d - 9) ** 2) / 20) * (1 - R * 0.6 * Math.min(1, Math.max(0, d - NOW) / 3)) : 0;
  return Math.max(4, Math.min(98, 6 + 88 * Math.pow(ahead, 0.75) + env));
}

export function wardRisk(disease: Disease, wardId: string, d: number, R = 0) {
  const w = PROFILES[disease].weights;
  const max = Math.max(...Object.values(w));
  return Math.max(3, Math.min(99, villageRisk(disease, d, R) * (0.5 + 0.65 * ((w[wardId] ?? 0) / max))));
}

export function wardCases(disease: Disease, wardId: string, d: number, R = 0) {
  return Math.round(casesAt(disease, d, R) * (PROFILES[disease].weights[wardId] ?? 0));
}

export const PHC_BEDS = 8;
export const DISTRICT_ALLOTMENT = 4;

export function bedDemand(disease: Disease, d: number, R = 0) {
  const s = casesAt(disease, d, R) + casesAt(disease, d - 1, R) + casesAt(disease, d - 2, R);
  return s * 0.12;
}

export interface Summary {
  peak: number; peakDay: number; total: number; crossDay: number | null; stockOutDay: number | null;
}
export function summarize(disease: Disease, iv: Interventions): Summary {
  const R = reduction(disease, iv);
  let peak = 0, peakDay = NOW, total = 0, crossDay: number | null = null, stockOutDay: number | null = null;
  let kits = 60 + (iv.stock ? 80 : 0);
  const cap = PHC_BEDS + DISTRICT_ALLOTMENT + iv.bedBuffer;
  for (let d = NOW + 1; d <= DAYS; d++) {
    const c = casesAt(disease, d, R);
    total += c;
    if (c > peak) { peak = c; peakDay = d; }
    if (crossDay === null && bedDemand(disease, d, R) > cap) crossDay = d;
    kits -= c * 0.9;
    if (stockOutDay === null && kits <= 0) stockOutDay = d;
  }
  return { peak: Math.round(peak), peakDay, total: Math.round(total), crossDay, stockOutDay };
}

export function effort(iv: Interventions) {
  const hours = (iv.drainage ? 32 : 0) + (iv.larvicide ? 36 : 0) + (iv.chlorinate ? 8 : 0) + iv.ashaRounds * 24 + (iv.stock ? 4 : 0) + (iv.awareness ? 10 : 0) + (iv.fogging ? 20 : 0) + iv.bedBuffer * 6;
  const kits = (iv.stock ? 80 : 0) + (iv.chlorinate ? 12 : 0) + (iv.larvicide ? 25 : 0);
  return { hours, kits };
}

export const topWard = (disease: Disease, d: number) =>
  [...WARDS].sort((a, b) => wardRisk(disease, b.id, d) - wardRisk(disease, a.id, d))[0];

export { bandOf };
