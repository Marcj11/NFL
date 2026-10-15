import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const arr=(x:unknown):Record<string,any>[]=>Array.isArray(x)?x:[];
export async function GET(){
 try{
  const week=Math.max(1,Math.min(18,Math.floor((Date.now()-Date.UTC(2026,8,10))/604800000)+1));
  const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week='+week+'&limit=25';
  const result=await fetch(url,{next:{revalidate:30},signal:AbortSignal.timeout(9000)});
  if(!result.ok)throw Error('scoreboard');
  const json=await result.json();
  const games=arr(json.events).map(e=>{
   const competitors=arr(e.competitions?.[0]?.competitors);
   const home=competitors.find(t=>t.homeAway==='home'),away=competitors.find(t=>t.homeAway==='away');
   return {id:String(e.id),date:e.date||'',home:{abbr:home?.team?.abbreviation||'',name:home?.team?.displayName||'',score:Number(home?.score||0)},away:{abbr:away?.team?.abbreviation||'',name:away?.team?.displayName||'',score:Number(away?.score||0)},status:e.status?.type?.description||'',state:e.status?.type?.state||'pre',clock:e.status?.displayClock||'',period:Number(e.status?.period||0),complete:Boolean(e.status?.type?.completed)};
  }).filter(g=>g.home.abbr&&g.away.abbr);
  const fetchPlayers=async(id:string)=>{
   try{
    const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event='+id,{next:{revalidate:30},signal:AbortSignal.timeout(6500)});
    if(!r.ok)return [];
    const data=await r.json(),rows:{name:string;team:string;category:string;values:Record<string,string>}[]=[];
    for(const t of arr(data.boxscore?.players))for(const group of arr(t.statistics)){
     const labels=(group.labels||[]).map((s:unknown)=>String(s).toUpperCase());
     for(const p of arr(group.athletes)){
      if(!p.athlete?.displayName)continue;
      const values:Record<string,string>={};labels.forEach((s:string,i:number)=>values[s]=String(p.stats?.[i]||'0'));
      rows.push({name:p.athlete.displayName,team:t.team?.abbreviation||'',category:String(group.name||''),values});
     }
    }
    return rows;
   }catch{return []}
  };
  const detailed=games.filter(g=>g.state==='in'||g.complete).slice(0,12);
  const data=await Promise.all(detailed.map(g=>fetchPlayers(g.id)));
  return NextResponse.json({status:'ok',games,players:Object.fromEntries(detailed.map((g,i)=>[g.id,data[i]])),updatedAt:new Date().toISOString(),source:'ESPN',week},{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=60'}});
 }catch{return NextResponse.json({status:'unavailable',games:[],players:{}} ,{status:503})}
}
