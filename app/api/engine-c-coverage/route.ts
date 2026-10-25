import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({status:'unavailable'},{status:503});
 const apiKey:string=key;
 async function count(table:string){
  const r=await fetch(url+'/rest/v1/'+table+'?select=game_id&limit=1',{headers:{apikey:apiKey,Authorization:'Bearer '+apiKey,Prefer:'count=exact'},cache:'no-store'});
  if(!r.ok)throw Error('database_read_failed');
  const n=Number((r.headers.get('content-range')||'').split('/')[1]);
  if(!Number.isSafeInteger(n))throw Error('invalid_count');return n;
 }
 try {
  const [snapshots,matched]=await Promise.all([count('engine_c_espn_injury_snapshots'),count('engine_c_espn_injury_ready_v1')]);
  return NextResponse.json({status:'ok',snapshots,matched,official_inactives_verified:false,predictions_use_injuries_verified:false},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'unavailable',reason:'database_read_failed'},{status:503})}
}
