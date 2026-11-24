import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, ArcLayer, PathLayer } from '@deck.gl/layers';
import { RotateCcw, Orbit, Mountain, Map, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTwin } from '@/store/twinStore';
import { CENTER, hexRisk, type Geography, type Hex } from '@/lib/geo';
import { reduction } from '@/lib/sim';
import type { StyleSpecification } from 'maplibre-gl';
import { centroid } from '@turf/turf';

export function MapCanvas({ geo }: { geo: Geography }) {
  const host=useRef<HTMLDivElement>(null), map=useRef<maplibregl.Map|null>(null), overlay=useRef<MapboxOverlay|null>(null);
  const [orbit,setOrbit]=useState(false); const state=useTwin(); const [ready,setReady]=useState(false);
  const markers=useRef<{element:HTMLElement;en:string;kn:string;unverified:boolean}[]>([]);
  useEffect(()=> { if(!host.current)return; const css=getComputedStyle(document.documentElement); const color=(n:string)=>css.getPropertyValue(n).trim();
    const style:StyleSpecification={version:8,sources:Object.fromEntries(['buildings','roads','water','landuse'].map(k=>[k,{type:'geojson',data:geo[k as 'buildings']} ])),layers:[
      {id:'land',type:'background',paint:{'background-color':color('--map-land')}},
      {id:'landuse',type:'fill',source:'landuse',paint:{'fill-color':['match',['get','landuse'],'forest',color('--map-forest'),'farmland',color('--map-paddy'),color('--map-residential')],'fill-opacity':0.8}},
      {id:'water',type:'fill',source:'water',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':color('--map-water')}},
      {id:'streams',type:'line',source:'water',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':color('--map-water-edge'),'line-width':3}},
      {id:'road-edge',type:'line',source:'roads',paint:{'line-color':color('--map-road-edge'),'line-width':['match',['get','highway'],'trunk',9,'primary',7,3]}},
      {id:'roads',type:'line',source:'roads',paint:{'line-color':color('--map-road'),'line-width':['match',['get','highway'],'trunk',7,'primary',5,2]}},
      {id:'building-shadow',type:'fill',source:'buildings',paint:{'fill-color':color('--map-shadow'),'fill-opacity':0.15}},
       {id:'buildings',type:'fill-extrusion',source:'buildings',paint:{'fill-extrusion-color':color('--map-house'),'fill-extrusion-height':['get','renderHeight'],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},
    ],sky:{'sky-color':color('--map-light'),'horizon-color':color('--map-water'),'fog-color':color('--map-light'),'sky-horizon-blend':0.5,'horizon-fog-blend':0.7,'fog-ground-blend':0.08},light:{anchor:'viewport',color:color('--map-light'),intensity:0.38,position:[1.5,210,35]}};
    maplibregl.setWorkerUrl(mapWorkerUrl);
    const m=new maplibregl.Map({container:host.current,style,center:CENTER,zoom:13.6,pitch:30,bearing:-22,attributionControl:false,maxPitch:75}); map.current=m;
    const o=new MapboxOverlay({interleaved:false,layers:[]}); overlay.current=o; m.addControl(o);
    m.on('load',()=>{setReady(true);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;m.fitBounds(geo.bounds,{padding:80,duration:0});m.flyTo({center:CENTER,zoom:14.6,pitch:58,bearing:-22,duration:reduced?0:5000});
      for(const f of [...geo.places.features,...geo.water.features.filter(f=>f.properties?.['name']),...(geo.facility?[geo.facility]:[])]) { const position=f.geometry.type==='Point'?f.geometry.coordinates as [number,number]:centroid(f).geometry.coordinates as [number,number]; const el=document.createElement('span');el.className='map-place-label';const en=String(f.properties?.['name']??'');const ta=String(f.properties?.['name:ta']??en);el.textContent=en+(f===geo.facility?' · unverified':'');markers.current.push({element:el,en,kn:ta,unverified:f===geo.facility});new maplibregl.Marker({element:el}).setLngLat(position).addTo(m); }
    }); m.on('dragstart',()=>setOrbit(false));m.on('rotatestart',()=>setOrbit(false));
    return ()=> {o.finalize();m.remove();map.current=null;markers.current=[];};
  },[geo]);
  useEffect(()=> { if(!ready||!overlay.current)return; const {day,disease,layers,interventions,selected,highlight}=state; const R=reduction(disease,interventions); const css=getComputedStyle(document.documentElement);
    const rgb=(token:string,alpha=185):[number,number,number,number]=>{const v=css.getPropertyValue(token).trim().replace('#','');return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16),alpha];};
    const band=(h:Hex)=> {const r=hexRisk(h,disease,day,R);return rgb(r<25?'--risk-low':r<50?'--risk-watch':r<75?'--risk-elevated':'--risk-critical',highlight.includes(h.id)||selected?.id===h.id?225:115);};
    const pick=(info:{object?:Hex})=> {if(!info.object)return;state.set({selected:{kind:'hex',id:info.object.id}});map.current?.flyTo({center:info.object.position,zoom:15.7,duration:900});};
    const rendered=[];
    if(layers.includes('risk'))rendered.push(new H3HexagonLayer<Hex>({id:'risk',data:geo.hexes,pickable:true,extruded:true,getHexagon:h=>h.id,getElevation:h=>hexRisk(h,disease,day,R)*0.9,getFillColor:band,getLineColor:rgb('--map-light',180),lineWidthMinPixels:0.7,coverage:0.55,opacity:0.65,onClick:pick,transitions:{getElevation:450,getFillColor:450},updateTriggers:{getElevation:[day,disease,R],getFillColor:[day,disease,R,highlight,selected]}}));
    for(const l of ['cases','vector','vulnerability','asha','connectivity'] as const)if(layers.includes(l))rendered.push(new ScatterplotLayer<Hex>({id:l,data:geo.hexes,getPosition:h=>[...h.position, l==='cases'?180:3],getRadius:h=>l==='cases'?6+hexRisk(h,disease,day,R)/5:l==='vector'?40*Math.exp(-h.waterDistance*3):80,getFillColor:h=>l==='connectivity'?rgb('--brand-blue',h.staleness>7?150:35):l==='asha'?rgb('--saffron',h.staleness*15):band(h),radiusMinPixels:l==='cases'?3:1,pickable:true,onClick:pick,updateTriggers:{getRadius:[day,disease,R],getFillColor:[day,disease,R]}}));
    if(layers.includes('water'))rendered.push(new ScatterplotLayer<Hex>({id:'flood-buffer',data:geo.hexes.filter(h=>h.waterDistance<0.5),getPosition:h=>h.position,getRadius:day>=6?120:60,getFillColor:rgb('--brand-blue',45),stroked:true,getLineColor:rgb('--brand-blue',100),lineWidthMinPixels:1,updateTriggers:{getRadius:[day]}}));
    if(layers.includes('asha')||layers.includes('connectivity'))rendered.push(new PathLayer({id:'asha-road',data:[geo.route],getPath:p=>p,getColor:rgb('--brand-blue',235),getWidth:4,widthMinPixels:3}));
    if(layers.includes('mobility')||state.loraNonce>0){const destination=geo.facility?centroid(geo.facility).geometry.coordinates as [number,number]:CENTER;rendered.push(new ArcLayer({id:'relay',data:geo.zones,getSourcePosition:z=>z.position,getTargetPosition:()=>destination,getSourceColor:rgb('--saffron',190),getTargetColor:rgb('--brand-blue',190),getWidth:2,greatCircle:false}));}
    overlay.current.setProps({layers:rendered,getTooltip:info=> info.object?.buildings?{text:`${state.lang==='ta'?info.object.zoneTa:info.object.zone}\n${info.object.buildings} buildings · aggregate only\nRisk ${Math.round(hexRisk(info.object,disease,day,R))}/100`}:null});
  },[state.day,state.disease,state.layers,state.interventions,state.selected,state.highlight,state.loraNonce,ready,geo]);
  useEffect(()=>{for(const marker of markers.current){const text=state.lang==='ta'?marker.kn:marker.en;marker.element.textContent=text+(marker.unverified?(state.lang==='ta'?' · சரிபார்க்கப்படவில்லை':' · unverified'):'');}},[state.lang,ready]);
  useEffect(()=>{if(!state.fly||!map.current)return;map.current.flyTo({center:[state.fly.x,state.fly.y],zoom:15.5,pitch:58,duration:1000});},[state.fly]);
  useEffect(()=>{if(!orbit||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>{const m=map.current;if(m&&!m.isMoving())m.setBearing(m.getBearing()+0.12);},200);return()=>clearInterval(timer);},[orbit]);
  const camera=(pitch:number)=>map.current?.easeTo({pitch,duration:650});
  return <><div ref={host} className="absolute inset-0" aria-label="Real Coimbatore 3D map"/><div className="twin-camera glass"><Button variant="ghost" size="icon" title="Reset view" aria-label="Reset view" onClick={()=>map.current?.flyTo({center:CENTER,zoom:14.6,pitch:58,bearing:-22})}><RotateCcw/></Button><Button variant="ghost" size="icon" title="Top-down 2D" aria-label="Top-down 2D" onClick={()=>camera(0)}><Map/></Button><Button variant="ghost" size="icon" title="3D tilt" aria-label="3D tilt" onClick={()=>camera(58)}><Mountain/></Button><Button variant={orbit?'default':'ghost'} size="icon" title="Orbit" aria-label="Orbit" aria-pressed={orbit} onClick={()=>setOrbit(!orbit)}><Orbit/></Button><Button variant="ghost" size="icon" aria-label="Zoom in" onClick={()=>map.current?.zoomIn()}><Plus/></Button><Button variant="ghost" size="icon" aria-label="Zoom out" onClick={()=>map.current?.zoomOut()}><Minus/></Button></div></>;
}