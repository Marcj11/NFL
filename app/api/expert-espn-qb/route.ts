import {espnTeamId} from '../../../lib/expert-nfl/espn-team-ids';
import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const team=new URL(req.url).searchParams.get('team')?.toLowerCase()||'';
 if(!/^[a-z]{2,3}$/.test(team))return NextResponse.json({error:'invalid_team'},{status:400});
 const id=espnTeamId(team);
 if(!id)return NextResponse.json({error:'unknown_team'},{status:400});
 const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/depthcharts';
 try{
  const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)return NextResponse.json({status:'espn_unavailable',team},{status:502});
  const data=await r.json();
  type Athlete={rank?:number;athlete?:{id?:string;displayName?:string};id?:string;displayName?:string};
  const raw=data.depthCharts??data.depthcharts??data.depthchart??data.items??[];
  const charts=Array.isArray(raw)?raw:typeof raw==='object'&&raw!==null?[raw]:[];
  const qbEntries:Athlete[]=[];
  for(const chart of charts){
   const positions=chart?.positions||chart?.depthchart?.positions||{};
   for(const [key,position] of Object.entries(positions as Record<string,{athletes?:Athlete[];position?:{abbreviation?:string;name?:string}}>)){
    const label=[key,position?.position?.abbreviation,position?.position?.name].join(' ').toLowerCase();
    if(/(^|[^a-z])qb([^a-z]|$)|quarterback/.test(label))qbEntries.push(...(Array.isArray(position?.athletes)?position.athletes:[]));
   }
  }
  const qbs=qbEntries.map(e=>({rank:e.rank??null,espn_id:e.athlete?.id||e.id||null,name:e.athlete?.displayName||e.displayName||null})).filter(e=>!!e.name).sort((a,b)=>(a.rank??99)-(b.rank??99));
  const diagnostic={top_level_keys:Object.keys(data||{}).slice(0,12),chart_count:charts.length,qb_candidate_count:qbEntries.length,parsed_qb_count:qbs.length};
  return NextResponse.json({team,source:'ESPN depth chart',source_url:url,observed_at:new Date().toISOString(),qbs,diagnostic,status:qbs.length?'depth_chart_available':'no_qb_listed',verified_game_starter:false,warning:'ESPN depth chart provides projected ranking, not an official confirmed game starter or historical pregame timestamp.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'espn_timeout',team},{status:502})}
}
