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
 const [showBetForm,SHOW_BET_FORM]=useState(false);
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
 out.push({id:[game,market,o.name,o.point??'',market==='props'?o.description||'':''].join('|'),game,market,selection,line:o.point,odds,prob:1/odds,book:b.title,team:o.name,player:market==='props'?String(o.description||''):undefined,playerImage:typeof o.player_image==='string'?o.player_image:undefined,playerTeam:typeof o.team==='string'?o.team:undefined});
 }}
 const best=new Map<string,Offer>();for(const x of out){const older=best.get(x.id);if(!older||x.odds>older.odds)best.set(x.id,x)}
 if(active){setOffers([...best.values()]);LOADED(true)}
 }).catch(()=>{if(active)LOADED(true)});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;fetch('/api/player-props').then(r=>r.json()).then(data=>{if(!active||!Array.isArray(data.offers))return;setOffers(previous=>{const map=new Map(previous.map(o=>[o.id,o]));for(const prop of data.offers){if(prop.market==='props'&&Number(prop.odds)>1)map.set(prop.id,prop as Offer)}return [...map.values()]})}).catch(()=>{});return()=>{active=false}},[]);
 const [official,SET_OFFICIAL]=useState<Array<{away_team?:string;home_team?:string;home_probability?:number|null;away_probability?:number|null}>>([]);
 useEffect(()=>{let active=true;fetch('/api/expert-independent',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)SET_OFFICIAL(Array.isArray(d.report?.rows)?d.report.rows:[])}).catch(()=>{});return()=>{active=false}},[]);
 const [research,SET_RESEARCH]=useState<Record<string,{probability:number;explanation:string}>>({});
 const [researchStatus,SET_RESEARCH_STATUS]=useState('chargement');
 useEffect(()=>{let alive=true;fetch('/api/expert-prop-research',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(!alive)return;SET_RESEARCH_STATUS(String(data.status||'inconnu'));const map:Record<string,{probability:number;explanation:string}>={};
  for(const row of data.evaluations||[]){if(row.experimental===true&&typeof row.probability==='number'&&row.probability>=0&&row.probability<=1){
   const o=row.offer||{};const market=String(o.selection||'').split(' · ').pop()||'';const direction=/\bover\b/i.test(String(o.selection))?'over':/\bunder\b/i.test(String(o.selection))?'under':'';const key=[o.player,market,o.line,direction].join('|').toLowerCase();
   map[key]={probability:row.probability,explanation:String(row.explanation||'Simulation experimentale non validee')};
  }}SET_RESEARCH(map);
 }).catch(()=>{if(alive)SET_RESEARCH_STATUS('indisponible')});return()=>{alive=false}},[]);
 const researchValue=(o:Offer)=>{
  const parts=o.selection.split(' · ');
  const market=parts[parts.length-1]||'';
  const direction=/\bover\b/i.test(o.selection)?'over':/\bunder\b/i.test(o.selection)?'under':'';
  return research[[o.player,market,o.line,direction].join('|').toLowerCase()]||null;
 };
 const [gameResearchLoading,SET_GAME_RESEARCH_LOADING]=useState(true);
 const [gamesResearch,SET_GAMES_RESEARCH]=useState<Record<string,{home_win_probability:number;away_win_probability:number;projected_margin:number;projected_total:number;spread_sd:number;total_sd:number;explanation:string}>>({});
 useEffect(()=>{let active=true;SET_GAME_RESEARCH_LOADING(true);fetch('/api/odds').then(r=>r.json()).then(async d=>{
  const events=(d.games||[]).filter((g:{commence_time:string})=>Date.parse(g.commence_time)>Date.now()).slice(0,16);
  // Limit parallel research requests to avoid function saturation on Hobby deployments.
  const data:Array<{key:string;value:any}|null>=[];
  for(let i=0;i<events.length&&active;i+=3){
   const batch=await Promise.all(events.slice(i,i+3).map(async(g:{home_team:string;away_team:string;commence_time:string})=>{
    const home=teamCodes[g.home_team],away=teamCodes[g.away_team];if(!home||!away)return null;
    try{const p=new URLSearchParams({home,away,before:g.commence_time});const r=await fetch('/api/expert-game-research?'+p,{cache:'no-store'});if(!r.ok)return null;const x=await r.json();return x.status==='experimental_unvalidated'?{key:g.away_team+' vs '+g.home_team,value:x}:null}catch{return null}
   }));
   data.push(...batch);
   if(active)SET_GAMES_RESEARCH(Object.fromEntries(data.filter((x):x is {key:string;value:any}=>Boolean(x)).map(x=>[x.key,x.value])));
  }

  if(active)SET_GAME_RESEARCH_LOADING(false);
 }).catch(()=>{if(active)SET_GAME_RESEARCH_LOADING(false)});return()=>{active=false}},[]);
 const gameProjection=(o:Offer):number|null=>{
  const g=gamesResearch[o.game];if(!g)return null;
  const home=teamSides(o.game)[1],chosen=teamFrom(o.team);
  if(o.market==='moneyline')return !chosen?null:chosen===home?g.home_win_probability:g.away_win_probability;
  if(o.market==='spreads'&&Number.isFinite(Number(o.line))&&chosen){const teamMargin=chosen===home?g.projected_margin:-g.projected_margin;const z=(teamMargin+Number(o.line))/g.spread_sd;return Math.max(0,Math.min(1,0.5*(1+Math.tanh(z*0.79788456*(1+0.044715*z*z)))));}
  if(o.market==='totals'&&Number.isFinite(Number(o.line))){const z=(g.projected_total-Number(o.line))/g.total_sd;const above=Math.max(0,Math.min(1,0.5*(1+Math.tanh(z*0.79788456*(1+0.044715*z*z)))));return /under/i.test(o.selection)?1-above:above;}
  return null;
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
 const family=category==='spreads'?'spreads':category==='totals'?'totals':category==='props'?'props':category==='moneyline'?'moneyline':null;
 const probability=(o:Offer)=>officialProbability(o)??(o.market==='props'?researchValue(o)?.probability??null:gameProjection(o));
 const eligible=offers.filter(o=>{const p=probability(o);return p!==null&&Number.isFinite(p)&&p>0&&p<1&&Number.isFinite(o.odds)&&o.odds>1&&(!family||o.market===family)&&(category!=='heavy'||o.odds>=3)});
 const edge=(o:Offer)=>probability(o)!*o.odds-1;
 const ordered=eligible.sort((a,b)=>edge(b)-edge(a));
 const selected:Offer[]=[],seen=new Set<string>();
 for(const o of ordered){
  const key=[o.game,o.market,o.selection].join('|');
  if(seen.has(key))continue;
  
  seen.add(key);selected.push(o);
  if(selected.length>=5)break;
 }
 return selected;
 },[category,offers,official,research,gamesResearch]);
 const reasoning=(o:Offer,rank:number)=>{
  const officialP=officialProbability(o);
  const prop= o.market==='props'?researchValue(o):null;
  const game=gamesResearch[o.game];
  const p=officialP??(o.market==='props'?prop?.probability??null:gameProjection(o));
  if(p===null||!Number.isFinite(p))return 'Probabilité du modèle indisponible : classement impossible.';
  const implied=100/o.odds,edge=100*(p-1/o.odds),ev=100*(p*o.odds-1);
  const kind=o.market==='moneyline'?'victoire':o.market==='spreads'?'écart de points':o.market==='totals'?'total de points':'performance du joueur';
  const basis=officialP!==null?'rapport indépendant EXPERT NFL':o.market==='props'?'simulation sur les matchs précédents du joueur':'projection des scores récents des équipes, avec ajustement QB lorsque disponible';
  const detail=o.market==='props'&&prop?' Projection basée sur son historique personnel.':game&&o.market!=='props'?' Marge projetée : '+game.projected_margin.toFixed(1)+' point(s), total projeté : '+game.projected_total.toFixed(1)+' point(s).':'';
  return 'Rang #'+rank+' : pour ce pari '+kind+', le bookmaker implique '+implied.toFixed(1)+' % de réussite, contre '+(100*p).toFixed(1)+' % selon notre '+basis+'. Écart estimé : '+(edge>=0?'+':'')+edge.toFixed(1)+' points; rendement espéré théorique : '+(ev>=0?'+':'')+ev.toFixed(1)+' % par dollar misé.'+detail+(officialP===null?' Estimation expérimentale, non validée : cet avantage peut être trompeur.':'');
 };
 const choose=(v:Offer)=>{SELECT(v);SHOW_BET_FORM(false);ODD(fmt(v.odds).replace(',','.'));STAKE('5')};
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
 <div className={'studio-hero '+(view==='top'&&category==='heavy'?'heavy-hero':'')}><div className="studio-stadium-lights" aria-hidden="true"><span/><span/><span/><span/></div><div className="studio-goalposts" aria-hidden="true"/><div className="studio-hero-inner">{view==='top'&&category==='heavy'?<><div className="heavy-emblem"><span className="heavy-overline">GROS RISQUES · GROS GAINS</span><span>HEAVY</span><strong>BALLS</strong><div className="metal-orbs"><i/><i/></div><div className="heavy-turf" aria-hidden="true"/><div className="heavy-stars" aria-hidden="true">✦ &nbsp; ★ &nbsp; ✦</div><small>ON LES DÉPOSE SUR LE SYNTHÉTIQUE</small></div></>:<><span className="studio-kicker">✦ NFL STUDIO · SAISON 2026</span><div className="studio-hero-title">{view==='top'?'TOP PARIS':view==='live'?'MES PARIS EN COURS':'BILAN DE SAISON'}</div><div className="studio-hero-rule" aria-hidden="true"><span>★</span></div><p>{view==='top'?'Meilleurs angles disponibles, avec diversification entre marchés et matchs':view==='live'?'Toutes tes mises, tes retours potentiels et leur statut':'Ton historique de paris et tes résultats en dollars canadiens'}</p></>}</div></div>
 <h2 style={{fontSize:28,marginBottom:8,display:'none'}}>{view==='top'?'🏆 TOP PARIS · SEMAINE NFL':view==='live'?'🎯 PARIS EN COURS':'📊 BILAN DE SAISON'}</h2>
 {view==='top'?<><p className="muted">Aucune recommandation officielle EXPERT NFL : moteur complet non exécuté. Marchés observés chez les bookmakers. Top 5 exploratoire calculé avec les cotes et les statistiques disponibles. Probabilités expérimentales clairement identifiées; un rapport indépendant vérifié reste prioritaire. Tu choisis librement tes paris. Sans validation de la probabilité et de l’avantage, décision : PASSER.</p>
 <div className="market-tabs" role="tablist" aria-label="Catégories de paris">{[['general','🏆 Top 5 général'],['moneyline','🏈 Moneyline'],['spreads','↔ Spreads'],['totals','📈 Totaux'],['props','▥ Props joueurs'],['heavy','🔥 HEAVY BALLS']].map(([k,v])=><button key={k} role="tab" aria-selected={category===k} className={category===k?'selected':''} onClick={()=>CATEGORY(k as typeof category)}>{v}</button>)}</div>
 {!loaded?<p>Chargement des cotes…</p>:ranking.length===0?<div className="empty">{gameResearchLoading?'Analyses des matchs en cours : les probabilités arrivent progressivement.':'Aucune sélection calculable dans cette catégorie actuellement. Vérifier les données et les probabilités du modèle.'} {category==='props'?' État du simulateur : '+researchStatus+'.':''}</div>:<div className="studio-picks-grid">{ranking.map((o,i)=><article key={o.id} className={'studio-pick-card pick-'+i+(category==='heavy'?' heavy-pick':'')}><span className="pick-rank">#{i+1}</span><span className="pick-market">{category==='heavy'?'HEAVY BALLS':o.market.toUpperCase()}</span><div className={"pick-art"+(o.market==="props"?" player-prop-art":"")}><div className="pick-spotlights" aria-hidden="true"/>{o.market==="props"?<div className="player-feature"><div className="player-electric" aria-hidden="true"/><div className="player-photo-unavailable">JOUEUR · PHOTO À VALIDER</div><div className="player-feature-name">{o.player||"Joueur NFL"}</div>{o.playerTeam&&teamFrom(o.playerTeam)&&<img className="player-team-logo" src={logo(teamFrom(o.playerTeam)!)} alt={"Logo "+o.playerTeam}/>}</div>:null}{teamFrom(o.team)?<img src={logo(teamFrom(o.team)!)} alt={o.team}/>:<span>🏈</span>}<div className="pick-field-lines" aria-hidden="true"/>{teamSides(o.game).length===2&&<div className="pick-versus"><img src={logo(teamSides(o.game)[0])} alt=""/><b>VS</b><img src={logo(teamSides(o.game)[1])} alt=""/></div>}</div><p className="pick-game">{o.game}</p><div className="pick-book">{o.book} · cote observée · {officialProbability(o)!==null?'rapport indépendant vérifié':'projection expérimentale'}</div><h3>{o.selection}</h3><div className="pick-metrics"><div><small>COTE</small><strong>{fmt(o.odds)}</strong></div><div><small>{officialProbability(o)!==null?'MODÈLE INDÉPENDANT':'ESTIMATION EXP.'}</small><strong>{officialProbability(o)!==null?Math.round(officialProbability(o)!*100)+'%':o.market==='props'&&researchValue(o)!==null?Math.round(researchValue(o)!.probability*100)+'% exp.':gameProjection(o)!==null?Math.round(gameProjection(o)!*100)+'% exp.':'—'}</strong></div></div><p style={{fontSize:13,color:'#dcecff',lineHeight:1.55,margin:'12px 0 8px',padding:'12px',background:'rgba(10,25,47,.72)',border:'1px solid rgba(120,180,245,.3)',borderRadius:10}}><strong style={{color:'#7de6fc'}}>POURQUOI CE PARI EST CLASSÉ ICI</strong><span style={{display:'block',marginTop:6}}>{reasoning(o,i+1)}</span></p><p style={{fontSize:12,color:'#c3d4e6',minHeight:54}}>{category==='heavy'?'PASSER — grande cote avec projection expérimentale seulement; avantage non validé et risque élevé.':officialProbability(o)!==null?'Rapport indépendant vérifié. Comparer les cotes et le contexte avant de choisir.':researchValue(o)?.explanation||gamesResearch[o.game]?.explanation||'Estimation exploratoire; vérifier le contexte et les conditions du bookmaker.'}</p><button className="pick-action" onClick={()=>choose(o)}>Voir ce pari →</button></article>)}</div>}
 {selected&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:99999,background:'rgba(1,7,20,.91)',display:'flex',alignItems:'center',justifyContent:'center',padding:'min(3vw,20px)',backdropFilter:'blur(14px)'}} onClick={()=>SELECT(null)}>
 <div role="dialog" aria-modal="true" aria-label="Analyse détaillée du pari" onClick={e=>e.stopPropagation()} style={{position:'relative',width:'min(940px,100%)',maxHeight:'94dvh',overflowY:'auto',lineHeight:1.65,borderRadius:20,border:'1px solid #4786b6',boxShadow:'0 25px 95px #000',padding:'clamp(18px,4vw,36px)',background:'linear-gradient(155deg,#102744,#071322 72%)',color:'#f2f7ff'}}>
 <div style={{height:5,background:'linear-gradient(90deg,#00d8ff,#3c77ff,#fe5d8f)',position:'sticky',top:0,zIndex:1,borderRadius:8,marginBottom:16}}/>
 <div className="bet-entry-head"><span>✦ NFL STUDIO · RAPPORT D'ANALYSE</span><button aria-label="Fermer" onClick={()=>SELECT(null)}>✕</button></div>
 <div style={{padding:'6px 0 12px'}}>
 <p style={{color:'#82d8ff',fontWeight:800,letterSpacing:1,fontSize:12}}>ÉTUDE D'UN MARCHÉ · {selected.market.toUpperCase()}</p>
 <h2 style={{fontSize:'clamp(23px,4vw,33px)',margin:'5px 0 8px'}}>{selected.selection}</h2>
 <p style={{opacity:.8,margin:'0 0 20px'}}>{selected.game} · {selected.book}</p>
 {(()=>{
 const officialP=officialProbability(selected),prop=selected.market==='props'?researchValue(selected):null,g=gamesResearch[selected.game];
 const p=officialP??(selected.market==='props'?prop?.probability??null:gameProjection(selected));
 const implied=1/selected.odds,edge=p===null?null:100*(p-implied),ev=p===null?null:100*(p*selected.odds-1);
 const pct=(n:number)=>(100*n).toFixed(1).replace('.',',')+' %';
 const signed=(n:number)=>(n>=0?'+':'')+n.toFixed(1).replace('.',',');
 const bodyStyle={margin:'6px 0 18px',color:'#d5e3f5',fontSize:14} as const;
 const titleStyle={margin:'20px 0 4px',fontSize:17,color:'#8ce5ff'} as const;
 return <>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
 {[[ 'Cote du bookmaker',fmt(selected.odds)],['Probabilité implicite',pct(implied)],['Probabilité calculée',p===null?'Indisponible':pct(p)],['Valeur espérée',ev===null?'Indisponible':signed(ev)+' %']].map(([label,value])=><div key={label} style={{padding:'12px 14px',border:'1px solid #365577',borderRadius:12,background:'#10253e'}}><div style={{fontSize:11,color:'#b5cadd'}}>{label}</div><strong style={{fontSize:22,color:'#fff'}}>{value}</strong></div>)}
 </div>
 <div style={{marginTop:24,padding:'22px',background:'linear-gradient(125deg,rgba(9,68,104,.65),rgba(34,22,74,.65))',border:'1px solid #357caa',borderRadius:16}}>
 <div style={{fontWeight:900,fontSize:12,letterSpacing:2,color:'#73e4ff'}}>🏈 LE VERDICT DU VESTIAIRE</div>
 <p style={{fontSize:'clamp(17px,2.5vw,21px)',fontWeight:650,lineHeight:1.65,margin:'10px 0 14px'}}>
 {selected.market==='props'
 ?`On sort le tableau noir pour ${selected.player||'notre joueur du jour'}. Le pari demande ${selected.selection}, et la cote de ${fmt(selected.odds)} veut dire que le bookmaker évalue ce scénario autour de ${pct(implied)}. ${p===null?'Notre moteur n’a pas assez de matière pour rendre son verdict — pas question de jouer au devin.':`Notre simulation historique, elle, voit ${pct(p)} de chances d’y arriver. ${edge!==null&&edge>0?'C’est un écart intéressant sur papier, mais le joueur doit encore livrer la marchandise sur le terrain.':'À ce prix-là, l’avantage n’est pas démontré.'}`}`
 :selected.market==='moneyline'
 ?`Dans ce duel ${selected.game}, le scénario étudié est simple : ${selected.selection}. À ${fmt(selected.odds)}, le bookmaker demande une réussite d’environ ${pct(implied)} pour atteindre le seuil de rentabilité. ${p===null?'Le modèle n’a pas livré de projection exploitable.':'Notre projection place plutôt cette victoire à '+pct(p)+'.'} ${g?'Sur le tableau de bord, la marge prévue du domicile est de '+g.projected_margin.toFixed(1)+' point(s), pour un total attendu de '+g.projected_total.toFixed(1)+' points.':'On évite de broder sur des statistiques qu’on n’a pas.'} ${edge!==null&&edge>0?'Le prix attire l’œil : reste à voir si notre modèle est assez solide pour défier la ligne.':'Pour l’instant, le bookmaker ne nous donne pas de cadeau évident.'}`
 :`On examine ${selected.selection} pour ${selected.game}. ${g?'Nos scores projetés pointent vers une marge domicile de '+g.projected_margin.toFixed(1)+' point(s) et un total de '+g.projected_total.toFixed(1)+' points.':'Le détail du scénario de match n’est pas disponible.'} À la cote de ${fmt(selected.odds)}, le seuil implicite est de ${pct(implied)}. ${p===null?'Sans probabilité du moteur, on garde le casque sur le banc.':'Notre estimation monte à '+pct(p)+', ce qui donne '+(edge===null?'un avantage inconnu':signed(edge)+' points d’écart')+'.'}`}
 </p>
 <div style={{borderTop:'1px solid rgba(145,205,255,.3)',paddingTop:12,color:'#ffd47c',fontWeight:850,fontSize:16}}>
 {p===null?'Pas de chiffres, pas de fanfaronnade : même le vestiaire sait quand passer son tour.'
 :ev!==null&&ev>0?(selected.market==='props'?'Le gars a peut-être le bras d’un mâle alpha… mais les simulations devront parler plus fort que le trash talk. 🏈':'Le bookmaker nous tend peut-être une ouverture. On garde la tête froide, même avec le vestiaire en feu. 🔥')
 :'Même un cowboy du dimanche sait qu’une grosse cote ne transforme pas une mauvaise valeur en bon pari. 🤠'}
 </div>
 </div>
 <h3 style={titleStyle}>01 · Conclusion du modèle</h3>
 <p style={bodyStyle}>{p===null?'Le moteur ne fournit pas de probabilité exploitable pour ce marché. Nous ne pouvons pas justifier mathématiquement un classement.':`Pour ce pari, le modèle estime une probabilité de réussite de ${pct(p)}, alors que la cote décimale de ${fmt(selected.odds)} correspond à une probabilité implicite de ${pct(implied)}. L'écart théorique est de ${signed(edge!)} points de pourcentage et la valeur espérée de ${signed(ev!)} % par dollar engagé. Il s'agit d'une comparaison entre une estimation statistique et le prix affiché, et non d'une garantie de résultat.`}</p>
 <h3 style={titleStyle}>02 · Comment la probabilité est construite</h3>
 <p style={bodyStyle}>{officialP!==null?'La probabilité de victoire provient du rapport indépendant EXPERT NFL disponible pour cette rencontre. La présente interface utilise ce chiffre pour le comparer à la cote, mais ne dispose pas ici d’une décomposition vérifiable de chaque variable du moteur. Nous ne prétendons donc pas connaître des contributions non communiquées.':selected.market==='props'?'Le moteur étudie les performances historiques du joueur avant la rencontre. Il accorde davantage de poids aux observations récentes et simule une distribution de résultats pour calculer la part des scénarios au-dessus ou au-dessous du seuil choisi. '+(prop?.explanation||'La disponibilité d’un historique exploitable détermine si une probabilité peut être calculée.'):'Le moteur confronte les points inscrits et concédés lors des dernières rencontres des deux équipes afin de projeter un score. Il applique un avantage terrain fixe et, lorsqu’un historique suffisant existe, un ajustement plafonné lié au quart-arrière projeté à partir des données ESPN. Il transforme ensuite la marge ou le total prévu en probabilité à l’aide de la dispersion supposée des scores.'}</p>
 {g&&selected.market!=='props'&&<><h3 style={titleStyle}>03 · Lecture du match</h3><p style={bodyStyle}>Marge prévue pour l’équipe à domicile : <strong>{g.projected_margin.toFixed(1)} points</strong>. Total de points projeté : <strong>{g.projected_total.toFixed(1)}</strong>. {selected.market==='moneyline'?'La probabilité de victoire résulte de cette marge et de l’incertitude du résultat final.':selected.market==='spreads'?'Le handicap sélectionné est appliqué à cette marge pour estimer les chances de couvrir le spread.':'Le seuil du bookmaker est comparé au total projeté pour estimer les chances de dépassement ou de sous-performance.'}</p></>}
 {selected.market==='props'&&<><h3 style={titleStyle}>03 · Lecture de la performance individuelle</h3><p style={bodyStyle}>Joueur : <strong>{selected.player||'Non identifié'}</strong>. Seuil du pari : <strong>{selected.line??'Indisponible'}</strong>. {prop?'La probabilité affichée correspond aux simulations historiques du joueur pour ce seuil précis.':'Aucune simulation historique n’a été associée à ce pari.'}</p></>}
 <h3 style={titleStyle}>04 · Pourquoi cette cote peut présenter de la valeur</h3>
 <p style={bodyStyle}>{p===null?'Sans probabilité indépendante, impossible de mesurer l’avantage face au bookmaker.':ev!==null&&ev>0?`Le modèle évalue ce scénario plus favorablement que ne le suggère la cote. Une mise théorique de 100 $ aurait une espérance de résultat net de ${signed(ev)} $ selon cette probabilité, sur un grand nombre de situations comparables. Ce n’est ni une prévision de gain pour ce match ni une preuve que le bookmaker se trompe.`:`La valeur espérée estimée n’est pas positive à cette cote. Le modèle ne met donc pas en évidence d’avantage mathématique pour ce marché.`}</p>
 <h3 style={titleStyle}>05 · Limites et niveau de confiance</h3>
 <p style={bodyStyle}>{officialP!==null?'L’estimation du rapport indépendant doit toujours être confrontée aux titulaires confirmés, aux blessures, aux nouvelles de dernière minute et à la qualité de la calibration historique. Le détail complet de ces paramètres n’est pas transmis à cette fenêtre.':'Il s’agit d’un modèle expérimental non calibré hors échantillon pour démontrer un avantage réel. Les titularisations et blessures ne sont pas systématiquement confirmées, le contexte adverse est incomplet et les erreurs d’estimation peuvent être importantes. Le rendement espéré affiché ne démontre pas une rentabilité vérifiée.'}</p>
 <p style={{padding:'11px 14px',borderRadius:9,background:'rgba(255,185,75,.1)',border:'1px solid rgba(255,185,75,.35)',fontSize:13}}>Note méthodologique : ce rapport expose les calculs réellement disponibles. Il ne constitue pas une analyse inventée des blessures, de la météo ou du plan de match.</p>
 </>})()}
 </div>
 {!showBetForm?<button onClick={()=>SHOW_BET_FORM(true)} style={{padding:12,border:0,borderRadius:9,background:'#37cb9c',fontWeight:800,cursor:'pointer',color:'#071528'}}>Enregistrer ce pari dans mon suivi →</button>:<div style={{borderTop:'1px solid #395c7c',paddingTop:16}}><h3>Enregistrer un pari déjà pris</h3><p>Cote observée : {fmt(selected.odds)} · {selected.book}</p><div style={{display:'flex',gap:15,flexWrap:'wrap'}}><label>Cote décimale réelle <input type="number" min="1.01" step="0.01" value={odd} onChange={e=>ODD(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label><label>Mise CAD <input type="number" min="0.01" step="0.5" value={stake} onChange={e=>STAKE(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label></div><p>Profit potentiel : {Number(odd.replace(',','.'))>1&&Number(stake)>0?fmt(Number(stake)*(Number(odd.replace(',','.'))-1))+' $ CAD':'—'}</p><button onClick={add} style={{padding:12,border:0,borderRadius:9,background:'#37cb9c',fontWeight:800,cursor:'pointer',color:'#071528'}}>Confirmer l'enregistrement</button></div>}
 <button onClick={()=>SELECT(null)} style={{marginLeft:10,padding:12,cursor:'pointer'}}>Fermer</button>
 </div></div>}
 </>:<><div className="studio-bet-kpis kpis"><div>💳 Mises enregistrées<strong>{fmt(total)} $ CAD</strong></div><div>📈 Profit réalisé net<strong style={{color:profit>=0?'#52dfb0':'#ff9ca2'}}>{fmt(profit)} $ CAD</strong></div><div>🏆 Gain potentiel brut<strong>{fmt(pending.reduce((s,x)=>s+x.stake*x.chosenOdds,0))} $ CAD</strong></div><div>🎯 Paris enregistrés<strong>{bets.length}</strong></div></div>{view==='history'&&<div className="season-analytics">
 <div className="season-chart"><h3>📈 Évolution des gains nets</h3><div className="season-big">{profit>=0?'+':''}{fmt(profit)} $ CAD</div><p>Résultat cumulé des {settled.length} paris terminés · ROI {roi.toFixed(1)} %</p><svg viewBox="0 0 600 182" role="img" aria-label="Évolution des profits cumulés, calculée sur les paris enregistrés"><defs><linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#42f5b0" stopOpacity=".35"/><stop offset="1" stopColor="#42f5b0" stopOpacity="0"/></linearGradient></defs>{[35,75,115,155].map(y=><line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#42637d" strokeDasharray="5 7" opacity=".5"/>)}<path d={curvePath+' L '+coords[coords.length-1][0]+' 170 L 20 170 Z'} fill="url(#profitFill)"/><path d={curvePath} stroke={profit>=0?'#48f0aa':'#ff6689'} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round"/><circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="6" fill="#fff" stroke="#48f0aa" strokeWidth="3"/></svg></div>
 <div className="season-results"><h3>🎯 Répartition des résultats</h3><div className="season-ring" style={{background:won+lost?'conic-gradient(#40df9d 0 '+(won/(won+lost)*100)+'%,#f45b77 '+(won/(won+lost)*100)+'% 100%)':'conic-gradient(#1e445f 0 100%)'}}><div><strong>{won+lost}</strong><small>terminés</small></div></div><div className="season-legend"><span>🟢 Gagnés <strong>{won}</strong></span><span>🔴 Perdus <strong>{lost}</strong></span><span>Réussite <strong>{won+lost?((won/(won+lost))*100).toFixed(1):'—'}%</strong></span></div></div>
 <div className="season-markets"><h3>🏆 Résultats par marché</h3>{mix.length?mix.map(([name,s])=><div key={name} className="season-market-row"><b>{name==='moneyline'?'Moneyline':name==='spreads'?'Spreads':name==='totals'?'Totaux':name==='props'?'Props joueurs':name}</b><span>{s.count} paris</span><strong style={{color:s.profit>=0?'#45e6a2':'#ff7187'}}>{s.profit>=0?'+':''}{fmt(s.profit)} $</strong></div>):<p>Les performances par marché apparaîtront dès qu'un pari sera enregistré.</p>}</div>
 </div>}
 <p className="muted">Suivi local à ce navigateur. Les mises ne sont pas transmises à Mise-o-jeu. Résultats à confirmer manuellement pour le moment; ce n'est pas encore un suivi des matchs en direct.</p>{(view==='live'?bets.map((b,i)=>({...b,idx:i})).filter(b=>b.status==='open'):bets.map((b,i)=>({...b,idx:i}))).length?<div style={{display:'grid',gap:10}}>{bets.map((b,i)=>({...b,idx:i})).filter(b=>view==='history'||b.status==='open').map(b=><div key={b.idx} className={'live-bet-row status-'+b.status}><div className="bet-side-art">{teamFrom(b.team)?<img src={logo(teamFrom(b.team)!)} alt={b.team}/>:<span>🏈</span>}</div><div className="bet-row-content"><strong>{b.selection}</strong><p style={{margin:'4px 0',fontSize:13}}>{b.game} · Mise {fmt(b.stake)} $ · Cote {fmt(b.chosenOdds)} · <span className="bet-status">{b.status==='open'?'EN COURS':b.status==='won'?'✓ GAGNÉ':b.status==='lost'?'✕ PERDU':'ANNULÉ'}</span></p><div className="bet-row-return">Retour potentiel <strong>{fmt(b.stake*b.chosenOdds)} $</strong></div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{b.status==='open'&&<><button onClick={()=>update(b.idx,'won')}>Marquer gagné</button><button onClick={()=>update(b.idx,'lost')}>Marquer perdu</button><button onClick={()=>update(b.idx,'void')}>Annulé</button></>}</div></div></div>)}</div>:<p className="empty">Aucun pari enregistré.</p>}</>}
 </section>
}
