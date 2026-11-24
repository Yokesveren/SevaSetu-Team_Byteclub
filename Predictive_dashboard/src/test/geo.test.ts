import { describe, expect, it } from 'vitest';
import { deriveGeography, hexRisk } from '@/lib/geo';
import { NO_INTERVENTIONS, RECOMMENDED, summarize } from '@/lib/sim';
import type { FeatureCollection } from 'geojson';
const empty: FeatureCollection={type:'FeatureCollection',features:[]};
const building=(x:number)=>({type:'Feature' as const,properties:{building:'yes'},geometry:{type:'Polygon' as const,coordinates:[[[76.968+x,11.018],[76.96801+x,11.018],[76.96801+x,11.01801],[76.968+x,11.01801],[76.968+x,11.018]]]}});
describe('Coimbatore aggregate privacy',()=>{
 it('suppresses cells with fewer than five buildings',()=>{const g=deriveGeography({buildings:{type:'FeatureCollection',features:Array.from({length:4},(_,i)=>building(i*0.00001))},roads:empty,water:empty,landuse:empty,pois:empty,places:empty});expect(g.hexes).toHaveLength(0);});
 it('retains a five-building aggregate',()=>{const g=deriveGeography({buildings:{type:'FeatureCollection',features:Array.from({length:5},(_,i)=>building(i*0.00001))},roads:empty,water:empty,landuse:empty,pois:empty,places:empty});expect(g.hexes[0]?.buildings).toBe(5);});
 it('never invents a facility when none is mapped',()=>{expect(deriveGeography({buildings:empty,roads:empty,water:empty,landuse:empty,pois:empty,places:empty}).facility).toBeNull();});
});
describe('Urban disease scenarios',()=>{
 it('includes a deterministic leptospirosis forecast reduced by response planning',()=>{const before=summarize('lepto',NO_INTERVENTIONS);const after=summarize('lepto',RECOMMENDED);expect(before.peak).toBe(34);expect(after.peak).toBeLessThan(before.peak);expect(before).toEqual(summarize('lepto',NO_INTERVENTIONS));});
});