import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildingHeight, CENTER } from '@/lib/geo';
import type { Feature, FeatureCollection } from 'geojson';

const load = (name: string): FeatureCollection =>
  JSON.parse(readFileSync(`public/data/coimbatore/${name}.geojson`, 'utf8'));

function boundsOf(collection: FeatureCollection): [number, number, number, number] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [x, y] = coords as [number, number];
      box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
      return;
    }
    for (const c of coords as unknown[]) walk(c);
  };
  for (const f of collection.features) {
    if (f.geometry.type === 'GeometryCollection') f.geometry.geometries.forEach(g => 'coordinates' in g && walk(g.coordinates));
    else walk(f.geometry.coordinates);
  }
  return box;
}

describe('Bundled Coimbatore OpenStreetMap export', () => {
  it('ships real buildings, roads and water', () => {
    expect(load('buildings').features.length).toBe(23405);
    expect(load('roads').features.length).toBe(2808);
    expect(load('water').features.length).toBe(17);
  });
  it('covers Gandhipuram centre (76.9677744, 11.0182714)', () => {
    expect(CENTER).toEqual([76.9677744, 11.0182714]);
    const [w, s, e, n] = boundsOf(load('buildings'));
    expect(w).toBeLessThan(CENTER[0]); expect(e).toBeGreaterThan(CENTER[0]);
    expect(s).toBeLessThan(CENTER[1]); expect(n).toBeGreaterThan(CENTER[1]);
  });
  it('carries no health, case or risk attributes on any building', () => {
    const banned = /case|risk|disease|health|patient|fever/i;
    for (const f of load('buildings').features) {
      for (const key of Object.keys(f.properties ?? {})) expect(key).not.toMatch(banned);
    }
  });
  it('uses real Coimbatore place and water names from OSM', () => {
    expect(load('places').features.some(f => f.properties?.['name'] === 'Gandhipuram' && f.properties?.['name:ta'] === 'காந்திபுரம்')).toBe(true);
    expect(load('water').features.some(f => f.properties?.['name'] === 'Kumaraswamy Lake')).toBe(true);
  });
  it('never invents a referral facility', () => {
    expect(load('pois').features.some(f => f.properties?.['name'] === 'Coimbatore Medical College Hospital' && f.properties?.['amenity'] === 'hospital')).toBe(true);
  });
});

describe('Building heights from the bundled export', () => {
  const feature = (properties: Record<string, unknown>, id: string): Feature => ({
    type: 'Feature', id, properties,
    geometry: { type: 'Polygon', coordinates: [[[76.968, 11.018], [76.969, 11.018], [76.969, 11.019], [76.968, 11.018]]] },
  });
  it('uses building levels times 3.2 metres before the height tag', () => {
    expect(buildingHeight(feature({ 'building:levels': '3', height: '15' }, 'way/1'))).toBeCloseTo(9.6);
  });
  it('uses the height tag when levels are absent', () => {
    expect(buildingHeight(feature({ height: '12.5 m' }, 'way/2'))).toBe(12.5);
  });
  it('falls back to a deterministic 4-8 m estimate seeded from the feature id', () => {
    const heights = Array.from({ length: 50 }, (_, i) => buildingHeight(feature({}, `way/${i}`)));
    expect(heights.every(h => h >= 4 && h <= 8)).toBe(true);
    expect(heights).toEqual(Array.from({ length: 50 }, (_, i) => buildingHeight(feature({}, `way/${i}`))));
  });
});
