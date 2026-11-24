// Deterministic, seeded mock world for the SevaSetu village digital twin.
export type RiskBand = "low" | "watch" | "elevated" | "critical";
export type Disease = "dengue" | "diarrhoeal" | "ili" | "malaria" | "lepto";
export type Pt = [number, number];

export const NOW = 14;
export const DAYS = 28;
export const MAP_W = 1000;
export const MAP_H = 640;

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bandOf(risk: number): RiskBand {
  if (risk < 25) return "low";
  if (risk < 50) return "watch";
  if (risk < 75) return "elevated";
  return "critical";
}

export interface Ward {
  id: string;
  name: string;
  nameHi: string;
  population: number;
  children_u5: number;
  pregnant: number;
  elderly: number;
  elevation_m: number;
  dist_to_phc_km: number;
  polygon: Pt[];
  centroid: Pt;
  lastAshaVisitDaysAgo: number;
  signal: "good" | "weak" | "dead";
}

function poly(c: Pt, r: number, seed: number): Pt[] {
  const rng = mulberry32(seed);
  return Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const rr = r * (0.78 + rng() * 0.35);
    return [Math.round(c[0] + Math.cos(a) * rr * 1.25), Math.round(c[1] + Math.sin(a) * rr * 0.8)] as Pt;
  });
}

const W = (
  id: string, name: string, nameHi: string, centroid: Pt, population: number,
  elevation_m: number, dist: number, visit: number, signal: Ward["signal"], seed: number,
): Ward => ({
  id, name, nameHi, centroid, population,
  children_u5: Math.round(population * 0.11),
  pregnant: Math.round(population * 0.025),
  elderly: Math.round(population * (id === "malai" ? 0.16 : 0.1)),
  elevation_m, dist_to_phc_km: dist, lastAshaVisitDaysAgo: visit, signal,
  polygon: poly(centroid, 95, seed),
});

export const WARDS: Ward[] = [
  W("melur", "Melur", "मेलूर", [300, 175], 210, 640, 3.4, 3, "good", 11),
  W("keezhur", "Keezhur", "कीऴूर", [560, 150], 190, 655, 3.9, 4, "good", 12),
  W("malai", "Malai Adivaram", "मलै अडिवारम", [815, 175], 150, 780, 6.1, 6, "dead", 13),
  W("odai", "Odai Nagar", "ओडै नगर", [480, 345], 240, 590, 1.9, 5, "good", 14),
  W("pudhu", "Pudhu Colony", "पुदु कॉलोनी", [720, 400], 230, 600, 3.2, 9, "weak", 15),
  W("kovil", "Kovil Street", "कोविल स्ट्रीट", [245, 430], 180, 575, 1.6, 2, "good", 16),
];
export const wardById = (id: string) => WARDS.find((w) => w.id === id)!;

export type EntityKind = "phc" | "subcentre" | "anganwadi" | "school" | "market" | "temple" | "hall" | "gateway";
export interface Place { id: string; kind: EntityKind; name: string; pos: Pt; wardId: string }
export const PLACES: Place[] = [
  { id: "phc", kind: "phc", name: "Kelamangalam PHC", pos: [380, 535], wardId: "kovil" },
  { id: "subcentre", kind: "subcentre", name: "Pudhu Sub-centre", pos: [650, 300], wardId: "pudhu" },
  { id: "aw1", kind: "anganwadi", name: "Anganwadi – Odai", pos: [520, 405], wardId: "odai" },
  { id: "aw2", kind: "anganwadi", name: "Anganwadi – Kovil", pos: [290, 385], wardId: "kovil" },
  { id: "school", kind: "school", name: "Govt. Primary School", pos: [365, 250], wardId: "melur" },
  { id: "market", kind: "market", name: "Weekly Market", pos: [430, 470], wardId: "odai" },
  { id: "temple", kind: "temple", name: "Mariamman Temple", pos: [190, 480], wardId: "kovil" },
  { id: "hall", kind: "hall", name: "Community Hall", pos: [610, 395], wardId: "pudhu" },
];

export interface WaterSource {
  id: string; type: "pond" | "well" | "handpump" | "tank"; name: string; wardId: string;
  position: Pt; chlorine_ppm: number; turbidity_ntu: number; householdsServed: number; lastTestedDay: number;
}
export const WATER: WaterSource[] = [
  { id: "pond", type: "pond", name: "Odai Pond", wardId: "odai", position: [520, 300], chlorine_ppm: 0, turbidity_ntu: 14, householdsServed: 22, lastTestedDay: 9 },
  { id: "well1", type: "well", name: "Keezhur Open Well", wardId: "keezhur", position: [585, 195], chlorine_ppm: 0.05, turbidity_ntu: 8, householdsServed: 41, lastTestedDay: 11 },
  { id: "well2", type: "well", name: "Melur Open Well", wardId: "melur", position: [255, 215], chlorine_ppm: 0.4, turbidity_ntu: 3, householdsServed: 36, lastTestedDay: 8 },
  { id: "hp1", type: "handpump", name: "Kovil Handpump", wardId: "kovil", position: [215, 415], chlorine_ppm: 0.5, turbidity_ntu: 1, householdsServed: 28, lastTestedDay: 10 },
  { id: "hp2", type: "handpump", name: "Pudhu Handpump", wardId: "pudhu", position: [770, 355], chlorine_ppm: 0.3, turbidity_ntu: 2, householdsServed: 30, lastTestedDay: 7 },
  { id: "tank", type: "tank", name: "Village Tank", wardId: "pudhu", position: [655, 475], chlorine_ppm: 0.2, turbidity_ntu: 5, householdsServed: 64, lastTestedDay: 6 },
];

