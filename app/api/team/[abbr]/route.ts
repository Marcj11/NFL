import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const valid=['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LV','LAC','LA','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SF','SEA','TB','TEN','WAS'];
const aliases:Record<string,string>={LA:'lar',WAS:'wsh'};
export async function GET(_request:Request,context:{params:Promise<{abbr:string}>}){
 const {abbr:input}=await context.params;const team=input.toUpperCase();
 if(!valid.includes(team))return NextResponse.json({error:'unknown_team'},{status:404});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 async function query(table:string,params:Record<string,string>){
  const p=new URLSearchParams({select:'*',...params});
  const r=await fetch(url+'/rest/v1/'+table+'?'+p,{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error(table+'_'+r.status);return r.json();
 }
 try{
  const [schedule,history]=await Promise.all([
   query('games',{or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'gt.'+new Date(Date.now()-6*3600000).toISOString(),order:'kickoff_utc.asc',limit:'8'}),
   query('games',{or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+new Date().toISOString(),order:'kickoff_utc.desc',limit:'5'})
  ]);
  // Keep today's matchup visible after kickoff until a final score is recorded.
  const started=schedule.filter((g:{kickoff_utc:string})=>Date.parse(g.kickoff_utc)<=Date.now());
  const completed=started.length?await query('game_results',{game_id:'in.('+started.map((g:{game_id:string})=>g.game_id).join(',')+')',limit:'8'}).catch(()=>[]):[];
  const eligible=schedule.filter((g:{game_id:string;kickoff_utc:string})=>Date.parse(g.kickoff_utc)>Date.now()||!completed.some((r:{game_id:string;home_score:number|null;away_score:number|null})=>r.game_id===g.game_id&&r.home_score!==null&&r.away_score!==null));
  const next=eligible[0]||null;const opponent=next?(next.home_team_id===team?next.away_team_id:next.home_team_id):null;
  const [results,probability,risk,explanation,replacements,players]=await Promise.all([
   history.length?query('game_results',{game_id:'in.('+history.map((x:{game_id:string})=>x.game_id).join(',')+')',limit:'5'}).catch(()=>[]):Promise.resolve([]),
   next?query('nfl_studio_upcoming_moneyline_preview_v1',{game_id:'eq.'+next.game_id,limit:'1'}).catch(()=>[]):Promise.resolve([]),
   next?query('nfl_studio_roster_disruption_v1',{game_id:'eq.'+next.game_id,limit:'2'}).catch(()=>[]):Promise.resolve([]),
   next?query('nfl_studio_moneyline_explanation_v1',{game_id:'eq.'+next.game_id,limit:'1'}).catch(()=>[]):Promise.resolve([]),
   next?query('nfl_studio_replacement_candidates_v1',{game_id:'eq.'+next.game_id,team_id:'eq.'+team,order:'candidate_rank.asc',limit:'100'}).catch(()=>[]):Promise.resolve([]),
   next?query('nfl_studio_expected_player_impact_v1',{game_id:'eq.'+next.game_id,order:'prior_offensive_snaps.desc',limit:'120'}).catch(()=>[]):Promise.resolve([])
  ]);
  const injuries:{name:string;status:string;detail:string;returnEstimate:string}[]=[];
  // No unreliable ESPN scraping: the endpoint intentionally returns no verified current injury names
  // until a provenance-aware pregame injury feed is connected.
  const recent=history.map((g:{game_id:string;home_team_id:string;away_team_id:string})=>{
   const r=results.find((x:{game_id:string})=>x.game_id===g.game_id);
   if(!r||r.home_score===null||r.away_score===null)return null;
   const diff=(g.home_team_id===team?1:-1)*(r.home_score-r.away_score);
   return {game_id:g.game_id,kickoff_utc:(g as typeof g & {kickoff_utc:string}).kickoff_utc,home_team_id:g.home_team_id,away_team_id:g.away_team_id,home_score:r.home_score,away_score:r.away_score,diff,result:diff>0?'W':diff<0?'L':'T'};
  }).filter(Boolean);
  const wins=recent.filter((x:{result:string})=>x.result==='W').length;
  const losses=recent.filter((x:{result:string})=>x.result==='L').length;
  const ownRisk=risk.find((x:{team_id:string})=>x.team_id===team)||null;
  const narrative=[
   recent.length?'Sur les '+recent.length+' dernières rencontres avec résultat enregistré, '+team+' affiche '+wins+' victoire(s) et '+losses+' défaite(s).':'La forme récente ne peut pas être établie à partir des résultats disponibles.',
   ownRisk?'Le dernier effectif recensé signale '+ownRisk.high_usage_missing+' joueur(s) historiquement très utilisés qui ne figurent pas parmi les actifs. Cela exige une validation des blessures et des statuts avant-match.':'Les données disponibles ne permettent pas encore d’évaluer avec précision les changements d’effectif.',
   next?'Le prochain adversaire identifié au calendrier est '+opponent+'. Les probabilités affichées plus bas utilisent un modèle historique préliminaire, sans confirmation du lineup.':'Aucune rencontre future identifiée pour cette équipe.'
  ];
  return NextResponse.json({team,opponent,next,upcoming:schedule,recent,wins,losses,narrative,probability:probability[0]||null,explanation:explanation[0]||null,rosterRisk:ownRisk,replacements,players:players.filter((x:{team_id:string})=>x.team_id===team||x.team_id===opponent),injuries,injuryStatus:'unverified_not_available',oddsStatus:'not_verified',recommendedBets:[],updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'team_data_unavailable'},{status:502})}
}
