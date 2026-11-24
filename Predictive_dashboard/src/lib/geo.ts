import { centroid, distance, point, pointToLineDistance, polygonToLine, booleanPointInPolygon, bbox } from '@turf/turf';
import { latLngToCell, cellToLatLng } from 'h3-js';
import type { FeatureCollection, Feature, Point } from 'geojson';
import type { Disease } from '@/data/twin';
import { villageRisk } from './sim';

export interface Hex { id: string; position: [number, number]; buildings: number; population: number; waterDistance: number; roadDistance: number; zone: string; zoneTa: string; staleness: number; density: number }
export interface Geography { buildings: FeatureCollection; roads: FeatureCollection; water: FeatureCollection; landuse: FeatureCollection; pois: FeatureCollection; places: FeatureCollection; hexes: Hex[]; zones: { name: string; nameTa: string; position: [number, number]; buildings: number }[]; route: [number, number][]; facility: Feature | null; bounds: [number, number, number, number] }
export const CENTER: [number, number] = [76.9677744, 11.0182714];
function positive(value: unknown): number | null {
  const numeric = Number(String(value ?? '').replace(/\s*m\s*$/i, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}
export function buildingHeight(feature: Feature): number {
  const levels = positive(feature.properties?.['building:levels']);
  if (levels !== null) return levels * 3.2;
  const height = positive(feature.properties?.['height']);
  if (height !== null) return height;
  const seed = String(feature.id ?? feature.properties?.['@id'] ?? feature.properties?.['id'] ?? JSON.stringify(feature.geometry));
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return 4 + ((hash >>> 0) % 4001) / 1000;
}
export function deriveGeography(input: Omit<Geography, 'hexes' | 'zones' | 'route' | 'facility' | 'bounds'>): Geography {
  const counts = new Map<string, number>();
  for (const b of input.buildings.features) { const [lng, lat] = centroid(b).geometry.coordinates; if (lng === undefined || lat === undefined) continue; const id = latLngToCell(lat, lng, 9); counts.set(id, (counts.get(id) ?? 0) + 1); }
  const waterEdges = input.water.features.flatMap(f => { if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') { const result = polygonToLine(f as Parameters<typeof polygonToLine>[0]); const lines = result.type === 'FeatureCollection' ? result.features : [result]; return lines.flatMap(l => l.geometry.type === 'MultiLineString' ? l.geometry.coordinates.map(coordinates => ({type:'Feature' as const,properties:{},geometry:{type:'LineString' as const,coordinates}})) : [l]); } return f.geometry.type === 'LineString' ? [f] : []; });
  const positions = Array.from(counts, ([id, buildings]) => { const [lat, lng] = cellToLatLng(id); return { id, buildings, position: [lng, lat] as [number, number] }; });
  let centers = Array.from({ length: 6 }, (_, i) => positions[Math.floor(i * positions.length / 6)]?.position ?? CENTER);
  for (let round = 0; round < 12; round++) { const buckets = centers.map(() => [] as typeof positions); for (const p of positions) { const ds = centers.map(c => (c[0]-p.position[0])**2+(c[1]-p.position[1])**2); buckets[ds.indexOf(Math.min(...ds))]?.push(p); } centers = buckets.map((b,i) => b.length ? [b.reduce((s,p)=>s+p.position[0]*p.buildings,0)/b.reduce((s,p)=>s+p.buildings,0),b.reduce((s,p)=>s+p.position[1]*p.buildings,0)/b.reduce((s,p)=>s+p.buildings,0)] : centers[i] ?? CENTER); }
  const zones = centers.map((c,i) => { const nearest = input.places.features.filter(f=>f.properties?.['name']).sort((a,b)=>distance(point(c),centroid(a))-distance(point(c),centroid(b)))[0]; return { name: `${nearest?.properties?.['name'] ?? 'Coimbatore'} · ${i+1}`, nameTa: `${nearest?.properties?.['name:ta'] ?? nearest?.properties?.['name'] ?? 'கோயம்புத்தூர்'} · ${i+1}`, position: c, buildings: 0 }; });
  const hexes: Hex[] = positions.filter(p=>p.buildings>=5).map(p=> { const pt=point(p.position); const ds=centers.map(c=>distance(pt,point(c))); const z=ds.indexOf(Math.min(...ds)); if(zones[z]) zones[z].buildings+=p.buildings;
    const waterDistance = Math.min(3,...waterEdges.map(f=>pointToLineDistance(pt,f as Parameters<typeof pointToLineDistance>[1],{units:'kilometers'}))); const roadDistance=Math.min(2,...input.roads.features.filter(f=>f.geometry.type==='LineString').map(f=>pointToLineDistance(pt,f as Parameters<typeof pointToLineDistance>[1],{units:'kilometers'})));
    return {...p,population:Math.round(p.buildings*4.3),waterDistance,roadDistance,zone:zones[z]?.name ?? 'Coimbatore',zoneTa:zones[z]?.nameTa ?? 'கோயம்புத்தூர்',staleness:3+(parseInt(p.id.slice(-4),16)%8),density:Math.min(1,p.buildings/65)};
  });
  const routeFeature=input.roads.features.filter(f=>f.geometry.type==='LineString' && ['residential','tertiary','unclassified'].includes(f.properties?.['highway'])).sort((a,b)=>distance(centroid(a),point(CENTER))-distance(centroid(b),point(CENTER)))[0];
  const route=routeFeature?.geometry.type==='LineString' ? routeFeature.geometry.coordinates.map(c=>[c[0]??0,c[1]??0] as [number,number]) : [];
  const facility=input.pois.features.find(f=>f.properties?.['name']==='Coimbatore Medical College Hospital') ?? input.pois.features.find(f=>f.properties?.['amenity']==='hospital' && f.properties?.['name']) ?? null;
  return {...input,hexes,zones,route,facility,bounds:bbox(input.buildings) as [number,number,number,number]};
}
export function hexRisk(h: Hex, disease: Disease, day: number, R=0) { const water=Math.exp(-h.waterDistance*3); const weights=disease==='ili'?[0.1,0.65,0.25]:disease==='lepto'?[0.7,0.15,0.15]:disease==='malaria'?[0.55,0.15,0.3]:[0.45,0.35,0.2]; const spatial=(weights[0]??0)*water+(weights[1]??0)*h.density+(weights[2]??0)*h.staleness/10; return Math.min(98,Math.max(4,villageRisk(disease,day,R)*(0.4+spatial))); }