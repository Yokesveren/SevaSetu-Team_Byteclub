import type { Geography } from './geo';
import { readGeography, cacheGeography } from './geography-cache';

let pending: Promise<Geography> | null = null;

const FILES = ['buildings', 'roads', 'water', 'landuse', 'pois', 'places'] as const;

async function fetchBundled(key: string): Promise<[string, unknown]> {
  const response = await fetch(`/data/coimbatore/${key}.geojson`);
  if (!response.ok) throw new Error(`${key}.geojson failed to load (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data?.features)) throw new Error(`${key}.geojson is not valid GeoJSON`);
  if (data.features.length === 0) throw new Error(`${key}.geojson has zero features`);
  return [key, data];
}

async function downloadGeography(): Promise<Geography> {
  const cached = await readGeography();
  if (cached) return cached;
  const entries = await Promise.all(FILES.map(fetchBundled));
  const geo = await new Promise<Geography>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/geography.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = event => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.data);
    };
    worker.onerror = () => { worker.terminate(); reject(new Error('Map processing unavailable')); };
    worker.postMessage({ bundled: Object.fromEntries(entries) });
  });
  await cacheGeography(geo);
  return geo;
}

export function loadGeography(): Promise<Geography> {
  if (!pending) pending = downloadGeography().finally(() => { pending = null; });
  return pending;
}
