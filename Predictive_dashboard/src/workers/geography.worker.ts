import { deriveGeography, buildingHeight } from '@/lib/geo';
import type { Feature, FeatureCollection } from 'geojson';

self.onmessage = (event) => {
  try {
    const input = event.data.bundled;
    const buildings: FeatureCollection = {
      ...input.buildings,
      features: (input.buildings.features as Feature[]).map(f => ({
        ...f,
        properties: { ...f.properties, renderHeight: buildingHeight(f) },
      })),
    };
    self.postMessage({ data: deriveGeography({ ...input, buildings }) });
  } catch {
    self.postMessage({ error: 'Map processing failed' });
  }
};
