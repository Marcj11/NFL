import {NextResponse} from 'next/server';
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
 const [games,cache]=await Promise.all([
 query('games',{or:'(home_team_id.in.('+teams.join(',')+'),away_team_id.in.('+teams.join(',')+'))',kickoff_utc:'lt.'+target.kickoff_utc,order:'kickoff_utc.desc',limit:'70'}),
 query('nfl_studio_live_odds_cache',{id:'eq.nfl',limit:'1'})]);
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
 const home=stats[target.home_team_id],away=stats[target.away_team_id];
 const ready=home.games>=4&&away.games>=4&&home.points!==null&&away.points!==null;
 const projectedHome=ready?(home.points+away.allowed)/2:null;
 const projectedAway=ready?(away.points+home.allowed)/2:null;
 const projectedTotal=ready?projectedHome+projectedAway:null;
 const projectedDiff=ready?projectedHome-projectedAway:null;
 const candidates=[...offers.values()].map(o=>{
  let baseline:number|null=null,angle='',signal=0;
  if(o.market==='totals'&&projectedTotal!==null&&o.point!==undefined){baseline=projectedTotal;signal=(o.name.toLowerCase()==='over'?projectedTotal-o.point:o.point-projectedTotal);angle='Projection indicative basée sur les points marqués et encaissés lors des cinq derniers matchs de chaque équipe.'}
  if(o.market==='spreads'&&projectedDiff!==null&&o.point!==undefined){const side=o.name===names[target.home_team_id]?projectedDiff:-projectedDiff;baseline=side;signal=side+o.point;angle='Comparaison entre les marges de points récentes et le handicap proposé.'}
  if(o.market==='h2h'&&projectedDiff!==null){const side=o.name===names[target.home_team_id]?projectedDiff:-projectedDiff;baseline=side;signal=side;angle='Différentiel de points attendu à partir des attaques et défenses récentes, sans estimation calibrée de probabilité.'}
  return {...o,baseline,signal,angle};
 }).filter(o=>o.baseline!==null&&o.angle&&Math.abs(o.signal)>0.1);
 const best=candidates.sort((a,b)=>Math.abs(b.signal)-Math.abs(a.signal));
 const selected:typeof best=[];const used=new Set<string>();
 for(const o of best){const group=o.market+'|'+(o.market==='h2h'?o.name:o.market==='totals'?o.name:o.name);if(used.has(group))continue;used.add(group);selected.push(o);if(selected.length===5)break}
 return NextResponse.json({game_id:id,stats,model:'five_recent_games_points_for_against',quality:ready?'research_only':'insufficient_sample',home_projection:projectedHome,away_projection:projectedAway,odds_fetched_at:store.fetched_at,analysis:selected.map(({price,...o})=>({...o,decimal:Number(o.decimal.toFixed(2)),signal:Number(o.signal.toFixed(2)),status:'observation_not_recommendation'}))},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'analysis_unavailable'},{status:503})}
}