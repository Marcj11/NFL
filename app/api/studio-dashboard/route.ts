import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const sources={
 readiness:'nfl_studio_top10_final_gate_v1',
 replacements:'nfl_studio_replacement_candidates_v1',
 values:'nfl_studio_market_value_v1',
 scorecard:'nfl_studio_prediction_scorecard_v1'
} as const;
export async function GET(request:Request){
 const week=Number(new URL(request.url).searchParams.get('week')||6);
 if(!Number.isInteger(week)||week<1||week>18)return NextResponse.json({error:'invalid_week'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 const result:Record<string,{status:'ok'|'unavailable';rows:Record<string,unknown>[]}>={};
 await Promise.all(Object.entries(sources).map(async ([name,table])=>{
  const query=new URLSearchParams({select:'*',limit:name==='replacements'?'100':'50'});
  if(name==='readiness'||name==='replacements')query.set('game_id','like.2026_'+String(week).padStart(2,'0')+'_*');
  try{
   const response=await fetch(base+'/rest/v1/'+table+'?'+query,{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('upstream_error');
   const rows=await response.json();
   result[name]={status:'ok',rows:Array.isArray(rows)?rows:[]};
  }catch{result[name]={status:'unavailable',rows:[]}}
 }));
 return NextResponse.json({week,as_of:new Date().toISOString(),experimental:true,no_live_bookmaker_lines:true,data:result},{headers:{'Cache-Control':'no-store'}});
}
