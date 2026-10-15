import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const id=new URL(req.url).searchParams.get('id')||'';
 if(!/^[0-9]{1,12}$/.test(id))return NextResponse.json({status:'invalid',athlete:null,games:[]},{status:400});
 try{
  const r=await fetch('https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+id,{next:{revalidate:3600},signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw Error('espn');
  const raw=await r.json();const a=raw.athlete||raw;const athlete={id,displayName:a.displayName||a.fullName,headshot:a.headshot,team:a.team,position:a.position};
  const injuryReports=Array.isArray(a.injuries)?a.injuries:[];
  const injuries=injuryReports.filter((entry:any)=>entry&&typeof entry==='object').map((entry:any)=>({status:String(entry.status||entry.type?.description||'Non précisé'),detail:String(entry.details?.detail||entry.detail||''),date:String(entry.date||entry.updatedAt||'')})).slice(0,4);
  const s=await fetch('https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+id+'/gamelog?season=2026',{next:{revalidate:900},signal:AbortSignal.timeout(9000)}).catch(()=>null);
  const x=s?.ok?await s.json():null;
  const events=x?.events||{},groups=Array.isArray(x?.seasonTypes)?x.seasonTypes:[];
  const resolved=new Map<string,{date:string;opponent:string;stats:Record<string,string>}>();
  for(const season of groups){
   for(const category of Array.isArray(season.categories)?season.categories:[]){
    const labels=Array.isArray(category.labels)?category.labels:[];
    const rows=Array.isArray(category.events)?category.events:[];
    for(const row of rows){
     const ref=String(row.eventId||row.id||'');if(!ref)continue;
     const info=events[ref]||{},date=String(info.gameDate||info.date||'');
     if(!date||!Number.isFinite(Date.parse(date)))continue;
     const previous=resolved.get(ref)||{date,opponent:String(info.opponent?.abbreviation||info.opponent?.displayName||'NFL'),stats:{}};
     const values=Array.isArray(row.stats)?row.stats:[];
     labels.forEach((label:string,i:number)=>{const value=values[i];if(value!==null&&value!==undefined&&String(value).trim()!=='')previous.stats[String(category.displayName||category.name||'')+' · '+label]=String(value)});
     resolved.set(ref,previous);
    }
   }
  }
  const games=[...resolved.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,5);
  return NextResponse.json({status:'ok',athlete,games,injuries,source:'ESPN',injurySource:injuries.length?'ESPN athlete injury report':'Non confirmé — ne pas inférer une blessure'});
 }catch{return NextResponse.json({status:'unavailable',athlete:null,games:[]})}
}
