import {NextResponse} from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.json({error:'not_configured'}, {status:503});
  const query = new URLSearchParams({
    select:'report_id,cycle_id,generated_at,model_version,payload_json',
    report_id:'eq.d7636e7a-855a-43a9-94e6-5aa78178fe52',
    limit:'1'
  });
  try {
    const response=await fetch(base+'/rest/v1/expert_reports?'+query.toString(),{
      headers:{apikey:key,Authorization:'Bearer '+key},
      cache:'no-store',
      signal:AbortSignal.timeout(10000),
    });
    if(!response.ok) return NextResponse.json({error:'supabase_read_failed',status:response.status},{status:502});
    const rows=await response.json();
    const item=Array.isArray(rows)?rows[0]:null;
    if(!item)return NextResponse.json({source:'supabase',report:null},{headers:{'Cache-Control':'no-store'}});
    const {payload_json,...report}=item;
    return NextResponse.json({source:'supabase',report,payload_present:payload_json!=null,games_count:Array.isArray(payload_json?.rows)?payload_json.rows.length:0},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'supabase_unreachable'},{status:502});}
}
