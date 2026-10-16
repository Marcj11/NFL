import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({status:'unavailable',count:0},{status:503});
 try{
  const r=await fetch(url+'/rest/v1/nfl_studio_forecast_audit?select=game_id,model_name,home_probability,result_home_win,forecast_at,kickoff_at&order=forecast_at.desc&limit=3000',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('db');
  const records=await r.json() as {model_name:string;home_probability:number;result_home_win:number|null;forecast_at:string;kickoff_at:string}[];
  const valid=records.filter(v=>(v.result_home_win===0||v.result_home_win===1)&&Number.isFinite(Number(v.home_probability))&&Number(v.home_probability)>=0&&Number(v.home_probability)<=1&&Number.isFinite(Date.parse(v.forecast_at))&&Number.isFinite(Date.parse(v.kickoff_at))&&Date.parse(v.forecast_at)<Date.parse(v.kickoff_at));
  const models=[...new Set(records.map(r=>r.model_name))].map(name=>{
   const settled=valid.filter(r=>r.model_name===name);
   const brier=settled.length?settled.reduce((s,r)=>s+Math.pow(Number(r.home_probability)-Number(r.result_home_win),2),0)/settled.length:null;
   const buckets=[0,1,2,3,4].map(i=>{const subset=settled.filter(r=>Math.min(4,Math.floor(Number(r.home_probability)*5))===i);return {range:(i*20)+'-'+((i+1)*20)+'%',n:subset.length,predicted:subset.length?subset.reduce((s,r)=>s+Number(r.home_probability),0)/subset.length:null,observed:subset.length?subset.reduce((s,r)=>s+Number(r.result_home_win),0)/subset.length:null}});
   return {name,forecastCount:records.filter(r=>r.model_name===name).length,settledCount:settled.length,brier,calibration:buckets};
  });
  return NextResponse.json({status:'ok',models,verifiedForecasts:valid.length,method:'Brier = moyenne (probabilité enregistrée avant le début du match - résultat binaire)^2',note:'Seules les prévisions pré-match horodatées avec résultats confirmés sont comptées'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'unavailable',models:[],verifiedForecasts:0},{status:503})}
}
