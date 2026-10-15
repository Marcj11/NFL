export type EspnQB={name:string;espn_id:string|null;rank:number|null};
type R=Record<string,unknown>;
const object=(v:unknown):R|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as R:null;
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const isQB=(name:string)=>/(^|[^a-z])qb([^a-z]|$)|quarterback/i.test(name);
const str=(v:unknown)=>typeof v==='string'?v:'';
export function extractEspnQBs(payload:unknown):{qbs:EspnQB[];diagnostic:{chart_count:number;qb_candidates:number;top_level_keys:string[]}}{
 const root=object(payload)||{};
 const raw=root.depthCharts??root.depthcharts??root.depthchart??root.items??[];
 const charts=Array.isArray(raw)?raw:object(raw)?[raw]:[];
 const found:EspnQB[]=[];let candidates=0;
 const add=(entry:unknown,index:number)=>{
  const e=object(entry);if(!e)return;
  const player=object(e.athlete)||e;
  const name=str(player.displayName)||str(player.fullName)||str(player.name);
  if(!name)return;
  candidates++;
  const rank=Number(e.rank??e.depth??index+1);
  found.push({name,espn_id:player.id!=null?String(player.id):null,rank:Number.isFinite(rank)&&rank>0?rank:null});
 };
 const walk=(v:unknown,depth:number,context='')=>{
  if(depth>7||v==null)return;
  if(Array.isArray(v)){v.forEach((x,i)=>{if(isQB(context))add(x,i);else walk(x,depth+1,context)});return}
  const o=object(v);if(!o)return;
  const pos=object(o.position)||{};
  const label=[context,str(o.abbreviation),str(o.name),str(o.positionName),str(pos.abbreviation),str(pos.name)].join(' ');
  if(isQB(label)){
   for(const field of ['athletes','players','entries','items'])for(const [i,x] of arr(o[field]).entries())add(x,i);
  }
  for(const [k,x] of Object.entries(o)){
   if(['athlete','statistics','stats','headshot','links','logos','team'].includes(k))continue;
   if(typeof x==='object')walk(x,depth+1,k==='positions'?context:k);
  }
 };
 for(const c of charts)walk(c,0);
 const unique=new Map<string,EspnQB>();
 for(const qb of found){const key=qb.espn_id||qb.name.toLowerCase();const prev=unique.get(key);if(!prev||(qb.rank??99)<(prev.rank??99))unique.set(key,qb)}
 const qbs=[...unique.values()].sort((a,b)=>(a.rank??99)-(b.rank??99));
 return {qbs,diagnostic:{chart_count:charts.length,qb_candidates:candidates,top_level_keys:Object.keys(root).slice(0,12)}};
}

export function extractEspnRosterQBs(payload:unknown):EspnQB[]{
 const root=object(payload)||{},groups=arr(root.athletes);
 const qbs:EspnQB[]=[];
 for(const group of groups){
  const g=object(group)||{},position=object(g.position)||{};
  const label=[str(g.position),str(g.name),str(position.abbreviation),str(position.name)].join(' ');
  if(!isQB(label))continue;
  for(const x of arr(g.items)){
   const e=object(x)||{},player=object(e.athlete)||e;
   const name=str(player.displayName)||str(player.fullName)||str(player.name);
   if(name)qbs.push({name,espn_id:player.id!=null?String(player.id):null,rank:null});
  }
 }
 return [...new Map(qbs.map(x=>[x.espn_id||x.name.toLowerCase(),x])).values()];
}
