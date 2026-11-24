import { create } from "zustand";
import type { Disease, Pt } from "@/data/twin";
import { NO_INTERVENTIONS, type Interventions } from "@/lib/sim";
import type { Lang } from "@/lib/i18n";

export type LayerId = "risk" | "cases" | "water" | "vector" | "connectivity" | "vulnerability" | "mobility" | "asha";
export type Selection =
   | { kind: "ward" | "cluster" | "water" | "place" | "asha" | "alert" | "hex"; id: string }
  | null;

interface TwinState {
  day: number; isPlaying: boolean; speed: number; disease: Disease;
  layers: LayerId[]; selected: Selection; interventions: Interventions;
  presenter: boolean; lang: Lang; theme: "dark" | "light";
  highlight: string[]; fly: { x: number; y: number; k: number; n: number } | null;
  loraNonce: number; tourStep: number | null; whyOpen: boolean; simOpen: boolean;
  intro: boolean; caption: string | null; acked: Record<string, "acknowledged" | "escalated" | "assigned">;
  set: (p: Partial<TwinState>) => void;
  toggleLayer: (l: LayerId) => void;
  flyTo: (p: Pt, k?: number) => void;
  setIv: (p: Partial<Interventions>) => void;
}

export const useTwin = create<TwinState>((set, get) => ({
  day: 8, isPlaying: false, speed: 1, disease: "dengue",
  layers: ["risk"], selected: null, interventions: NO_INTERVENTIONS,
  presenter: false, lang: "en", theme: "light",
  highlight: [], fly: null, loraNonce: 0, tourStep: null, whyOpen: false, simOpen: false,
  intro: true, caption: null, acked: {},
  set: (p) => set(p),
  toggleLayer: (l) => {
    const cur = get().layers;
    set({ layers: cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l] });
  },
  flyTo: (p, k = 1.8) => set({ fly: { x: p[0], y: p[1], k, n: Date.now() } }),
  setIv: (p) => set({ interventions: { ...get().interventions, ...p } }),
}));
