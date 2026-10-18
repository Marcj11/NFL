import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Game={game_id:string;week:number;season:number;kickoff_utc:string;home_team_id:string;away_team_id:string;status:string;game_results:{home_score:number;away_score:number}|{home_score:number;away_score:number}[]|null};
const p=(h:number,a:number)=>1/(1+Math.pow(10,(a-h-55)/400));
export async function GET(request:Request){
 const week=Number(new URL(request.url).searchParams.get('week')||6);
 if(!Number.isInteger(week)||week<1||week>18)return NextResponse.json({error:'invalid_week'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'elo_unavailable',games:[]},{status:503});
 try{
  const q=new URLSearchParams({select:'game_id,week,season,kickoff_utc,home_team_id,away_team_id,status,game_results(home_score,away_score)',season:'gte.2022',order:'kickoff_utc.asc',limit:'10000'});
  const response=await fetch(base+'/rest/v1/games?'+q,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('games_'+response.status);
  const all=await response.json() as Game[];
  const ratings=new Map<string,number>();const output:any[]=[];let settled=0;
  for(const g of all){
   const h=ratings.get(g.home_team_id)??1500,a=ratings.get(g.away_team_id)??1500;
   const home=p(h,a),away=1-home;
   if(g.season===2026&&g.week===week)output.push({game_id:g.game_id,week:g.week,kickoff_utc:g.kickoff_utc,home_team_id:g.home_team_id,away_team_id:g.away_team_id,home_win_probability:home,away_win_probability:away,model_version:'elo-recovery-v1',approved_for_betting:false});
   const result=Array.isArray(g.game_results)?g.game_results[0]:g.game_results;
   if(result&&Number.isFinite(Number(result.home_score))&&Number.isFinite(Number(result.away_score))&&result.home_score!==null&&result.away_score!==null){
    const actual=result.home_score===result.away_score?.5:result.home_score>result.away_score?1:0;
    const change=24*(actual-home);ratings.set(g.home_team_id,h+change);ratings.set(g.away_team_id,a-change);settled++;
   }
  }
  // Capture both victory and defeat probabilities BEFORE kickoff; never overwrite snapshots.
  // The history replay is reproducible from recorded model_version and timestamp.
  const recordedAt=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString();
  const snapshots=output.filter(g=>Date.parse(g.kickoff_utc)>Date.now()).flatMap(g=>
    [{selection:g.home_team_id,probability:g.home_win_probability},{selection:g.away_team_id,probability:g.away_win_probability}].map(side=>{
      const record={model_version:'elo-recovery-v1',game_id:g.game_id,kickoff_utc:g.kickoff_utc,category:'moneyline',market:'h2h',selection:side.selection,selection_key:g.game_id+'|'+side.selection,estimated_probability:side.probability,recommendation:'non_evalue',scope:'all_games',scope_key:'week:'+week,inputs_asof:recordedAt,reasoning:{algorithm:'Elo ratings replay; initial 1500, K=24, home advantage=55; not independently calibrated'},prediction_context:{opponent:side.selection===g.home_team_id?g.away_team_id:g.home_team_id,recorded_at:recordedAt},data_quality:{historical_accuracy_verified:false,betting_recommendations:false}};
      return {...record,decision_key:createHash('sha256').update(JSON.stringify(record)).digest('hex')};
    }));
  let archive_status='nothing_to_archive';
  if(snapshots.length){
   try{
    const saved=await fetch(base+'/rest/v1/nfl_studio_forecast_decisions_v2?on_conflict=decision_key',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(snapshots),cache:'no-store',signal:AbortSignal.timeout(7000)});
    archive_status=saved.ok?'saved_or_existing':'http_'+saved.status;
   }catch{archive_status='connection_failed';}
  }
  return NextResponse.json({engine:'Elo',model_version:'elo-recovery-v1',historical_accuracy_verified:false,betting_recommendations:false,settled_games: settled,archive_status,games:output},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:'elo_unavailable',detail:String(e),games:[]},{status:502});}
}
