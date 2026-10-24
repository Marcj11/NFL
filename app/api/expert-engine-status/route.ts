import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'blocked',production_ready:false,reason:'supabase_server_configuration_missing',engines:[{name:'EXPERT NFL Recherche',version:'1.6.2',runtime_connected:false},{name:'EXPERT NFL Player Props',version:'1.0.9',runtime_connected:false}]},{status:503});
 const h={apikey:key,Authorization:'Bearer '+key};
 let qbCount:number|null=null,sourceCheck:'available'|'unavailable'='unavailable';
 try{
  const url=base+'/rest/v1/nfl_studio_pregame_qb_sources_v1?select=game_id,team_id&usable_pregame=eq.true&limit=1';
  const r=await fetch(url,{headers:h,cache:'no-store',signal:AbortSignal.timeout(7500)});
  if(r.ok){const data=await r.json() as unknown;qbCount=Array.isArray(data)?data.length:null;sourceCheck='available';}
 }catch{}
 const blockers=[
  'independent_plugin_runtime_not_wired_to_webapp',
  'chronological_model_backtest_not_verified',
  ...(qbCount===0?['no_usable_pregame_qb_announcements']:[]),
  ...(sourceCheck==='unavailable'?['pregame_qb_data_source_unavailable']:[])
 ];
 return NextResponse.json({status:'research_only',production_ready:false,betting_recommendations_authorized:false,
 engines:[{name:'EXPERT NFL Recherche',plugin_version:'1.6.2',runtime_connected:false},{name:'EXPERT NFL Player Props',plugin_version:'1.0.9',runtime_connected:false}],
 qb_source_access:sourceCheck,at_least_one_usable_pregame_qb_source:qbCount===null?null:qbCount>0,
 blockers,observed_at:new Date().toISOString(),note:'A compiled preview does not establish model correctness. This route does not execute either plugin.'},
 {headers:{'Cache-Control':'no-store'}});
}
