import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const team=new URL(req.url).searchParams.get('team')?.toLowerCase()||'';
 if(!/^[a-z]{2,3}$/.test(team))return NextResponse.json({error:'invalid_team'},{status:400});
 const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+encodeURIComponent(team)+'/depthcharts';
 try{
  const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)return NextResponse.json({status:'espn_unavailable',team},{status:502});
  const data=await r.json();
  const charts=Array.isArray(data.depthCharts)?data.depthCharts:[];
  const entries=charts.flatMap((c:{positions?:Record<string,{athletes?:Array<{rank?:number;athlete?:{id?:string;displayName?:string}}>} >})=>Object.entries(c.positions||{}).filter(([k,v])=>k.toLowerCase().includes('quarterback')||k.toLowerCase()==='qb').flatMap(([,v])=>v.athletes||[]));
  const qbs=entries.filter((e:{athlete?:{displayName?:string}})=>!!e.athlete?.displayName).map((e:{rank?:number;athlete?:{id?:string;displayName?:string}})=>({rank:e.rank??null,espn_id:e.athlete?.id,name:e.athlete?.displayName})).sort((a:{rank:number|null},b:{rank:number|null})=>(a.rank??99)-(b.rank??99));
  return NextResponse.json({team,source:'ESPN depth chart',source_url:url,observed_at:new Date().toISOString(),qbs,status:qbs.length?'depth_chart_available':'no_qb_listed',verified_game_starter:false,warning:'ESPN depth chart provides projected ranking, not an official confirmed game starter or historical pregame timestamp.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'espn_timeout',team},{status:502})}
}
