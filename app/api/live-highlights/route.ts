import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const arr=(x:unknown):Record<string,any>[]=>Array.isArray(x)?x:[];
type Item={id:string;gameId:string;matchup:string;time:string;type:string;title:string;detail:string;source:string;url:string};
export async function GET(){
 try{
  const week=Math.max(1,Math.min(18,Math.floor((Date.now()-Date.UTC(2026,8,10))/604800000)+1));
  const root='https://site.api.espn.com/apis/site/v2/sports/football/nfl/';
  const r=await fetch(root+'scoreboard?dates=2026&seasontype=2&week='+week+'&limit=25',{next:{revalidate:30},signal:AbortSignal.timeout(8500)});
  if(!r.ok)throw Error('scoreboard');const data=await r.json();
  const live=arr(data.events).filter(e=>e.status?.type?.state==='in').slice(0,10);
  const lists=await Promise.all(live.map(async(e)=>{
   try{
    const id=String(e.id),url='https://www.espn.com/nfl/game/_/gameId/'+id;
    const response=await fetch(root+'summary?event='+id,{next:{revalidate:45},signal:AbortSignal.timeout(6500)});
    if(!response.ok)return [];
    const d=await response.json();const items:Item[]=[];
    const matchup=arr(e.competitions?.[0]?.competitors).map(t=>t.team?.abbreviation).filter(Boolean).join(' - ');
    const plays=[...arr(d.scoringPlays),...arr(d.drives?.current?.plays),...arr(d.drives?.previous?.plays),...arr(d.drives?.previous).flatMap(x=>arr(x.plays))];
    const ids=new Set<string>();
    for(const p of plays){
     const detail=String(p.text||p.shortText||'').trim();if(!detail)continue;
     const key=String(p.id||detail);if(ids.has(key))continue;ids.add(key);
     const injury=/\b(injur(?:y|ed)|hurt|medical|carted off|left the game|evaluated for)\b/i.test(detail);
     const td=/touchdown/i.test(detail),interception=/intercept/i.test(detail);
     const turnover=/fumble.*(recover|lost)|turnover on downs/i.test(detail);
     const sack=/\bsacked\b|\bsack\b/i.test(detail);
     if(!injury&&!td&&!interception&&!turnover&&!sack&&!bigPlay)continue;
     const type=injury?'injury':interception||turnover?'turnover':td?'touchdown':sack?'sack':bigCatch?'big_catch':'big_run';
     const title=injury?'Blessure signalée':interception?'Interception':turnover?'Fumble / revirement':td?'Touchdown':sack?'Sack du QB':bigCatch?'Longue réception · '+yards+' verges':'Longue course · '+yards+' verges';
     items.push({id:id+'-'+key,gameId:id,matchup,time:String(p.clock?.displayValue||e.status?.displayClock||''),type,title,detail:detail.slice(0,260),source:'ESPN · description du jeu',url});
    }
    return items.slice(-18);
   }catch{return []}
  }));
  const events=lists.flat().slice(0,50);
  return NextResponse.json({status:'ok',events,updatedAt:new Date().toISOString(),source:'ESPN',liveGames:live.length},{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=45'}});
 }catch{return NextResponse.json({status:'unavailable',events:[],updatedAt:new Date().toISOString()},{status:503})}
}
