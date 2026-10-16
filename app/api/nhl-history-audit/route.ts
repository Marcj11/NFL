import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const seasons=['2023','2024','2025'] as const;
const types=['skaters','goalies','teams','lines'] as const;
type RecordCheck={season:string;type:string;status:number|null;available:boolean;bytes:number|null;error?:string};
async function probe(season:string,type:string):Promise<RecordCheck>{
 const url='https://moneypuck.com/moneypuck/playerData/seasonSummary/'+season+'/regular/'+type+'.csv';
 try{
  const response=await fetch(url,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(9000)});
  return {season,type,status:response.status,available:response.ok,bytes:Number(response.headers.get('content-length'))||null};
 }catch(error){
  return {season,type,status:null,available:false,bytes:null,error:String(error)};
 }
}
export async function GET(){
 const checks:RecordCheck[]=[];
 const targets=seasons.flatMap(season=>types.map(type=>({season,type})));
 for(let i=0;i<targets.length;i+=4){
  const results=await Promise.all(targets.slice(i,i+4).map(t=>probe(t.season,t.type)));
  checks.push(...results);
 }
 const available=checks.filter(x=>x.available).length;
 return NextResponse.json({
  status:available===checks.length?'available':available>0?'partial':'unavailable',
  source:'MoneyPuck.com',purpose:'availability_probe_only',checked_at:new Date().toISOString(),
  season_mapping:{'2023':'2023-2024','2024':'2024-2025','2025':'2025-2026'},
  total_files:checks.length,available_files:available,files:checks,
  licensing:'MoneyPuck data is free for non-commercial uses with attribution. Verify applicability before any import or commercial use.',
  attribution:'Data source: MoneyPuck.com',
  imported_rows:0,writes_to_database:false,models_executed:false,
  notes:'HEAD status and content-length only; schemas, historical data integrity and permitted use are not yet validated.'
 },{headers:{'Cache-Control':'no-store'}});
}
