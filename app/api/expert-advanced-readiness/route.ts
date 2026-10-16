import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({ready:false,reason:'database_not_configured'},{status:503});
 const h={apikey:key,Authorization:'Bearer '+key};
 try{
  const r=await fetch(base+'/rest/v1/nfl_studio_pregame_qb_sources_v1?select=game_id,team_id,qb_name,usable_pregame,source_published_at&limit=10',{headers:h,cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)return NextResponse.json({ready:false,reason:'qb_source_failed'},{status:502});
  const rows=await r.json() as Array<{game_id:string;team_id:string;qb_name:string;usable_pregame:boolean}>;
  return NextResponse.json({ready:false,source:'independent_expert_nfl_research',qb_source_available:Array.isArray(rows),qb_rows:Array.isArray(rows)?rows.length:0,pregame_source_coverage_status:rows.length?'partial_sources_exist':'no_pregame_sources',historical_qbs_do_not_count_as_pregame:true,advanced_model_executed:false,verified_prediction_count:0,reason:'advanced_model_not_yet_executable'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({ready:false,reason:'source_timeout'},{status:502})}
}
