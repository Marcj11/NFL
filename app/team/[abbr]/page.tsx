'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
const teams:Record<string,[string,string,string]>={ARI:['Arizona Cardinals','#97233F','#141414'],ATL:['Atlanta Falcons','#A71930','#111'],BAL:['Baltimore Ravens','#241773','#9E7C0C'],BUF:['Buffalo Bills','#00338D','#C60C30'],CAR:['Carolina Panthers','#0085CA','#101820'],CHI:['Chicago Bears','#0B162A','#C83803'],CIN:['Cincinnati Bengals','#FB4F14','#111'],CLE:['Cleveland Browns','#311D00','#FF3C00'],DAL:['Dallas Cowboys','#003594','#869397'],DEN:['Denver Broncos','#FB4F14','#002244'],DET:['Detroit Lions','#0076B6','#B0B7BC'],GB:['Green Bay Packers','#203731','#FFB612'],HOU:['Houston Texans','#03202F','#A71930'],IND:['Indianapolis Colts','#002C5F','#FFF'],JAX:['Jacksonville Jaguars','#006778','#D7A22A'],KC:['Kansas City Chiefs','#E31837','#FFB81C'],LV:['Las Vegas Raiders','#333','#A5ACAF'],LAC:['Los Angeles Chargers','#0080C6','#FFC20E'],LA:['Los Angeles Rams','#003594','#FFA300'],MIA:['Miami Dolphins','#008E97','#FC4C02'],MIN:['Minnesota Vikings','#4F2683','#FFC62F'],NE:['New England Patriots','#002244','#C60C30'],NO:['New Orleans Saints','#101820','#D3BC8D'],NYG:['New York Giants','#0B2265','#A71930'],NYJ:['New York Jets','#125740','#FFF'],PHI:['Philadelphia Eagles','#004C54','#A5ACAF'],PIT:['Pittsburgh Steelers','#101820','#FFB612'],SF:['San Francisco 49ers','#AA0000','#B3995D'],SEA:['Seattle Seahawks','#002244','#69BE28'],TB:['Tampa Bay Buccaneers','#D50A0A','#FF7900'],TEN:['Tennessee Titans','#4B92DB','#002244'],WAS:['Washington Commanders','#5A1414','#FFB612']};
const logo=(x:string)=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+({LA:'lar',WAS:'wsh'} as Record<string,string>)[x]?.toLowerCase()+'.png';
function teamLogo(x:string){return 'https://a.espncdn.com/i/teamlogos/nfl/500/'+(x==='LA'?'lar':x==='WAS'?'wsh':x.toLowerCase())+'.png'}
type Report={team:string;opponent:string|null;next:{game_id:string;kickoff_utc:string;home_team_id:string;away_team_id:string}|null;wins:number;losses:number;recent:{game_id:string;kickoff_utc:string;home_team_id:string;away_team_id:string;home_score:number;away_score:number;result:string;diff:number}[];upcoming:{game_id:string;kickoff_utc:string;home_team_id:string;away_team_id:string}[];narrative:string[];probability:{home_win_probability:string;away_win_probability:string}|null;explanation:{home_season_games:number;away_season_games:number;home_history_count:number;away_history_count:number;home_current_win_rate:string;away_current_win_rate:string;home_historical_win_rate:string;away_historical_win_rate:string;current_form_contribution:string;history_contribution:string}|null;rosterRisk:{high_usage_missing:number;high_usage_snaps_at_risk:number;roster_week:number}|null;replacements:{missing_player:string;position:string;missing_usage:number;candidate_player:string|null;candidate_usage:number|null;candidate_rank:number|null;review_status:string}[];players:{team_id:string;display_name:string;position:string;history_games:number;prior_passing_yards:number|string;prior_rushing_yards:number|string;prior_receiving_yards:number|string;prior_targets:number|string;prior_def_sacks:number|string}[];injuries:{name:string;status:string;detail:string;returnEstimate:string}[];injuryStatus:string;oddsStatus:string;recommendedBets:unknown[];updatedAt:string};
export default function TeamPage(){
 const params=useParams();const abbr=String(params.abbr||'').toUpperCase();const info=teams[abbr];
 const [odds,setOdds]=useState<{status:string;fetched_at:string|null;games:{home_team:string;away_team:string;bookmakers:{title:string;markets:{key:string;outcomes:{name:string;price:number;point?:number}[]}[]}[]}[]}|null>(null);
 useEffect(()=>{let active=true;fetch('/api/odds').then(r=>r.json()).then(x=>{if(active)setOdds(x)}).catch(()=>{});return()=>{active=false}},[]);
 const [photos,setPhotos]=useState<Record<string,string>>({});useEffect(()=>{let active=true;fetch('/api/team-headshots?team='+abbr).then(r=>r.json()).then(j=>{if(active)setPhotos(j.photos||{})}).catch(()=>{});return()=>{active=false}},[abbr]);
 const [analysisRunning,setAnalysisRunning]=useState(false);
 const [pregame,setPregame]=useState<{fetchedAt:string;status:string;officialInactivesVerified:boolean;reports:{team:string;rosterAvailable:boolean;injuryFeedAvailable:boolean;rosterCount:number;depthchartAvailable?:boolean;projectedQB?:{name:string;rank:number;photo:string|null}|null;injuries:{name:string;status:string;detail:string;photo:string|null;position:string|null}[]}[]}|null>(null);
 const [propsData,setPropsData]=useState<{status:string;fetchedAt?:string;props:{market:string;player:string;side:string;point:number;decimal:number;book:string}[]}|null>(null);
 const [liveLoading,setLiveLoading]=useState(false);

 const [chosenPick,CHOOSE_PICK]=useState<{market:string;name:string;player?:string;point?:number;book:string;decimal:number;probability:number}|null>(null);
 const [entryOdds,ENTRY_ODDS]=useState(''),[entryStake,ENTRY_STAKE]=useState('5'),[entryError,ENTRY_ERROR]=useState('');
 const openPick=(pick:{market:string;name:string;player?:string;point?:number;book:string;decimal:number;probability:number})=>{CHOOSE_PICK(pick);ENTRY_ODDS(String(pick.decimal));ENTRY_STAKE('5');ENTRY_ERROR('')};

 const [analysisRequestedAt,setAnalysisRequestedAt]=useState<string|null>(null);
 const [analysisNonce,setAnalysisNonce]=useState(0);
 const [analysisError,setAnalysisError]=useState(''); const [data,setData]=useState<Report|null>(null); const [analysis,setAnalysis]=useState<{quality:string;model:string;home_projection:number|null;away_projection:number|null;stats:Record<string,{games:number;points:number;allowed:number;wins:number}>;analysis:{market:string;name:string;player?:string;point?:number;book:string;decimal:number;signal:number;angle?:string;probability:number;expected_value:number;heavyball?:boolean;status:string}[]}|null>(null);
 const recordPick=()=>{
  if(!chosenPick||!data?.next)return;
  const price=Number(entryOdds.replace(',','.')),amount=Number(entryStake.replace(',','.'));
  if(!Number.isFinite(price)||price<=1||!Number.isFinite(amount)||amount<=0){ENTRY_ERROR('Cote supérieure à 1,00 et mise positive nécessaires.');return}
  const oddsGame=teams[data.next.away_team_id]?.[0]+' vs '+teams[data.next.home_team_id]?.[0];
  const item={id:'match:'+data.next.game_id+':'+chosenPick.market+':'+chosenPick.name+':'+Date.now(),game:oddsGame,market:chosenPick.market==='h2h'?'moneyline':chosenPick.market==='player_pass_yds'||chosenPick.market==='player_rush_yds'||chosenPick.market==='player_reception_yds'?'props':chosenPick.market==='totals'?'totals':chosenPick.market==='spreads'?'spreads':chosenPick.market,selection:(chosenPick.player?chosenPick.player+' · ':'')+chosenPick.name+(typeof chosenPick.point==='number'?' '+chosenPick.point:''),line:chosenPick.point,book:chosenPick.book,odds:chosenPick.decimal,prob:chosenPick.probability,team:abbr,player:chosenPick.player,stake:amount,chosenOdds:price,placedAt:new Date().toISOString(),status:'open'};
  try{const key='nfl-studio-bets-v1';const existing=JSON.parse(localStorage.getItem(key)||'[]');const records=Array.isArray(existing)?existing:[];localStorage.setItem(key,JSON.stringify([item,...records]));CHOOSE_PICK(null)}catch{ENTRY_ERROR('Impossible d’enregistrer dans ce navigateur.')}
 };
 useEffect(()=>{if(!data?.next?.game_id){setAnalysis(null);return}let active=true;setAnalysisRunning(true);fetch('/api/match-player-props?home='+encodeURIComponent(teams[data.next!.home_team_id]?.[0]||'')+'&away='+encodeURIComponent(teams[data.next!.away_team_id]?.[0]||''),{cache:'no-store'}).catch(()=>null).then(()=>fetch('/api/match-top5?game_id='+encodeURIComponent(data.next!.game_id)+'&requested_at='+analysisNonce,{cache:'no-store'})).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||'Erreur serveur '+r.status);return j}).then(j=>{if(active){setAnalysis(j);setAnalysisError('');setAnalysisRequestedAt(new Date().toISOString());setAnalysisRunning(false)}}).catch(e=>{if(active){setAnalysis(null);setAnalysisError(String(e.message));setAnalysisRunning(false)}});return()=>{active=false}},[data?.next?.game_id,analysisNonce]);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!data?.next||!data.opponent)return;let active=true;setLiveLoading(true);
 const names=teams[data.next.home_team_id]?.[0]||'',away=teams[data.next.away_team_id]?.[0]||'';
 Promise.allSettled([fetch('/api/pregame-status?teams='+data.next.home_team_id+','+data.next.away_team_id,{cache:'no-store'}).then(r=>r.json()),fetch('/api/match-player-props?home='+encodeURIComponent(names)+'&away='+encodeURIComponent(away),{cache:'no-store'}).then(r=>r.json())]).then(([a,b])=>{if(!active)return;setPregame(a.status==='fulfilled'?a.value:null);setPropsData(b.status==='fulfilled'?b.value:null);setLiveLoading(false)});return()=>{active=false}},[data?.next?.game_id,analysisNonce]);

 useEffect(()=>{let live=true;setLoading(true);fetch('/api/team/'+encodeURIComponent(abbr)).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Erreur');if(live)setData(d)}).catch(e=>{if(live)setError(String(e.message))}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[abbr]);
 if(!info)return <main style={{padding:40}}><Link href="/">Retour aux équipes</Link><h1>Équipe inconnue</h1></main>;
 const [name,primary,secondary]=info,opp=data?.opponent?teams[data.opponent]:null;const p=data?.probability&&data.next?(data.next.home_team_id===abbr?Number(data.probability.home_win_probability):Number(data.probability.away_win_probability)):null;
 return <main style={{maxWidth:1660,margin:'auto',padding:'24px 24px 90px',color:'#eef5fb'}}>
 <Link href="/" style={{display:'inline-block',marginBottom:22,opacity:.8}}>← RETOUR AUX 32 GANGS DE LA NFL</Link>
 <section style={{minHeight:335,borderRadius:24,position:'relative',overflow:'hidden',background:'linear-gradient(125deg,'+primary+' 0%,'+primary+' 64%,'+secondary+' 100%)',padding:'44px 5%',boxShadow:'0 20px 60px #0006'}}>
 <img src={teamLogo(abbr)} alt="" style={{position:'absolute',width:400,height:400,objectFit:'contain',right:-35,top:-30,opacity:.18}}/>
 <div style={{position:'relative',maxWidth:650}}><p style={{fontSize:12,fontWeight:800,letterSpacing:3}}>NFL STUDIO · ANALYSE D'ÉQUIPE</p><h1 style={{fontSize:'clamp(40px,6vw,78px)',lineHeight:1.04,margin:'20px 0'}}>{name}</h1><p style={{fontSize:18,opacity:.9}}>État actuel · Saison 2026</p><p style={{fontSize:14,marginTop:26,opacity:.85}}>Résultats récents et calendrier ci-dessous ↓</p></div></section>
 {data&&<section style={{marginTop:20,display:'grid',gap:22}}>
<div><h2 style={{fontSize:19,margin:'0 0 12px'}}>Derniers résultats</h2><div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:12}}>
{data.recent.length?data.recent.map(m=><div key={m.game_id} style={{minWidth:172,flex:'0 0 172px',borderRadius:15,padding:14,background:'#142736',border:'1px solid #32506a'}}>
<div style={{fontSize:12,color:'#b8ccd8'}}>{new Date(m.kickoff_utc).toLocaleDateString('fr-CA',{month:'short',day:'numeric',timeZone:'America/Toronto'})} · {m.home_team_id===abbr?'Domicile':'Extérieur'}</div>
<div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center',margin:'10px 0'}}><img src={teamLogo(m.away_team_id)} alt={m.away_team_id} width={48} height={48}/><span style={{opacity:.7}}>vs</span><img src={teamLogo(m.home_team_id)} alt={m.home_team_id} width={48} height={48}/></div>
<div style={{textAlign:'center',fontSize:20,fontWeight:800}}>{m.away_score} – {m.home_score}</div><div style={{textAlign:'center',color:m.result==='W'?'#76e4a9':'#ffb0a6',marginTop:4}}>{m.result==='W'?'Victoire':m.result==='L'?'Défaite':'Égalité'}</div></div>):<p>Aucun résultat confirmé.</p>}</div></div>
<div><h2 style={{fontSize:19,margin:'0 0 12px'}}>Prochains matchs</h2><div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:12}}>{data.upcoming?.length?data.upcoming.map(m=><div key={m.game_id} style={{minWidth:172,flex:'0 0 172px',borderRadius:15,padding:14,background:'#142736',border:'1px solid #32506a'}}>
<div style={{fontSize:12,color:'#b8ccd8'}}>{new Date(m.kickoff_utc).toLocaleDateString('fr-CA',{month:'short',day:'numeric',timeZone:'America/Toronto'})} · {m.home_team_id===abbr?'Domicile':'Extérieur'}</div><div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center',margin:'10px 0'}}><img src={teamLogo(m.away_team_id)} alt={m.away_team_id} width={48} height={48}/><span style={{opacity:.7}}>vs</span><img src={teamLogo(m.home_team_id)} alt={m.home_team_id} width={48} height={48}/></div><div style={{textAlign:'center',fontWeight:700}}>{m.away_team_id} @ {m.home_team_id}</div></div>):<p>Calendrier non disponible.</p>}</div></div></section>}
{loading?<p style={{padding:28}}>Chargement de l’analyse de l’équipe…</p>:error?<p style={{padding:28}}>Données temporairement indisponibles : {error}</p>:data&&<>
 <section style={{padding:'30px 0'}}><h2 style={{fontSize:27}}>Situation actuelle</h2>{data.narrative.map((s,i)=><p key={i} style={{fontSize:17,lineHeight:1.7,maxWidth:1000,color:'#cddbe4'}}>{s}</p>)}</section>
  <section style={{borderRadius:24,overflow:'hidden',background:opp?'linear-gradient(110deg,'+primary+' 0%,#0b1520 50%,'+opp[1]+' 100%)':'#112533',padding:'35px 6%',border:'1px solid #ffffff30'}}>
 <p style={{textAlign:'center',letterSpacing:3,fontWeight:800}}>LE PROCHAIN DUEL · ÇA VA BRASSER</p>
 {data.next&&data.opponent&&opp?<><div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:16}}>
 <div style={{textAlign:'center'}}><img src={teamLogo(abbr)} alt={name} style={{width:'min(100%,170px)',height:170,objectFit:'contain'}}/><h2>{name}</h2></div><div style={{fontSize:36,fontWeight:900,opacity:.8}}>VS</div><div style={{textAlign:'center'}}><img src={teamLogo(data.opponent)} alt={opp[0]} style={{width:'min(100%,170px)',height:170,objectFit:'contain'}}/><h2>{opp[0]}</h2></div></div>
 <p style={{textAlign:'center',fontSize:16}}>{new Date(data.next.kickoff_utc).toLocaleString('fr-CA',{timeZone:'America/Toronto',dateStyle:'full',timeStyle:'short'})} · {data.next.home_team_id===abbr?'À domicile':'À l’extérieur'}</p>
 <div style={{maxWidth:800,margin:'30px auto',background:'#07121cc9',padding:24,borderRadius:18}}>
 <h3 style={{textAlign:'center'}}>Probabilités de victoire · aperçu expérimental</h3>
 {p===null?<p style={{textAlign:'center'}}>Prédictions non disponibles.</p>:<><div style={{display:'flex',justifyContent:'space-between',fontSize:25,fontWeight:800}}><span>{(p*100).toFixed(1)} %</span><span>{((1-p)*100).toFixed(1)} %</span></div><div style={{height:18,borderRadius:12,overflow:'hidden',background:opp[1]}}><div style={{width:p*100+'%',height:'100%',background:secondary}}/></div></>}
 {data.explanation&&<div style={{marginTop:28,paddingTop:22,borderTop:'1px solid #ffffff35',textAlign:'left'}}>
<h3 style={{fontSize:23,margin:'0 0 14px'}}>LE DUEL SOUS LA LOUPE DES BOYS</h3>
{(()=>{
const ex=data.explanation;
const ownSeason=Number(data.next.home_team_id===abbr?ex.home_current_win_rate:ex.away_current_win_rate);
const oppSeason=Number(data.next.home_team_id===abbr?ex.away_current_win_rate:ex.home_current_win_rate);
const ownHistory=Number(data.next.home_team_id===abbr?ex.home_historical_win_rate:ex.away_historical_win_rate);
const oppHistory=Number(data.next.home_team_id===abbr?ex.away_historical_win_rate:ex.home_historical_win_rate);
const seasonGap=ownSeason-oppSeason;
const historyGap=ownHistory-oppHistory;
const leader=seasonGap>0.06?name:seasonGap<-.06?opp[0]:null;
return <div style={{fontSize:16,lineHeight:1.8,color:'#d6e3ee'}}>
<p><b>Le contexte du duel.</b> {leader?leader+' arrive avec un avantage de résultats cette saison.':'Les deux équipes présentent une forme de saison relativement comparable.'} {name} a remporté {(ownSeason*100).toFixed(0)} % de ses rencontres de la saison prises en compte, contre {(oppSeason*100).toFixed(0)} % pour {opp[0]}. Cette tendance suggère {seasonGap>.06?'une dynamique favorable à '+name:seasonGap<-.06?'un défi important pour '+name:'un match où la seule forme récente ne suffit pas à départager les adversaires'}.</p>
<p><b>Le rapport de force.</b> {Math.abs(historyGap)>.05?(historyGap>0?name:opp[0])+' possède aussi un meilleur bilan sur l’ensemble des rencontres historiques disponibles, ce qui '+(Math.sign(historyGap)===Math.sign(seasonGap)?'renforce la tendance observée cette saison.':'nuance la dynamique de cette saison.'): 'Les bilans historiques sont proches et ne dégagent pas de supériorité nette.'} {data.next.home_team_id===abbr?name:opp[0]} reçoit ce match, un contexte favorable intégré à notre estimation préliminaire.</p>
{(()=>{
const own=data.players?.filter(x=>x.team_id===abbr)||[];const other=data.players?.filter(x=>x.team_id===data.opponent)||[];
const leader=(list:typeof own,pos:string,metric:'prior_passing_yards'|'prior_rushing_yards'|'prior_receiving_yards')=>list.filter(x=>x.position===pos&&Number(x[metric])>0&&Number(x.history_games)>=2).sort((a,b)=>Number(b[metric])-Number(a[metric]))[0];
const qb=leader(own,'QB','prior_passing_yards');const rb=leader(own,'RB','prior_rushing_yards');const wr=leader(own,'WR','prior_receiving_yards');const oppQb=leader(other,'QB','prior_passing_yards');
return <div style={{padding:'15px 19px',background:'#122c40',borderRadius:14,margin:'16px 0'}}>
<h4 style={{fontSize:17,margin:'0 0 8px'}}>LES GARS À SURVEILLER : QUI VA FAIRE SA JOB ?</h4>
{qb?<p><b>{qb.display_name} ({name}) :</b> {Number(qb.prior_passing_yards).toFixed(0)} verges aériennes par match en moyenne sur {qb.history_games} matchs historiques récents. Son rendement à la passe représente un levier offensif important, mais ne démontre pas à lui seul une faiblesse des cornerbacks de {opp[0]}.</p>:<p>Statistiques récentes du quart-arrière non disponibles ou insuffisantes.</p>}
{rb&&<p><b>{rb.display_name}, au sol :</b> {Number(rb.prior_rushing_yards).toFixed(0)} verges par match en moyenne sur {rb.history_games} matchs. Sa production offre une alternative au jeu aérien et pourrait modifier l'équilibre défensif recherché par {opp[0]}.</p>}
{wr&&<p><b>{wr.display_name}, dans les airs :</b> {Number(wr.prior_receiving_yards).toFixed(0)} verges de réception et {Number(wr.prior_targets).toFixed(1)} cibles par match sur la période disponible. Son volume aide à identifier une option privilégiée dans le jeu de passes.</p>}
{oppQb&&<p><b>Réponse de {opp[0]} :</b> {oppQb.display_name} affiche {Number(oppQb.prior_passing_yards).toFixed(0)} verges aériennes par match sur {oppQb.history_games} rencontres recensées. La défense de {name} devra empêcher les séquences prolongées et les gains explosifs pour limiter cette production.</p>}
<p style={{fontSize:13,color:'#b0c7d6'}}>Moyennes historiques de la banque NFL Studio, pas projections du prochain match. L'analyse des duels spécifiques CB–WR, blessures et schémas défensifs nécessite encore des données vérifiées.</p>
</div>})()}
<p><b>Notre lecture.</b> {p!==null&&p>.60?name+' ressort favori dans cette première projection, mais cette avance demeure conditionnelle à la composition finale des équipes.':p!==null&&p<.40?opp[0]+' ressort favori à ce stade; '+name+' devra probablement dépasser sa tendance récente pour inverser le résultat.':'Le modèle ne dégage pas d’avantage assez important pour parler de domination attendue.'} Nous attendrons la vérification des joueurs disponibles et des cotes avant de qualifier un pari d’intéressant.</p>
<p style={{fontSize:13,color:'#aac0cf'}}>Analyse basée sur les résultats disponibles et le lieu du match. Aucun diagnostic sur un joueur, une couverture défensive ou une blessure n’est affirmé sans statistiques vérifiées.</p>
</div>})()}
</div>}
<p style={{fontSize:13,color:'#bbcad6'}}>Modèle de forme historique, non calibré pour les paris. Lineups et cotes non validés.</p></div></>:<p style={{textAlign:'center'}}>Prochain match non disponible.</p>}
 </section>
 <section style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap',border:'1px solid #2766a4',background:'linear-gradient(95deg,#071b32,#123454)',padding:'17px 20px',borderRadius:18,marginTop:27}}>
<div><strong style={{fontSize:19}}>⚡ ON RELANCE LA MACHINE, LES BOYS</strong><p style={{color:'#bcd2e7',fontSize:13,margin:'6px 0 0'}}>Relance les calculs à partir des résultats, des statistiques de joueurs et des cotes en cache disponibles maintenant. {analysisRequestedAt?'Dernier calcul : '+new Date(analysisRequestedAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'}):''}</p></div>
<button onClick={()=>setAnalysisNonce(v=>v+1)} disabled={analysisRunning||!data.next} style={{cursor:analysisRunning?'wait':'pointer',border:0,borderRadius:12,padding:'13px 23px',fontWeight:900,background:analysisRunning?'#45657e':'linear-gradient(110deg,#2079fe,#1bc3e8)',color:'white',boxShadow:'0 0 24px #2079fe55'}}>{analysisRunning?'Analyse en cours…':'▶ Relancer les chiffres, esti !'}</button>
</section>
<div style={{marginTop:16,fontSize:13,color:'#b7cee1'}}>Rapports officiels NFL : <a href="https://www.nfl.com/injuries/" target="_blank" rel="noreferrer" style={{color:'#7ac9ff',textDecoration:'underline'}}>Vérifier les blessures et joueurs inactifs sur NFL.com ↗</a>. Notre flux automatisé ESPN ne remplace pas la confirmation officielle.</div>
<section style={{marginTop:22}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:14}}><h2 style={{fontSize:25,margin:0}}>🏥 L’INFIRMERIE : QUI EST AMOCHÉ DES DEUX BORDS ?</h2><span style={{fontSize:12,color:'#adc7d8'}}>ESPN · {pregame?.fetchedAt?new Date(pregame.fetchedAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'}):'Données en attente'} · Les inactifs officiels restent à confirmer</span></div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,420px),1fr))',gap:18}}>
{[data.next?.away_team_id,data.next?.home_team_id].filter((t):t is string=>Boolean(t)).map(t=>{
const r=pregame?.reports?.find(x=>x.team===t);
const primary=teams[t]?.[1]||'#17436a',accent=teams[t]?.[2]||'#8a9caa';
return <div key={t} style={{borderRadius:20,overflow:'hidden',border:'1px solid '+accent,background:'linear-gradient(155deg,'+primary+'e8 0%,#0c182b 78%)',boxShadow:'0 14px 42px #0005'}}>
<div style={{display:'flex',alignItems:'center',gap:15,padding:'19px 21px',background:'linear-gradient(95deg,'+primary+',#08152499)',borderBottom:'3px solid '+accent}}>
<img src={teamLogo(t)} alt={t} style={{height:70,width:70,objectFit:'contain',filter:'drop-shadow(0 2px 8px #0008)'}}/><div><div style={{fontSize:12,letterSpacing:2,color:'#e1eaf5'}}>RAPPORT DES BLESSURES</div><h3 style={{fontSize:23,margin:'5px 0',color:'#fff'}}>{teams[t]?.[0]||t}</h3><span style={{fontSize:12,color:'#d9e8f5'}}>{r? r.injuries.length+' joueur(s) signalé(s) · '+r.rosterCount+' dans l’effectif recensé':'Vérification en cours'}</span></div></div>
<div style={{padding:18}}>
{r?.projectedQB&&<div style={{display:'flex',alignItems:'center',gap:12,padding:13,border:'1px solid #ffffff50',background:'#07172e99',borderRadius:13,marginBottom:14}}>{r.projectedQB.photo&&<img src={r.projectedQB.photo} alt={r.projectedQB.name} style={{height:58,width:55,objectFit:'cover',borderRadius:8}}/>}<div><strong>QB projeté : {r.projectedQB.name}</strong><div style={{fontSize:12,color:'#b8d2e5',marginTop:3}}>Depth chart ESPN · titulaire non confirmé</div></div></div>}
{liveLoading&&!r?<p style={{color:'#cfe0f1'}}>Actualisation en cours…</p>:!r?<p style={{color:'#e0e6f0'}}>Statuts temporairement indisponibles.</p>:r.injuries.length?r.injuries.map((inj,idx)=>{
const stat=data.players.find(p=>p.team_id===t&&p.display_name.toLowerCase()===inj.name.toLowerCase());
return <article key={inj.name+idx} style={{display:'flex',gap:14,alignItems:'center',padding:'13px 10px',borderRadius:11,background:'#071625a8',marginBottom:10,border:'1px solid #ffffff26'}}>
{inj.photo?<img src={inj.photo} alt={inj.name} style={{width:76,height:83,objectFit:'cover',borderRadius:10,background:'#203955'}}/>:<div style={{width:76,height:83,display:'grid',placeItems:'center',background:'#213448',borderRadius:10,fontSize:24,fontWeight:800}}>{inj.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>}
<div style={{minWidth:0}}><strong style={{fontSize:16}}>{inj.name}</strong><div style={{fontSize:12,color:'#ffce9d',fontWeight:700,marginTop:4}}>{inj.status} · {inj.position||'Position non précisée'}</div>{inj.detail&&<div style={{fontSize:12,color:'#d7e5f0',marginTop:4}}>{inj.detail}</div>}
{stat&&<div style={{fontSize:12,color:'#9ed7ff',marginTop:6}}>Moy. {stat.history_games} matchs : {stat.position==='QB'?'Passe '+Number(stat.prior_passing_yards).toFixed(0)+' v':stat.position==='RB'?'Course '+Number(stat.prior_rushing_yards).toFixed(0)+' v':'Réception '+Number(stat.prior_receiving_yards).toFixed(0)+' v'} · {Number(stat.prior_targets).toFixed(1)} cibles</div>}</div>
</article>}):<p style={{padding:12,color:'#d4e2ed',background:'#07172599',borderRadius:11}}>{r.injuryFeedAvailable?'Aucun joueur signalé dans le flux ESPN à cette vérification.':'Rapport de blessures indisponible pour cette équipe; aucune absence ne peut être confirmée.'}</p>}
</div></div>})}
</div><p style={{fontSize:12,color:'#a9bdce',marginTop:12}}>Les Player Props continuent d’être utilisés dans le calcul du Top 5 ci-dessous; leur longue liste séparée a été retirée. Les blessures ESPN ne remplacent pas la liste officielle des inactifs NFL.</p>
</section>
<section style={{margin:'26px 0',padding:'22px',borderRadius:22,border:'1px solid #327dba',background:'linear-gradient(135deg,#092641,#071321)'}}>
 <span style={{fontSize:11,letterSpacing:3,color:'#89dbff',fontWeight:900}}>NFL STUDIO · PROCHAIN AFFRONTEMENT</span>
 <h2 style={{fontSize:'clamp(24px,3vw,36px)',margin:'9px 0',color:'#fff'}}>🏆 TOP 5 DES BOYS + LE GROS HEAVYBALL</h2>
 <p style={{color:'#b6d1e4',fontSize:13}}>Les quatre meilleures valeurs espérées disponibles et un Heavyball admissible à cote élevée. Un Heavyball n’est jamais inventé si aucun pari ne satisfait aux critères. Probabilités expérimentales, non calibrées.</p>
 {analysisRunning?<p>Les boys, on sort les chiffres… calcul du prochain match en cours.</p>:analysisError?<p style={{color:'#ffb4b4'}}>Analyse indisponible : {analysisError}</p>:!analysis?<p>Aucun calcul reçu pour cette rencontre.</p>:<>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:13,marginTop:20}}>
 {analysis.analysis.map((pick,i)=><article key={pick.market+'-'+pick.name+'-'+String(pick.point)+'-'+i} style={{border:'1px solid '+(pick.heavyball?'#f4b64b':'#3576a6'),borderRadius:16,padding:17,background:pick.heavyball?'linear-gradient(140deg,#573a1c,#171b2b)':'linear-gradient(140deg,#173b59,#0a192b)',boxShadow:pick.heavyball?'0 0 23px #db963633':'0 8px 22px #0004'}}>
 <div style={{fontSize:11,letterSpacing:1.6,color:pick.heavyball?'#ffd17c':'#93dbff',fontWeight:900}}>{pick.heavyball?'🔥 HEAVYBALL · CORONES SUR LE SYNTHÉTIQUE':'#'+(i+1)+' · '+pick.market.toUpperCase()}</div>
 <h3 style={{fontSize:20,margin:'12px 0',color:'#fff'}}>{pick.player||pick.name}{typeof pick.point==='number'?' · '+pick.point:''}</h3>
 <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><span>Cote <b>{pick.decimal.toFixed(2)}</b></span><span>Modèle <b>{(pick.probability*100).toFixed(1)} %</b></span></div>
 <div style={{marginTop:10,fontSize:17,color:pick.expected_value>0?'#5cf7b7':'#ffc19a',fontWeight:900}}>EV théorique : {pick.expected_value>=0?'+':''}{(pick.expected_value*100).toFixed(1)} %</div>
 <div style={{fontSize:12,marginTop:10,color:'#c4d7e7'}}>{pick.angle||'Performance récente du joueur et fréquence historique lissée; faible échantillon.'}</div>
 <div style={{fontSize:11,marginTop:11,color:'#f6d8a3'}}>{pick.heavyball?'Un long shot pour des corones en titane… mais ça peut planter en maudit.':'Projection exploratoire : un avantage calculé n’est pas un gain garanti.'}</div>
 <div style={{fontSize:10,marginTop:8,color:'#9fbdd1'}}>Source des cotes : {pick.book}</div><button onClick={()=>openPick(pick)} style={{width:'100%',marginTop:13,padding:12,border:'1px solid #83e9ff',borderRadius:10,fontWeight:950,color:'#021525',background:'linear-gradient(110deg,#51f0b1,#51bbff)',boxShadow:'0 0 18px #2db1fa66',cursor:'pointer'}}>Gros, fais pas ton peureux, clic icitte →</button>
 </article>)}
 </div>
 {!analysis.analysis.some(p=>p.heavyball)&&<p style={{marginTop:15,color:'#ffd39b'}}>🔥 Aucun Heavyball à cote de 3,00 ou plus avec une EV positive calculée pour ce match. On n’invente pas un pari pour remplir la case.</p>}
 </>}
 </section>

 <p style={{color:'#7e99ac',fontSize:12,marginTop:20}}>Rapport automatiquement rédigé à partir de résultats historiques et d’effectifs recensés. Toute information non confirmée est signalée. Actualisé : {new Date(data.updatedAt).toLocaleString('fr-CA',{timeZone:'America/Toronto'})}.</p>
 </>}
 {chosenPick&&<div role="presentation" onClick={()=>CHOOSE_PICK(null)} style={{position:'fixed',inset:0,zIndex:99999,background:'#020812e8',backdropFilter:'blur(13px)',display:'grid',placeItems:'center',padding:18}}><div role="dialog" aria-modal="true" aria-label="Ajouter le pari au suivi" onClick={e=>e.stopPropagation()} style={{width:'min(500px,100%)',padding:25,borderRadius:19,background:'linear-gradient(145deg,#154775,#09182e)',border:'1px solid #70d4ff',boxShadow:'0 0 60px #168bdc66'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12}}><h2 style={{margin:0}}>🏈 BON, ON MISE COMBIEN LE GROS ?</h2><button onClick={()=>CHOOSE_PICK(null)} aria-label="Fermer" style={{fontSize:20,cursor:'pointer'}}>✕</button></div>
 <p style={{fontSize:17,fontWeight:800}}>{chosenPick.player||chosenPick.name}{typeof chosenPick.point==='number'?' · '+chosenPick.point:''}</p><p>Cote repérée : {chosenPick.decimal.toFixed(2)} · {chosenPick.book}</p>
 <div style={{display:'flex',gap:15,flexWrap:'wrap'}}><label>Cote réelle au moment de miser<input value={entryOdds} onChange={e=>ENTRY_ODDS(e.target.value)} type="number" step="0.01" min="1.01" style={{display:'block',width:150,padding:10,borderRadius:7,color:'#101a28'}}/></label><label>Mise ($ CAD)<input value={entryStake} onChange={e=>ENTRY_STAKE(e.target.value)} type="number" step="0.50" min="0.01" style={{display:'block',width:150,padding:10,borderRadius:7,color:'#101a28'}}/></label></div>
 <p>Profit potentiel : {Number(entryOdds)>1&&Number(entryStake)>0?(Number(entryStake)*(Number(entryOdds)-1)).toFixed(2)+' 
:'—'}</p>
 {entryError&&<p style={{color:'#ffc1ae'}}>{entryError}</p>}
 <button onClick={recordPick} style={{width:'100%',padding:14,border:0,borderRadius:10,background:'linear-gradient(110deg,#4dedac,#39aaff)',fontSize:16,fontWeight:950,color:'#041425',cursor:'pointer'}}>C’EST DANS MES PARIS EN COURS, ESTI !</button>
 <p style={{fontSize:12,color:'#b6ccdf'}}>Le pari est enregistré localement, dans le même suivi que les billets du Top paris.</p>
 </div></div>}
 </main>
}
