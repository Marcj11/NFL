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
  return NextResponse.json({connected:true,source:latest.source,model_version:latest.model_version,week:latest.week,generated_at:latest.generated_at,report:latest.report},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({connected:false,reason:'database_unavailable'},{status:502})}
}
