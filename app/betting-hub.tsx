'use client';
import {useEffect,useMemo,useState} from 'react';
type Offer={id:string;game:string;market:string;selection:string;line?:number;book:string;odds:number;prob:number;team:string;player?:string;playerImage?:string;playerTeam?:string};
type Bet=Offer&{stake:number;chosenOdds:number;placedAt:string;status:'open'|'won'|'lost'|'void';resultConfirmedAt?:string};
const fmt=(n:number)=>n.toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
const decimal=(n:number)=>n>0?1+n/100:n<0?1+100/Math.abs(n):0;
const STORE='nfl-studio-bets-v1';
const heroTag=(v:'top'|'live'|'history')=>v==='top'?'TOP PARIS':v==='live'?'PARIS EN COURS':'BILAN DE SAISON';
const logo=(abbr:string)=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+(abbr==='LA'?'lar':abbr==='WAS'?'wsh':abbr.toLowerCase())+'.png';
const teamCodes:Record<string,string>={'Buffalo Bills':'BUF','Las Vegas Raiders':'LV','Detroit Lions':'DET','Kansas City Chiefs':'KC','Dallas Cowboys':'DAL','Philadelphia Eagles':'PHI','Green Bay Packers':'GB','San Francisco 49ers':'SF','Baltimore Ravens':'BAL','Cincinnati Bengals':'CIN','New York Giants':'NYG','New England Patriots':'NE','Minnesota Vikings':'MIN','Chicago Bears':'CHI','Houston Texans':'HOU','Seattle Seahawks':'SEA','New York Jets':'NYJ','Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Carolina Panthers':'CAR','Cleveland Browns':'CLE','Denver Broncos':'DEN','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAX','Los Angeles Chargers':'LAC','Los Angeles Rams':'LA','Miami Dolphins':'MIA','New Orleans Saints':'NO','Pittsburgh Steelers':'PIT','Tampa Bay Buccaneers':'TB','Tennessee Titans':'TEN','Washington Commanders':'WAS'};
const teamFrom=(s:string)=>Object.entries(teamCodes).find(([name])=>s.includes(name))?.[1];
const teamSides=(s:string)=>s.split(' vs ').map(teamFrom).filter((v):v is string=>Boolean(v));
export default function BettingHub({view}:{view:'top'|'live'|'history'}){
 const [offers,setOffers]=useState<Offer[]>([]),[loaded,LOADED]=useState(false),[bets,BETS]=useState<Bet[]>([]);
 const [category,CATEGORY]=useState<'general'|'moneyline'|'spreads'|'totals'|'props'|'heavy'>('general');
 const [selected,SELECT]=useState<Offer|null>(null);
 const [odd,ODD]=useState(''),[stake,STAKE]=useState('5');
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(v))BETS(v)}catch{}},[]);
 const save=(v:Bet[])=>{BETS(v);try{localStorage.setItem(STORE,JSON.stringify(v))}catch{}};
 useEffect(()=>{let active=true;LOADED(false);fetch('/api/odds').then(r=>r.json()).then(d=>{
 const out:Offer[]=[];
 for(const g of d.games||[]){const game=g.away_team+' vs '+g.home_team;
 for(const b of g.bookmakers||[])for(const m of b.markets||[])for(const o of m.outcomes||[]){
 const odds=decimal(Number(o.price));if(odds<=1||!Number.isFinite(odds))continue;
 const market=m.key==='h2h'?'moneyline':m.key==='spreads'?'spreads':m.key==='totals'?'totals':m.key.startsWith('player_')?'props':'';
 if(!market)continue;const selection=market==='props'?String(o.description||o.name)+' · '+m.key+' '+(o.point??''):market==='moneyline'?'Victoire · '+o.name:market==='spreads'?o.name+' '+o.point:o.name+' '+o.point+' points';
 out.push({id:[game,market,o.name,o.point??''].join('|'),game,market,selection,line:o.point,odds,prob:1/odds,book:b.title,team:o.name,player:market==='props'?String(o.description||''):undefined,playerImage:typeof o.player_image==='string'?o.player_image:undefined,playerTeam:typeof o.team==='string'?o.team:undefined});
 }}
 const best=new Map<string,Offer>();for(const x of out){const older=best.get(x.id);if(!older||x.odds>older.odds)best.set(x.id,x)}
 if(active){setOffers([...best.values()]);LOADED(true)}
 }).catch(()=>{if(active)LOADED(true)});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;fetch('/api/player-props').then(r=>r.json()).then(data=>{if(!active||!Array.isArray(data.offers))return;setOffers(previous=>{const map=new Map(previous.map(o=>[o.id,o]));for(const prop of data.offers){if(prop.market==='props'&&Number(prop.odds)>1)map.set(prop.id,prop as Offer)}return [...map.values()]})}).catch(()=>{});return()=>{active=false}},[]);
 const [official,SET_OFFICIAL]=useState<Array<{away_team?:string;home_team?:string;home_probability?:number|null;away_probability?:number|null}>>([]);
 useEffect(()=>{let active=true;fetch('/api/expert-independent',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)SET_OFFICIAL(Array.isArray(d.report?.rows)?d.report.rows:[])}).catch(()=>{});return()=>{active=false}},[]);
 const [research,SET_RESEARCH]=useState<Record<string,{probability:number;explanation:string}>>({});
 useEffect(()=>{let alive=true;fetch('/api/expert-prop-research',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(!alive)return;const map:Record<string,{probability:number;explanation:string}>={};
  for(const row of data.evaluations||[]){if(row.experimental===true&&typeof row.probability==='number'&&row.probability>=0&&row.probability<=1){
   const o=row.offer||{};const key=[o.player,o.market,o.line,String(o.selection).toLowerCase()].join('|').toLowerCase();
   map[key]={probability:row.probability,explanation:String(row.explanation||'Simulation experimentale non validee')};
  }}SET_RESEARCH(map);
 }).catch(()=>{});return()=>{alive=false}},[]);
 const researchValue=(o:Offer)=>{
  const parts=o.selection.split(' · ');
  const market=parts[parts.length-1]||'';
  const direction=/\bover\b/i.test(o.selection)?'over':/\bunder\b/i.test(o.selection)?'under':'';
  return research[[o.player,market,o.line,direction].join('|').toLowerCase()]||null;
 };
 const officialProbability=(o:Offer):number|null=>{
  if(o.market!=='moneyline')return null;
  const sides=teamSides(o.game);
  const row=official.find(g=>sides.includes(String(g.home_team))&&sides.includes(String(g.away_team)));
  if(!row)return null;
  const selected=teamFrom(o.team);
  const prob=selected===row.home_team?row.home_probability:selected===row.away_team?row.away_probability:null;
  return typeof prob==='number'?prob:null;
 };
 const ranking=useMemo(()=>{
 const relevant=offers.filter(o=>{
  if(category==='props')return o.market==='props'&&researchValue(o)!==null;
  if(category==='general')return (o.market==='moneyline'&&officialProbability(o)!==null)||(o.market==='props'&&researchValue(o)!==null);
  return o.market==='moneyline'&&category==='moneyline'&&officialProbability(o)!==null;
 });
 return relevant.sort((a,b)=>(researchValue(b)?.probability??officialProbability(b)??0)-(researchValue(a)?.probability??officialProbability(a)??0)).slice(0,5);
 },[category,offers,official,research]);
 const choose=(v:Offer)=>{SELECT(v);ODD(fmt(v.odds).replace(',','.'));STAKE('5')};
 const add=()=>{if(!selected)return;const d=Number(odd.replace(',','.')),s=Number(stake.replace(',','.'));if(!Number.isFinite(d)||d<=1||!Number.isFinite(s)||s<=0)return;save([{...selected,chosenOdds:d,stake:s,placedAt:new Date().toISOString(),status:'open'},...bets]);SELECT(null)};
 const update=(idx:number,status:Bet['status'])=>{const next=bets.map((x,i)=>i===idx?{...x,status,resultConfirmedAt:new Date().toISOString()}:x);save(next)};
 const wins=bets.filter(x=>x.status==='won').reduce((s,b)=>s+b.stake*(b.chosenOdds-1),0);
 const losses=bets.filter(x=>x.status==='lost').reduce((s,b)=>s+b.stake,0);
 const pending=bets.filter(x=>x.status==='open');
 const total=bets.reduce((s,x)=>s+x.stake,0);
 const profit=wins-losses;
 const settled=bets.filter(b=>b.status==='won'||b.status==='lost').sort((a,b)=>Date.parse(a.resultConfirmedAt||a.placedAt)-Date.parse(b.resultConfirmedAt||b.placedAt));
 const won=bets.filter(b=>b.status==='won').length,lost=bets.filter(b=>b.status==='lost').length;
 const settledStake=settled.reduce((s,b)=>s+b.stake,0);
 const roi=settledStake?100*profit/settledStake:0;
 const curve=settled.reduce<number[]>((arr,b)=>[...arr,arr[arr.length-1]+(b.status==='won'?b.stake*(b.chosenOdds-1):-b.stake)],[0]);
 const lo=Math.min(0,...curve),hi=Math.max(1,...curve),span=hi-lo||1;
 const coords=curve.map((n,i)=>[20+(i/(Math.max(1,curve.length-1)))*560,155-(n-lo)/span*120] as const);
 const curvePath=coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const mix=Object.entries(bets.reduce<Record<string,{count:number;profit:number;stake:number}>>((a,b)=>{const k=b.market||'autres';const p=a[k]||{count:0,profit:0,stake:0};p.count++;if(b.status==='won'){p.profit+=b.stake*(b.chosenOdds-1);p.stake+=b.stake}else if(b.status==='lost'){p.profit-=b.stake;p.stake+=b.stake}a[k]=p;return a},{})).sort((a,b)=>b[1].profit-a[1].profit);

 return <section className="panel" style={{marginTop:16}}>
 <div className={'studio-hero '+(view==='top'&&category==='heavy'?'heavy-hero':'')}><div className="studio-stadium-lights" aria-hidden="true"><span/><span/><span/><span/></div><div className="studio-goalposts" aria-hidden="true"/><div className="studio-hero-inner">{view==='top'&&category==='heavy'?<><div className="heavy-emblem"><span className="heavy-overline">GROS RISQUES · GROS GAINS</span><span>HEAVY</span><strong>BALLS</strong><div className="metal-orbs"><i/><i/></div><div className="heavy-turf" aria-hidden="true"/><div className="heavy-stars" aria-hidden="true">✦ &nbsp; ★ &nbsp; ✦</div><small>ON LES DÉPOSE SUR LE SYNTHÉTIQUE</small></div></>:<><span className="studio-kicker">✦ NFL STUDIO · SAISON 2026</span><div className="studio-hero-title">{view==='top'?'TOP PARIS':view==='live'?'MES PARIS EN COURS':'BILAN DE SAISON'}</div><div className="studio-hero-rule" aria-hidden="true"><span>★</span></div><p>{view==='top'?'Nos cinq angles à examiner, par catégorie':view==='live'?'Toutes tes mises, tes retours potentiels et leur statut':'Ton historique de paris et tes résultats en dollars canadiens'}</p></>}</div></div>
 <h2 style={{fontSize:28,marginBottom:8,display:'none'}}>{view==='top'?'🏆 TOP PARIS · SEMAINE NFL':view==='live'?'🎯 PARIS EN COURS':'📊 BILAN DE SAISON'}</h2>
 {view==='top'?<><p className="muted">Cotes de bookmakers disponibles dans le cache partagé. Les pourcentages ci-dessous sont les probabilités implicites des cotes, pas les probabilités calculées par un modèle calibré. Les Player Props affichés sont des simulations exploratoires non calibrées : PASSER, pas de recommandation de mise.</p>
 <div className="market-tabs" role="tablist" aria-label="Catégories de paris">{[['general','🏆 Top 5 général'],['moneyline','🏈 Moneyline'],['spreads','↔ Spreads'],['totals','📈 Totaux'],['props','▥ Props joueurs'],['heavy','🔥 HEAVY BALLS']].map(([k,v])=><button key={k} role="tab" aria-selected={category===k} className={category===k?'selected':''} onClick={()=>CATEGORY(k as typeof category)}>{v}</button>)}</div>
 {!loaded?<p>Chargement des cotes…</p>:ranking.length===0?<div className="empty">Aucune sélection vérifiée dans cette catégorie actuellement. Aucun Top 5 inventé.</div>:<div className="studio-picks-grid">{ranking.map((o,i)=><article key={o.id} className={'studio-pick-card pick-'+i+(category==='heavy'?' heavy-pick':'')}><span className="pick-rank">#{i+1}</span><span className="pick-market">{category==='heavy'?'HEAVY BALLS':o.market.toUpperCase()}</span><div className={"pick-art"+(o.market==="props"?" player-prop-art":"")}><div className="pick-spotlights" aria-hidden="true"/>{o.market==="props"?<div className="player-feature"><div className="player-electric" aria-hidden="true"/>{o.playerImage&&o.playerImage.startsWith("https://")?<img className="player-action-image" src={o.playerImage} alt={o.player||"Joueur NFL"}/>:<div className="player-photo-unavailable">PHOTO EN ATTENTE</div>}<div className="player-feature-name">{o.player||"Joueur NFL"}</div>{o.playerTeam&&teamFrom(o.playerTeam)&&<img className="player-team-logo" src={logo(teamFrom(o.playerTeam)!)} alt={"Logo "+o.playerTeam}/>}</div>:null}{teamFrom(o.team)?<img src={logo(teamFrom(o.team)!)} alt={o.team}/>:<span>🏈</span>}<div className="pick-field-lines" aria-hidden="true"/>{teamSides(o.game).length===2&&<div className="pick-versus"><img src={logo(teamSides(o.game)[0])} alt=""/><b>VS</b><img src={logo(teamSides(o.game)[1])} alt=""/></div>}</div><p className="pick-game">{o.game}</p><div className="pick-book">{o.book} · cote observée</div><h3>{o.selection}</h3><div className="pick-metrics"><div><small>COTE</small><strong>{fmt(o.odds)}</strong></div><div><small>EXPERT NFL</small><strong>{researchValue(o)!==null?Math.round(researchValue(o)!.probability*100)+'% exp.':officialProbability(o)!==null?Math.round(officialProbability(o)!*100)+'%':'—'}</strong></div></div><p style={{fontSize:12,color:'#c3d4e6',minHeight:54}}>{category==='heavy'?'Grosse cote, risque élevé : sélection classée par paiement potentiel, pas par valeur prédictive.':researchValue(o)?.explanation||'Probabilité brute EXPERT NFL · Décision PASSER tant que la recommandation officielle est indisponible.'}</p><button className="pick-action" onClick={()=>choose(o)}>Voir ce pari →</button></article>)}</div>}
 {selected&&<div className="bet-entry-sheet" role="dialog" aria-label="Enregistrer un pari"><div className="bet-entry-head"><span>✦ BILLET DE PARI</span><button aria-label="Fermer" onClick={()=>SELECT(null)}>✕</button></div><h3>Confirmer un pari pris sur Mise-o-jeu</h3><p>{selected.game} · {selected.selection}</p><div className="bet-entry-mark"><span>🏈 Cote bookmaker : {fmt(selected.odds)}</span><span>Source : {selected.book}</span></div><div style={{display:'flex',gap:15,flexWrap:'wrap'}}><label>Cote décimale réelle <input type="number" min="1.01" step="0.01" value={odd} onChange={e=>ODD(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label><label>Mise CAD <input type="number" min="0.01" step="0.5" value={stake} onChange={e=>STAKE(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label></div><p>Probabilité implicite recalculée : {Number(odd.replace(',','.'))>1?fmt(100/Number(odd.replace(',','.')))+' %':'—'} · Profit si gagnant : {Number(odd.replace(',','.'))>1&&Number(stake)>0?fmt(Number(stake)*(Number(odd.replace(',','.'))-1))+' $ CAD':'—'}</p><p className="muted">Changer la cote ne change pas la probabilité réelle calculée du joueur ou de l'équipe. Cela change la valeur et le rendement du pari.</p><button onClick={add} style={{padding:12,border:0,borderRadius:9,background:'#37cb9c',fontWeight:800,cursor:'pointer'}}>Enregistrer dans Paris en cours</button> <button onClick={()=>SELECT(null)} style={{padding:12,cursor:'pointer'}}>Annuler</button></div>}
 </>:<><div className="studio-bet-kpis kpis"><div>💳 Mises enregistrées<strong>{fmt(total)} $ CAD</strong></div><div>📈 Profit réalisé net<strong style={{color:profit>=0?'#52dfb0':'#ff9ca2'}}>{fmt(profit)} $ CAD</strong></div><div>🏆 Gain potentiel brut<strong>{fmt(pending.reduce((s,x)=>s+x.stake*x.chosenOdds,0))} $ CAD</strong></div><div>🎯 Paris enregistrés<strong>{bets.length}</strong></div></div>{view==='history'&&<div className="season-analytics">
 <div className="season-chart"><h3>📈 Évolution des gains nets</h3><div className="season-big">{profit>=0?'+':''}{fmt(profit)} $ CAD</div><p>Résultat cumulé des {settled.length} paris terminés · ROI {roi.toFixed(1)} %</p><svg viewBox="0 0 600 182" role="img" aria-label="Évolution des profits cumulés, calculée sur les paris enregistrés"><defs><linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#42f5b0" stopOpacity=".35"/><stop offset="1" stopColor="#42f5b0" stopOpacity="0"/></linearGradient></defs>{[35,75,115,155].map(y=><line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#42637d" strokeDasharray="5 7" opacity=".5"/>)}<path d={curvePath+' L '+coords[coords.length-1][0]+' 170 L 20 170 Z'} fill="url(#profitFill)"/><path d={curvePath} stroke={profit>=0?'#48f0aa':'#ff6689'} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round"/><circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="6" fill="#fff" stroke="#48f0aa" strokeWidth="3"/></svg></div>
 <div className="season-results"><h3>🎯 Répartition des résultats</h3><div className="season-ring" style={{background:won+lost?'conic-gradient(#40df9d 0 '+(won/(won+lost)*100)+'%,#f45b77 '+(won/(won+lost)*100)+'% 100%)':'conic-gradient(#1e445f 0 100%)'}}><div><strong>{won+lost}</strong><small>terminés</small></div></div><div className="season-legend"><span>🟢 Gagnés <strong>{won}</strong></span><span>🔴 Perdus <strong>{lost}</strong></span><span>Réussite <strong>{won+lost?((won/(won+lost))*100).toFixed(1):'—'}%</strong></span></div></div>
 <div className="season-markets"><h3>🏆 Résultats par marché</h3>{mix.length?mix.map(([name,s])=><div key={name} className="season-market-row"><b>{name==='moneyline'?'Moneyline':name==='spreads'?'Spreads':name==='totals'?'Totaux':name==='props'?'Props joueurs':name}</b><span>{s.count} paris</span><strong style={{color:s.profit>=0?'#45e6a2':'#ff7187'}}>{s.profit>=0?'+':''}{fmt(s.profit)} $</strong></div>):<p>Les performances par marché apparaîtront dès qu'un pari sera enregistré.</p>}</div>
 </div>}
 <p className="muted">Suivi local à ce navigateur. Les mises ne sont pas transmises à Mise-o-jeu. Résultats à confirmer manuellement pour le moment; ce n'est pas encore un suivi des matchs en direct.</p>{(view==='live'?bets.map((b,i)=>({...b,idx:i})).filter(b=>b.status==='open'):bets.map((b,i)=>({...b,idx:i}))).length?<div style={{display:'grid',gap:10}}>{bets.map((b,i)=>({...b,idx:i})).filter(b=>view==='history'||b.status==='open').map(b=><div key={b.idx} className={'live-bet-row status-'+b.status}><div className="bet-side-art">{teamFrom(b.team)?<img src={logo(teamFrom(b.team)!)} alt={b.team}/>:<span>🏈</span>}</div><div className="bet-row-content"><strong>{b.selection}</strong><p style={{margin:'4px 0',fontSize:13}}>{b.game} · Mise {fmt(b.stake)} $ · Cote {fmt(b.chosenOdds)} · <span className="bet-status">{b.status==='open'?'EN COURS':b.status==='won'?'✓ GAGNÉ':b.status==='lost'?'✕ PERDU':'ANNULÉ'}</span></p><div className="bet-row-return">Retour potentiel <strong>{fmt(b.stake*b.chosenOdds)} $</strong></div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{b.status==='open'&&<><button onClick={()=>update(b.idx,'won')}>Marquer gagné</button><button onClick={()=>update(b.idx,'lost')}>Marquer perdu</button><button onClick={()=>update(b.idx,'void')}>Annulé</button></>}</div></div></div>)}</div>:<p className="empty">Aucun pari enregistré.</p>}</>}
 </section>
}
