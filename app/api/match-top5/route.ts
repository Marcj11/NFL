import {NextResponse} from 'next/server';
import {guardMatchTop5} from '../../../engine/match-top-five-guard';
import {evaluateEngineC, ENGINE_C_VERSION} from '../../../lib/engine-c/universal-v5';
import {provisionalInjuryEffects} from '../../../lib/engine-c/injury-scenario-provisional';
export const dynamic='force-dynamic';
type Game={game_id:string;home_team_id:string;away_team_id:string;kickoff_utc:string};
type Score={game_id:string;home_score:number;away_score:number};
type Offer={market:string;name:string;point?:number;price:number;book:string;decimal:number};
const decimal=(x:number)=>x>0?1+x/100:x<0?1+100/Math.abs(x):0;
export async function GET(req:Request){
 const id=new URL(req.url).searchParams.get('game_id')||'';
 if(!/^2026_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/.test(id))return NextResponse.json({error:'invalid_game'},{status:400});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 async function query(table:string,p:Record<string,string>){const r=await fetch(url+'/rest/v1/'+table+'?'+new URLSearchParams({select:'*',...p}),{headers,cache:'no-store'});if(!r.ok)throw Error(table+'_'+r.status);return r.json()}
 try{
 const target=(await query('games',{game_id:'eq.'+id,limit:'1'}))[0] as Game|undefined;
 if(!target)return NextResponse.json({error:'not_found'},{status:404});
 const teams=[target.home_team_id,target.away_team_id];
 // These ESPN records identify injuries, not verified official pre-kickoff inactives.
 const injuryRows=await query('engine_c_espn_injury_ready_v1',{game_id:'eq.'+id,limit:'500'}).catch(()=>[]);
 const injurySummary=Object.fromEntries(teams.map(team=>{
  const rows=injuryRows.filter((p:any)=>p.team_id===team);
  const counts={out:0,doubtful:0,questionable:0,other:0};
  for(const p of rows){
   const status=String(p.injury_status||'').trim().toLowerCase();
   if(status==='out'||status==='injured reserve')counts.out++;
   else if(status==='doubtful')counts.doubtful++;
   else if(status==='questionable')counts.questionable++;
   else counts.other++;
  }
  return [team,{matched_players:rows.length,...counts}];
 }));
 const injuryCoverage={source:'espn_injury_crosswalk',matched_players:injuryRows.length,teams_with_players:[...new Set(injuryRows.map((p:any)=>String(p.team_id)))],by_team:injurySummary,official_inactives_verified:false,affects_probability:false};
 const [games,cache,playerRows]=await Promise.all([
 query('games',{or:'(home_team_id.in.('+teams.join(',')+'),away_team_id.in.('+teams.join(',')+'))',kickoff_utc:'lt.'+target.kickoff_utc,order:'kickoff_utc.desc',limit:'70'}),
 query('nfl_studio_live_odds_cache',{id:'eq.nfl',limit:'1'}),
 query('nfl_studio_expected_player_impact_v1',{game_id:'eq.'+id,limit:'100'}).catch(()=>[])]);
 const prior=(games as Game[]).filter(g=>teams.includes(g.home_team_id)||teams.includes(g.away_team_id));
 const results=prior.length?await query('game_results',{game_id:'in.('+prior.map(g=>g.game_id).join(',')+')',limit:'70'}):[] as Score[];
 const scoreMap=new Map((results as Score[]).filter(r=>r.home_score!==null&&r.away_score!==null).map(r=>[r.game_id,r]));
 const stats=Object.fromEntries(teams.map(team=>{
 const matched=prior.filter(g=>(g.home_team_id===team||g.away_team_id===team)&&scoreMap.has(g.game_id)).slice(0,5);
 const data=matched.map(g=>{const r=scoreMap.get(g.game_id)!;const home=g.home_team_id===team;const points=home?r.home_score:r.away_score;const allowed=home?r.away_score:r.home_score;return {points,allowed,margin:points-allowed,total:points+allowed}});
 const avg=(fn:(x:typeof data[number])=>number)=>data.length?data.reduce((a,b)=>a+fn(b),0)/data.length:null;
 return [team,{games:data.length,points:avg(x=>x.points),allowed:avg(x=>x.allowed),margin:avg(x=>x.margin),total:avg(x=>x.total),wins:data.filter(x=>x.margin>0).length}];
 }));
 const store=cache[0]||{};const payload=Array.isArray(store.payload)?store.payload:[];
 const names:Record<string,string>={ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GB:'Green Bay Packers',HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',KC:'Kansas City Chiefs',LV:'Las Vegas Raiders',LAC:'Los Angeles Chargers',LA:'Los Angeles Rams',MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NE:'New England Patriots',NO:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SF:'San Francisco 49ers',SEA:'Seattle Seahawks',TB:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders'};
 const marketGame=payload.find((g:any)=>g.home_team===names[target.home_team_id]&&g.away_team===names[target.away_team_id]&&Math.abs(Date.parse(g.commence_time)-Date.parse(target.kickoff_utc))<86400000);
 const offers=new Map<string,Offer>();
 for(const b of marketGame?.bookmakers||[])for(const m of b.markets||[]){if(!['h2h','spreads','totals'].includes(m.key))continue;for(const o of m.outcomes||[]){const d=decimal(o.price);if(!Number.isFinite(d)||d<=1)continue;const k=[m.key,o.name,o.point??''].join('|');const current=offers.get(k);if(!current||d>current.decimal)offers.set(k,{market:m.key,name:o.name,point:o.point,price:o.price,book:b.title,decimal:d})}}
 const cacheGameId=marketGame?.id?String(marketGame.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100):null;
 const propStored=cacheGameId?await query('nfl_studio_live_odds_cache',{id:'eq.props_'+cacheGameId,limit:'1'}).catch(()=>[]):[];
 const propRows=Array.isArray(propStored[0]?.payload)?propStored[0].payload:[];
 const namesOfPlayers:string[]=[...new Set<string>((propRows as any[]).map((x:any)=>String(x.player||'').trim()).filter((x:string)=>x.length>2))].slice(0,36);
 const escaped=namesOfPlayers.map((x:string)=>'"'+x.replaceAll('\\','\\\\').replaceAll('"','\\"')+'"').join(',');
 const recent=escaped?await query('nfl_studio_player_recent_prop_results_v1',{team_id:'in.('+teams.join(',')+')',display_name:'in.('+escaped+')',limit:'250'}).catch(()=>[]):[];
 const recentByName=new Map<string,any[]>();
 for(const row of recent){const k=String(row.display_name).toLowerCase();recentByName.set(k,[...(recentByName.get(k)||[]),row])}
 const propCandidates=propRows.flatMap((x:any)=>{
  const market=String(x.market),field=market==='player_pass_yds'?'passing_yards':market==='player_rush_yds'?'rushing_yards':market==='player_reception_yds'?'receiving_yards':null;
  const name=String(x.player||''),side=String(x.side||'').toLowerCase(),line=Number(x.point),decimal=Number(x.decimal);
  if(!field||!Number.isFinite(line)||decimal<=1||!['over','under'].includes(side))return [];
  const games=(recentByName.get(name.toLowerCase())||[]).filter(g=>Date.parse(String(g.kickoff_utc))<Date.parse(target.kickoff_utc)).sort((a,b)=>Date.parse(String(b.kickoff_utc))-Date.parse(String(a.kickoff_utc))).slice(0,5);
  if(games.length<3)return [];
  const values=games.map(g=>Number(g[field])).filter(Number.isFinite);
  if(values.length<3)return [];
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const minimum=field==='passing_yards'?150:25;
  if(mean<minimum)return [];
  const hits=values.filter(v=>side==='over'?v>line:v<line).length;
  const observed=hits/values.length;
  // Shrink very small samples toward 50%; historical fixed-threshold accuracy is NOT a calibrated market probability.
  const probability=(hits+2)/(values.length+4);
  return [{market,player:name,name,point:line,decimal,book:String(x.book),signal:observed*100,probability,probability_kind:'five_game_smoothed_frequency',status:'research_v2_unvalidated',angle:name+' a '+(side==='over'?'dépassé':'terminé sous')+' '+line+' verges lors de '+hits+' de ses '+games.length+' derniers matchs. Fréquence historique lissée : '+Math.round(probability*100)+' %. Échantillon réduit, sans garantie ni confirmation de disponibilité.',side}];
 });
 const bestProps=new Map<string,(typeof propCandidates)[number]>();
 for(const x of propCandidates){const k=x.market+'|'+x.player+'|'+x.side+'|'+x.point;const old=bestProps.get(k);if(!old||x.decimal>old.decimal)bestProps.set(k,x)}
 const playerInsights=teams.map(team=>{
 const list=(playerRows as any[]).filter(p=>p.team_id===team&&Number(p.history_games)>=3);
 const best=(position:string,field:string)=>list.filter(p=>p.position===position&&Number(p[field])>0).sort((a,b)=>Number(b[field])-Number(a[field]))[0];
 const qb=best('QB','prior_passing_yards'),rb=best('RB','prior_rushing_yards'),wr=best('WR','prior_receiving_yards'),te=best('TE','prior_receiving_yards');
 return {team,qb:qb?{name:qb.display_name,passing:Number(qb.prior_passing_yards),sample:qb.history_games}:null,rb:rb?{name:rb.display_name,rushing:Number(rb.prior_rushing_yards),sample:rb.history_games}:null,receivers:[wr,te].filter(Boolean).map(p=>({name:p.display_name,receiving:Number(p.prior_receiving_yards),targets:Number(p.prior_targets),sample:p.history_games}))};
 });
 const asof=injuryRows.reduce((latest:string,p:any)=>Date.parse(String(p.observed_at))>Date.parse(latest)?String(p.observed_at):latest,'1970-01-01T00:00:00Z');
 const eligible=injuryRows.filter((p:any)=>teams.includes(String(p.team_id))&&Date.parse(String(p.observed_at))<Date.parse(target.kickoff_utc));
 const injuryScenario=provisionalInjuryEffects({game_id:id,kickoff_utc:target.kickoff_utc,observed_at:asof,players:eligible.map((p:any)=>({team:p.team_id===target.home_team_id?'home' as const:'away' as const,position:String(p.position||'WR'),status:String(p.injury_status||'active'),snapShare:0.5,productionShare:0.5,replacementQuality:0.5}))});
 const injuryDelta=injuryScenario.status==='provisional_uncalibrated'?injuryScenario.effects:null;
 const injuryModel={status:injuryScenario.status,matched:eligible.length,calibrated:false};
 const home=stats[target.home_team_id],away=stats[target.away_team_id];
 const ready=home.games>=4&&away.games>=4&&home.points!==null&&away.points!==null&&home.allowed!==null&&away.allowed!==null;
 const projectedHome=ready&&home.points!==null&&away.allowed!==null?(home.points+away.allowed)/2:null;
 const projectedAway=ready&&away.points!==null&&home.allowed!==null?(away.points+home.allowed)/2:null;
 const projectedTotal=projectedHome!==null&&projectedAway!==null?projectedHome+projectedAway:null;
 const projectedDiff=home.margin!==null&&away.margin!==null?home.margin-away.margin+3:null;
 const candidates=[...offers.values()].map(o=>{
  let baseline:number|null=null,angle='',signal=0;
  if(o.market==='totals'&&projectedTotal!==null&&o.point!==undefined){baseline=projectedTotal;signal=(o.name.toLowerCase()==='over'?projectedTotal-o.point:o.point-projectedTotal);angle='Projection indicative basée sur les points marqués et encaissés lors des cinq derniers matchs de chaque équipe.'}
  if(o.market==='spreads'&&projectedDiff!==null&&o.point!==undefined){const side=o.name===names[target.home_team_id]?projectedDiff:-projectedDiff;baseline=side;signal=side+o.point;angle='Comparaison entre les marges de points des cinq matchs précédents, avec avantage domicile de trois points (modèle expérimental de spreads).'}
  if(o.market==='h2h'&&projectedDiff!==null){const side=o.name===names[target.home_team_id]?projectedDiff:-projectedDiff;baseline=side;signal=side;angle='Différentiel de points attendu à partir des attaques et défenses récentes, sans estimation calibrée de probabilité.'}
  const focus=playerInsights.find(p=>names[p.team]===o.name)||playerInsights[0];
  const context=focus?.qb?' Contexte individuel : '+focus.qb.name+' a produit '+focus.qb.passing.toFixed(0)+' verges aériennes par match sur '+focus.qb.sample+' rencontres; '+(focus.rb?focus.rb.name+' a ajouté '+focus.rb.rushing.toFixed(0)+' verges au sol par match.':'le jeu au sol reste à examiner.'):' Statistiques individuelles insuffisantes pour confirmer un avantage.';
  return {...o,baseline,signal,angle:angle+context};
 }).filter(o=>o.baseline!==null&&o.angle&&Math.abs(o.signal)>0.1);
 // Every selection needs a model probability; bookmaker implied chance is not a forecast.
 const logistic=(z:number)=>1/(1+Math.exp(-1.702*Math.max(-8,Math.min(8,z))));
 const gamePicks=candidates.flatMap(o=>{
  let probability:number|null=null;
  if(['h2h','spreads','totals'].includes(o.market))probability=evaluateEngineC({market:o.market as 'h2h'|'spreads'|'totals',signal:o.signal,odds:o.decimal,provisionalInjuryDelta:injuryDelta?Math.max(-4,Math.min(4,injuryDelta[o.market as 'h2h'|'spreads'|'totals'])):0}).probability;
  if(probability===null||!Number.isFinite(probability)||probability<=0||probability>=1)return [];
  return [{market:o.market,name:o.name,point:o.point,book:o.book,decimal:Number(o.decimal.toFixed(2)),probability,signal:Number(o.signal.toFixed(2)),angle:o.angle,status:'experimental_unvalidated'}];
 });
 const playerPicks=[...bestProps.values()].map(p=>({...p,team_id:String((recentByName.get(p.player.toLowerCase())||[])[0]?.team_id||''),probability:Number(p.probability),expected_value:Number(p.probability)*p.decimal-1,status:'experimental_unvalidated'}));
 const propsByTeam=Object.fromEntries(teams.map(team=>[team,playerPicks.filter(p=>p.team_id===team&&p.expected_value>0&&Number.isFinite(p.expected_value)).sort((a,b)=>b.expected_value-a.expected_value).slice(0,5)]));
 const ranked=[...gamePicks,...playerPicks].filter(p=>Number.isFinite(p.probability)&&p.probability>0&&p.probability<1&&Number.isFinite(p.decimal)&&p.decimal>1)
  .map(p=>({...p,expected_value:p.probability*p.decimal-1}))
  .sort((a,b)=>b.expected_value-a.expected_value);
 const combined=guardMatchTop5(ranked as any[],teams);
 const heavy=combined.find(p=>p.heavyball);
 // Archive the complete matchup top five before kickoff, with odds and selection rationale.
 if(Date.parse(target.kickoff_utc)>Date.now()&&combined.length){
  const rows=combined.slice(0,5).flatMap((pick:any,idx:number)=>{
   const prob=Number(pick.probability),odd=Number(pick.decimal);
   if(!Number.isFinite(prob)||prob<=0||prob>=1||!Number.isFinite(odd)||odd<=1)return [];
   const row={model_version:pick.market==='h2h'||pick.market==='spreads'||pick.market==='totals'?ENGINE_C_VERSION:'historical_market_research_v4',game_id:id,kickoff_utc:target.kickoff_utc,category:'match',market:String(pick.market),selection:String(pick.name||pick.player||''),selection_key:id+'|'+String(pick.market)+'|'+String(pick.name||pick.player||'')+'|'+String(pick.point??''),line:pick.point??null,bookmaker:String(pick.book||''),decimal_odds:odd,odds_observed_at:store.fetched_at||null,estimated_probability:prob,implied_probability:1/odd,estimated_ev:prob*odd-1,recommendation:'miser',rank:idx+1,scope:'match_top5',scope_key:id,reasoning:{explanation:pick.angle||null,signal:pick.signal??null,model_validation:'experimental_unvalidated'},prediction_context:{teams,market:pick.market},data_quality:{calibrated:false,source:pick.market==='h2h'||pick.market==='spreads'||pick.market==='totals'?ENGINE_C_VERSION:'historical_market_research_v4'}};
   return [row];
  });
  if(rows.length){
   try{
    const {createHash}=await import('node:crypto');
    const snapshotHour=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString();
    const payload=rows.map(row=>({...row,inputs_asof:snapshotHour,decision_key:createHash('sha256').update(JSON.stringify({...row,inputs_asof:snapshotHour})).digest('hex')}));
    await fetch(url+'/rest/v1/nfl_studio_forecast_decisions_v2?on_conflict=decision_key',{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(7000)});
   }catch{}
  }
 }
 return NextResponse.json({game_id:id,stats,model:ENGINE_C_VERSION,player_insights:playerInsights,quality:ready?'research_only':'insufficient_sample',home_projection:projectedHome,away_projection:projectedAway,spread_projected_margin:projectedDiff,model_validation:'historical_benchmarks_only_not_live_calibrated',odds_fetched_at:store.fetched_at,heavyball_available:Boolean(heavy),analysis:combined,propsByTeam,injuryModel},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:'analysis_unavailable',detail:e instanceof Error?e.message.slice(0,100):'unknown'},{status:503})}
}