import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({connected:false,reason:'database_not_configured'},{status:503});
 try{
  const query=new URLSearchParams({select:'id,generated_at,model_version,week,report,source',order:'generated_at.desc',limit:'1'});
  const response=await fetch(base+'/rest/v1/expert_nfl_independent_reports?'+query,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return NextResponse.json({connected:false,reason:'database_read_failed'},{status:502});
  const rows=await response.json();
  const latest=Array.isArray(rows)?rows[0]:null;
  if(!latest)return NextResponse.json({connected:false,reason:'no_independent_model_forecasts_yet',source:'expert-nfl-research',report:null},{headers:{'Cache-Control':'no-store'}});
  const report=latest.report;
  const audit=report&&typeof report==='object'&&!Array.isArray(report)?report.audit:null;
  const required=['model_sha','features_as_of_utc','qb_starters_verified','injury_snapshot_verified','historical_backtest_id','calibration_verified','simulation_completed','odds_snapshot_utc','data_provenance_verified'];
  const missing=required.filter(k=>!audit||audit[k]===undefined||audit[k]===null||audit[k]===false||audit[k]==='');
  const predictions=Array.isArray(report?.games)?report.games:Array.isArray(report?.rows)?report.rows:[];
  const quality=predictions.length>0&&predictions.every((g:{home_probability?:unknown;away_probability?:unknown;explanation?:unknown})=>typeof g.home_probability==='number'&&typeof g.away_probability==='number'&&Number.isFinite(g.home_probability)&&Number.isFinite(g.away_probability)&&g.home_probability>=0&&g.home_probability<=1&&g.away_probability>=0&&g.away_probability<=1&&Math.abs(g.home_probability+g.away_probability-1)<0.01&&typeof g.explanation==='string'&&g.explanation.trim().length>=20);
  if(missing.length||!quality)return NextResponse.json({connected:false,reason:'independent_report_not_verified',source:latest.source,model_version:latest.model_version,missing_checks:missing,probabilities_verified:false,report:null},{headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({connected:true,source:latest.source,model_version:latest.model_version,week:latest.week,generated_at:latest.generated_at,probabilities_verified:true,report},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({connected:false,reason:'database_unavailable'},{status:502})}
}
