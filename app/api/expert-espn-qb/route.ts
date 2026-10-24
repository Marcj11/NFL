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
  const depth=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)}).catch(()=>null);
  const depthStatus=depth?.status||null;
  const data=depth?.ok?await depth.json().catch(()=>null):null;
  const parsed=extractEspnQBs(data);
  let {qbs}=parsed;
  const {diagnostic}=parsed;
  let source_kind='depth_chart';
  let rosterStatus:number|null=null;
  if(!qbs.length){
   const roster=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/roster',{cache:'no-store',signal:AbortSignal.timeout(7000)}).catch(()=>null);
   rosterStatus=roster?.status||null;
   if(roster?.ok){
    qbs=extractEspnRosterQBs(await roster.json().catch(()=>null));
    source_kind='roster_only';
   }
  }
  return NextResponse.json({team,source:source_kind==='depth_chart'?'ESPN depth chart':'ESPN team roster',source_url:url,observed_at:new Date().toISOString(),qbs,source_kind,diagnostic,depth_http_status:depthStatus,roster_http_status:rosterStatus,status:qbs.length?(source_kind==='depth_chart'?'depth_chart_available':'roster_qbs_only'):'no_qb_listed',verified_game_starter:false,warning:'Roster membership or depth chart ranking never confirms a game starter. ESPN data is observed now, not a historical pregame snapshot.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'espn_timeout',team},{status:502})}
}
