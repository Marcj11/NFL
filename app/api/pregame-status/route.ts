import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const teams=new Set(['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LA','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SF','SEA','TB','TEN','WAS']);
const slug=(s:string)=>s==='LA'?'lar':s==='WAS'?'wsh':s.toLowerCase();
type Athlete={id?:string;fullName?:string;displayName?:string;headshot?:{href?:string};position?:{abbreviation?:string};injuries?:Array<{status?:string;type?:{description?:string};details?:{detail?:string;returnDate?:string}}>;status?:{type?:string;name?:string;description?:string};};
export async function GET(req:Request){
 const u=new URL(req.url);const names=(u.searchParams.get('teams')||'').split(',').map(s=>s.toUpperCase()).filter(s=>teams.has(s)).slice(0,2);
 if(!names.length)return NextResponse.json({error:'invalid_team'},{status:400});
 const fetchedAt=new Date().toISOString();
 const reports=await Promise.all(names.map(async team=>{
  const base='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+slug(team);
  const endpoints=await Promise.allSettled(['roster','injuries'].map(async suffix=>{
   const res=await fetch(base+'/'+suffix,{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error(suffix+'_'+res.status);return res.json();
  }));
  const roster=endpoints[0].status==='fulfilled'?endpoints[0].value:null;
  const injuries=endpoints[1].status==='fulfilled'?endpoints[1].value:null;
  const athletes:Athlete[]=[];
  for(const group of roster?.athletes||[]){if(Array.isArray(group.items))athletes.push(...group.items);else athletes.push(group)}
  const photos:Record<string,string>={};
  for(const a of athletes){const name=(a.fullName||a.displayName||'').trim().toLowerCase();if(name&&a.headshot?.href?.startsWith('https://'))photos[name]=a.headshot.href}
  const list:any[]=[];
  const push=(a:any)=>{
   if(!a||typeof a!=='object')return;const athlete=a.athlete||a.player||a;
   const name=String(athlete.fullName||athlete.displayName||a.displayName||'').trim();
   const status=String(a.status||a.injuryStatus||a.type?.description||a.injuries?.[0]?.status||'').trim();
   if(!name||!status)return;
   list.push({name,status,detail:String(a.details?.detail||a.injuries?.[0]?.details?.detail||a.comment||a.description||'').slice(0,220),returnDate:a.details?.returnDate||null,photo:athlete.headshot?.href||photos[name.toLowerCase()]||null,position:athlete.position?.abbreviation||null,source:'ESPN'});
  };
  const raw=injuries?.injuries||injuries?.items||injuries?.athletes||[];
  if(Array.isArray(raw))for(const a of raw){if(Array.isArray(a.items))a.items.forEach(push);else push(a)}
  for(const a of athletes)for(const i of a.injuries||[])push({...i,athlete:a});
  const filtered=[...new Map(list.map(x=>[x.name.toLowerCase(),x])).values()];
  return {team,rosterAvailable:Boolean(roster),injuryFeedAvailable:Boolean(injuries),photos,injuries:filtered,rosterCount:athletes.length,source:'ESPN (non équivalent à une liste officielle des inactifs NFL)'};
 }));
 return NextResponse.json({fetchedAt,reports,officialInactivesVerified:false,status:reports.some(x=>x.injuryFeedAvailable)?'partial_live':'roster_only',disclaimer:'Données ESPN, à distinguer des rapports officiels NFL et des inactifs annoncés avant la rencontre.'},{headers:{'Cache-Control':'no-store'}});
}
