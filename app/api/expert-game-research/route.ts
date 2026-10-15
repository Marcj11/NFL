import {extractEspnQBs} from '../../../lib/expert-nfl/espn-qb-parser';
import {espnTeamId} from '../../../lib/expert-nfl/espn-team-ids';
import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Game={game_id:string;kickoff_utc:string;home_team_id:string;away_team_id:string;game_results:{home_score:number;away_score:number}|{home_score:number;away_score:number}[]|null};
type Market={market:string;selection:string;line:number|null;odds:number;book:string};
const normal=(x:number)=>0.5*(1+erf(x/Math.sqrt(2)));
function erf(x:number){const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x))}
function moments(rows:Game[],team:string){const vals=rows.flatMap(g=>{const r=Array.isArray(g.game_results)?g.game_results[0]:g.game_results;if(!r||r.home_score==null||r.away_score==null)return [];return [{date:g.kickoff_utc,pf:g.home_team_id===team?r.home_score:r.away_score,pa:g.home_team_id===team?r.away_score:r.home_score}]});const n=vals.length;if(n<5)return null;const pf=vals.reduce((s,x)=>s+x.pf,0)/n,pa=vals.reduce((s,x)=>s+x.pa,0)/n;return {n,pf,pa}}
export async function GET(req:Request){
 const url=new URL(req.url),home=url.searchParams.get('home')||'',away=url.searchParams.get('away')||'',before=url.searchParams.get('before')||'';
 if(!/^[A-Z]{2,3}$/.test(home)||!/^[A-Z]{2,3}$/.test(away)||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_parameters'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)return NextResponse.json({status:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 const load=async(team:string)=>{const p=new URLSearchParams({select:'game_id,kickoff_utc,home_team_id,away_team_id,game_results(home_score,away_score)',or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'12'});const r=await fetch(base+'/rest/v1/games?'+p,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('history_unavailable');return r.json() as Promise<Game[]>};
 try{const [h,a]=await Promise.all([load(home),load(away)]),hm=moments(h,home),am=moments(a,away);if(!hm||!am)return NextResponse.json({status:'insufficient_history',home,away,decision:'PASSER',explanation:'Moins de cinq matchs terminés disponibles par équipe.'});
 const qbContext=await Promise.all([home,away].map(async team=>{
  const id=espnTeamId(team);
  if(!id)return {team,projected_qb:null,status:'unknown_team'};
  try{
   const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/depthcharts',{cache:'no-store',signal:AbortSignal.timeout(4500)});
   if(!r.ok)return {team,projected_qb:null,status:'espn_unavailable'};
   const parsed=extractEspnQBs(await r.json());
   return {team,projected_qb:parsed.qbs[0]?.name||null,status:parsed.qbs.length?'espn_probable':'espn_no_depth_chart_qb'};
  }catch{return {team,projected_qb:null,status:'espn_unavailable'}}
 }));
 const homePoints=(hm.pf+am.pa)/2+1.5,awayPoints=(am.pf+hm.pa)/2;const margin=homePoints-awayPoints,total=homePoints+awayPoints;const marginSd=13.5,totalSd=17.5;
 return NextResponse.json({status:'experimental_unvalidated',home,away,home_win_probability:normal(margin/marginSd),away_win_probability:1-normal(margin/marginSd),projected_margin:margin,projected_total:total,spread_sd:marginSd,total_sd:totalSd,sample_home:hm.n,sample_away:am.n,espn_qb_context:qbContext,qb_assumptions_included_in_numeric_forecast:false,model:'simple-historical-scores-v0',decision:'PASSER',explanation:'Projection exploratoire sur les scores historiques récents. QB ESPN affichés comme hypothèses sans ajustement chiffré, blessures et météo non modélisées, aucune validation hors échantillon. Aucune mise conseillée.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'history_unavailable',decision:'PASSER'},{status:502})}
}
