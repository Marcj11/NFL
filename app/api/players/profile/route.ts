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
  const eventIds=Object.keys(events).filter(eventId=>/^[0-9]+$/.test(eventId)).sort((a,b)=>Date.parse(String(events[b]?.gameDate||events[b]?.date||0))-Date.parse(String(events[a]?.gameDate||events[a]?.date||0))).slice(0,5);
  await Promise.all(eventIds.map(async eventId=>{
   try{
    const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event='+eventId,{next:{revalidate:1800},signal:AbortSignal.timeout(6500)});
    if(!response.ok)return;
    const summary=await response.json();
    const event=events[eventId]||{},date=String(event.gameDate||event.date||'');
    if(!date||!Number.isFinite(Date.parse(date)))return;
    const stats:Record<string,string>={};
    for(const team of summary.boxscore?.players||[])for(const category of team.statistics||[]){
     const labels=Array.isArray(category.labels)?category.labels:[];
     for(const player of category.athletes||[]){
      if(String(player.athlete?.id||'')!==id)continue;
      labels.forEach((label:string,i:number)=>{const value=player.stats?.[i];if(value!==undefined&&value!==null&&String(value).trim()!=='')stats[String(category.displayName||category.name||'Statistiques')+' · '+label]=String(value)});
     }
    }
    const old=resolved.get(eventId);
    if(Object.keys(stats).length)resolved.set(eventId,{date,opponent:String(event.opponent?.abbreviation||event.opponent?.displayName||old?.opponent||'NFL'),stats:{...(old?.stats||{}),...stats}});
   }catch{}
  }));
  const games=[...resolved.values()].filter(game=>Object.keys(game.stats).length>0).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,5);
  return NextResponse.json({status:'ok',athlete,games,injuries,source:'ESPN',injurySource:injuries.length?'ESPN athlete injury report':'Non confirmé — ne pas inférer une blessure'});
 }catch{return NextResponse.json({status:'unavailable',athlete:null,games:[]})}
}
