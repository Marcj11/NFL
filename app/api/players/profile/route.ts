import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const id=new URL(req.url).searchParams.get('id')||'';
 if(!/^[0-9]{1,12}$/.test(id))return NextResponse.json({status:'invalid',athlete:null,games:[]},{status:400});
 try{
  const r=await fetch('https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+id,{next:{revalidate:3600},signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw Error('espn');
  const raw=await r.json();const a=raw.athlete||raw;const athlete={id,displayName:a.displayName||a.fullName,headshot:a.headshot,team:a.team,position:a.position};
  const s=await fetch('https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+id+'/gamelog?season=2026',{next:{revalidate:900},signal:AbortSignal.timeout(9000)}).catch(()=>null);
  const x=s?.ok?await s.json():null;
  const events=x?.events||{};const stats:any[]=Array.isArray(x?.seasonTypes)?x.seasonTypes.flatMap((t:any)=>t.categories||[]):[];
  const games=stats.flatMap((category:any)=>Array.isArray(category.events)?category.events.map((ev:any)=>({date:String(events[ev.eventId]?.gameDate||''),opponent:String(events[ev.eventId]?.opponent?.abbreviation||events[ev.eventId]?.opponent||'NFL'),stats:Object.fromEntries((category.labels||[]).slice(0,8).map((k:string,i:number)=>[k,String(ev.stats?.[i]??'—')]))})):[]).slice(0,5);
  return NextResponse.json({status:'ok',athlete,games,source:'ESPN'});
 }catch{return NextResponse.json({status:'unavailable',athlete:null,games:[]})}
}
