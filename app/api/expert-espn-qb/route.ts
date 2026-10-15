import {extractEspnQBs,extractEspnRosterQBs} from '../../../lib/expert-nfl/espn-qb-parser';
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
  const parsed=extractEspnQBs(data);
  let {qbs}=parsed;
  const {diagnostic}=parsed;
  let source_kind='depth_chart';
  if(!qbs.length){
   const roster=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/roster',{cache:'no-store',signal:AbortSignal.timeout(7000)}).catch(()=>null);
   if(roster?.ok){qbs=extractEspnRosterQBs(await roster.json());source_kind='roster_only';}
  }
  return NextResponse.json({team,source:'ESPN depth chart',source_url:url,observed_at:new Date().toISOString(),qbs,source_kind,diagnostic,status:qbs.length?(source_kind==='depth_chart'?'depth_chart_available':'roster_qbs_only'):'no_qb_listed',verified_game_starter:false,warning:'ESPN depth chart provides projected ranking, not an official confirmed game starter or historical pregame timestamp.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'espn_timeout',team},{status:502})}
}
