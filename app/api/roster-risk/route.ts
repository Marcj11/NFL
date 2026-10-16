import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Risk={game_id:string;team_id:string;roster_week:number;listed_active:number;high_usage_missing:number;high_usage_snaps_at_risk:number;targets_at_risk_per_game:number;provenance_status:string};
type Player={game_id:string;team_id:string;display_name:string;position:string|null;roster_status:string|null;availability_assessment:string;prior_role:string|null;history_games:number;prior_offensive_snaps:number|null;prior_defensive_snaps:number|null;prior_targets:number|null;prior_passing_yards:number|null;prior_receiving_yards:number|null;prior_def_sacks:number|null};
export async function GET(request:Request){
 const week=Number(new URL(request.url).searchParams.get('week')||6);
 if(!Number.isInteger(week)||week<1||week>18)return NextResponse.json({error:'invalid_week'},{status:400});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'not_configured',teams:[]},{status:503});
 try{
  const headers={apikey:key,Authorization:'Bearer '+key};
  const riskParams=new URLSearchParams({select:'game_id,team_id,roster_week,listed_active,high_usage_missing,high_usage_snaps_at_risk,targets_at_risk_per_game,provenance_status',limit:'100'});
  const riskResponse=await fetch(url+'/rest/v1/nfl_studio_roster_disruption_v1?'+riskParams,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!riskResponse.ok)throw Error('db_risk');
  const risks=await riskResponse.json() as Risk[];
  const belongs=(gameId:string)=>Number(gameId.split('_')[1])===week;
  const teams=risks.filter(r=>belongs(r.game_id));
  const ids=[...new Set(teams.map(x=>x.game_id))];
  const playerBatches=await Promise.all(ids.map(async gameId=>{
   const params=new URLSearchParams({select:'game_id,team_id,display_name,position,roster_status,availability_assessment,prior_role,history_games,prior_offensive_snaps,prior_defensive_snaps,prior_targets,prior_passing_yards,prior_receiving_yards,prior_def_sacks',game_id:'eq.'+gameId,limit:'500'});
   const res=await fetch(url+'/rest/v1/nfl_studio_expected_player_impact_v1?'+params,{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw Error('db_players');
   return await res.json() as Player[];
  }));
  const playerInputs=playerBatches.flat().map(p=>({...p,officially_confirmed:false,source_type:'retrospective_roster_projection'}));
  return NextResponse.json({
   status:'unconfirmed_roster_analysis',model_inputs_ready:false,
   source:'Supabase historical roster snapshot',
   not_official_inactives:true,
   source_published_at:null,
   teams,playerInputs,
   warning:'Use these player inputs for diagnostics only until as-of kickoff and official status have been independently verified.'
  },{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'roster_analysis_unavailable',teams:[]},{status:502})}
}