export function waterStatus(w: WaterSource, day: number, disease: Disease): RiskBand {
  if (w.id === "well1") return day >= 11 ? "elevated" : "watch";
  if (w.id === "pond") return day >= 6 ? (disease === "diarrhoeal" && day >= 14 ? "critical" : "elevated") : "watch";
  if (w.id === "tank") return day >= 7 ? "watch" : "low";
  return "low";
}

export const BREEDING: { id: string; pos: Pt; wardId: string }[] = [
  { id: "bh1", pos: [505, 330], wardId: "odai" },
  { id: "bh2", pos: [445, 385], wardId: "odai" },
  { id: "bh3", pos: [695, 435], wardId: "pudhu" },
  { id: "bh4", pos: [745, 380], wardId: "pudhu" },
  { id: "bh5", pos: [225, 450], wardId: "kovil" },
];

export interface Cluster { id: string; wardId: string; pos: Pt; households: number; visitDaysAgo: number; feverTags: number }
export const CLUSTERS: Cluster[] = (() => {
  const rng = mulberry32(42);
  const out: Cluster[] = [];
  WARDS.forEach((w) => {
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2;
      const r = 25 + rng() * 70;
      out.push({
        id: `${w.id}-c${i + 1}`, wardId: w.id,
        pos: [Math.round(w.centroid[0] + Math.cos(a) * r * 1.2), Math.round(w.centroid[1] + Math.sin(a) * r * 0.75)],
        households: 4 + Math.floor(rng() * 2),
        visitDaysAgo: Math.max(1, Math.round(w.lastAshaVisitDaysAgo + (rng() - 0.5) * 5)),
        feverTags: Math.floor(rng() * 3),
      });
    }
  });
  return out;
})();

export interface Asha { id: string; name: string; route: Pt[]; visitsToday: number; flagged: { red: number; yellow: number }; deadZones: string[] }
export const ASHAS: Asha[] = [
  { id: "asha1", name: "Lakshmi R.", route: [[650, 300], [720, 400], [790, 330], [815, 200], [720, 260], [650, 300]], visitsToday: 7, flagged: { red: 0, yellow: 2 }, deadZones: ["Malai ridge", "Pudhu east pocket"] },
  { id: "asha2", name: "Meena S.", route: [[380, 535], [480, 345], [540, 300], [430, 400], [380, 535]], visitsToday: 9, flagged: { red: 1, yellow: 3 }, deadZones: [] },
  { id: "asha3", name: "Saroja K.", route: [[245, 430], [300, 175], [560, 150], [365, 250], [245, 430]], visitsToday: 6, flagged: { red: 0, yellow: 1 }, deadZones: [] },
];

export const GATEWAY: Pt = [380, 515];
export const DEAD_ZONES: Pt[][] = [
  [[740, 90], [930, 80], [960, 230], [860, 280], [760, 240]],
  [[780, 420], [860, 400], [880, 470], [800, 500]],
];

/* ---------- Storyline ---------- */
export interface Profile {
  peak: number; peakDay: number; sigma: number; base: number;
  weights: Record<string, number>; hotspots: Pt[]; threshold: number;
}
export const PROFILES: Record<Disease, Profile> = {
  lepto: { peak: 32, peakDay: 19, sigma: 2.8, base: 2, threshold: 9, hotspots: [[520, 300], [655, 475]], weights: { odai: 0.4, pudhu: 0.25, keezhur: 0.15, melur: 0.08, kovil: 0.07, malai: 0.05 } },
  dengue: { peak: 62, peakDay: 20, sigma: 3, base: 3, threshold: 15, hotspots: BREEDING.map((b) => b.pos),
    weights: { odai: 0.35, pudhu: 0.28, melur: 0.1, keezhur: 0.1, kovil: 0.12, malai: 0.05 } },
  diarrhoeal: { peak: 38, peakDay: 19, sigma: 2.6, base: 2, threshold: 10, hotspots: [[585, 195], [520, 300], [655, 475]],
    weights: { keezhur: 0.32, odai: 0.26, pudhu: 0.18, melur: 0.1, kovil: 0.09, malai: 0.05 } },
  ili: { peak: 46, peakDay: 18, sigma: 3.2, base: 4, threshold: 14, hotspots: [[365, 250], [520, 405], [290, 385]],
    weights: { melur: 0.3, kovil: 0.22, odai: 0.22, keezhur: 0.12, pudhu: 0.09, malai: 0.05 } },
  malaria: { peak: 24, peakDay: 22, sigma: 3.4, base: 1, threshold: 7, hotspots: [[840, 150], [780, 230], [745, 380]],
    weights: { malai: 0.42, pudhu: 0.24, keezhur: 0.14, odai: 0.1, melur: 0.05, kovil: 0.05 } },
};

export const RAIN: number[] = Array.from({ length: DAYS + 1 }, (_, d) =>
  d === 6 ? 118 : d === 5 ? 34 : d === 7 ? 52 : d === 8 ? 18 : d === 17 ? 40 : d === 18 ? 22 : d > 8 ? 4 : 2,
);
export const rainAt = (d: number) => RAIN[Math.max(0, Math.min(DAYS, Math.round(d)))] ?? 0;

const NOISE = (() => {
  const rng = mulberry32(7);
  return Array.from({ length: DAYS + 1 }, () => 0.85 + rng() * 0.3);
})();

export const vulnerableTotal = (w: Ward) => w.children_u5 + w.pregnant + w.elderly;
