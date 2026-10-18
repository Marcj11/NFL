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
  return NextResponse.json({engine:'Elo',model_version:'elo-recovery-v1',historical_accuracy_verified:false,betting_recommendations:false,settled_games: settled,games:output},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:'elo_unavailable',detail:String(e),games:[]},{status:502});}
}
