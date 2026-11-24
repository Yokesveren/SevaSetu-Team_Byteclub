import { describe, expect, it } from "vitest";
import { NO_INTERVENTIONS, RECOMMENDED, summarize, villageRisk } from "@/lib/sim";

describe("dengue storyline", () => {
  it("village score is about 71 at NOW", () => {
    expect(Math.abs(villageRisk("dengue", 14) - 71)).toBeLessThan(4);
  });
  it("do-nothing peak is 60-68 cases/day around day 20", () => {
    const s = summarize("dengue", NO_INTERVENTIONS);
    expect(s.peak).toBeGreaterThanOrEqual(60);
    expect(s.peak).toBeLessThanOrEqual(68);
    expect(s.peakDay).toBe(20);
  });
  it("bed demand crosses capacity around day 18 when doing nothing", () => {
    expect(summarize("dengue", NO_INTERVENTIONS).crossDay).toBe(18);
  });
  it("recommended interventions drop peak to 30-35, shift it later and keep beds under capacity", () => {
    const s = summarize("dengue", RECOMMENDED);
    expect(s.peak).toBeGreaterThanOrEqual(28);
    expect(s.peak).toBeLessThanOrEqual(35);
    expect(s.peakDay).toBeGreaterThan(20);
    expect(s.crossDay).toBeNull();
  });
});
