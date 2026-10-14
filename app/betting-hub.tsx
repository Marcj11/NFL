'use client';
import {useEffect,useMemo,useState} from 'react';
type Offer={id:string;game:string;market:string;selection:string;line?:number;book:string;odds:number;prob:number;team:string};
type Bet=Offer&{stake:number;chosenOdds:number;placedAt:string;status:'open'|'won'|'lost'|'void';resultConfirmedAt?:string};
const fmt=(n:number)=>n.toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
const decimal=(n:number)=>n>0?1+n/100:n<0?1+100/Math.abs(n):0;
const STORE='nfl-studio-bets-v1';
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
 const market=m.key==='h2h'?'moneyline':m.key==='spreads'?'spreads':m.key==='totals'?'totals':'';
 if(!market)continue;const selection=market==='moneyline'?'Victoire · '+o.name:market==='spreads'?o.name+' '+o.point:o.name+' '+o.point+' points';
 out.push({id:[game,market,o.name,o.point??''].join('|'),game,market,selection,line:o.point,odds,prob:1/odds,book:b.title,team:o.name});
 }}
 const best=new Map<string,Offer>();for(const x of out){const older=best.get(x.id);if(!older||x.odds>older.odds)best.set(x.id,x)}
 if(active){setOffers([...best.values()]);LOADED(true)}
 }).catch(()=>{if(active)LOADED(true)});return()=>{active=false}},[]);
 const ranking=useMemo(()=>{
 const all=offers.filter(x=>category==='heavy'?x.odds>=2.7:category==='props'?false:category==='general'?true:x.market===category).sort((a,b)=>category==='heavy'?b.odds-a.odds:b.prob-a.prob);
 return all.slice(0,5);
 },[category,offers]);
 const choose=(v:Offer)=>{SELECT(v);ODD(fmt(v.odds).replace(',','.'));STAKE('5')};
 const add=()=>{if(!selected)return;const d=Number(odd.replace(',','.')),s=Number(stake.replace(',','.'));if(!Number.isFinite(d)||d<=1||!Number.isFinite(s)||s<=0)return;save([{...selected,chosenOdds:d,stake:s,placedAt:new Date().toISOString(),status:'open'},...bets]);SELECT(null)};
 const update=(idx:number,status:Bet['status'])=>{const next=bets.map((x,i)=>i===idx?{...x,status,resultConfirmedAt:new Date().toISOString()}:x);save(next)};
 const wins=bets.filter(x=>x.status==='won').reduce((s,b)=>s+b.stake*(b.chosenOdds-1),0);
 const losses=bets.filter(x=>x.status==='lost').reduce((s,b)=>s+b.stake,0);
 const pending=bets.filter(x=>x.status==='open');
 const total=bets.reduce((s,x)=>s+x.stake,0);
 const profit=wins-losses;
 return <section className="panel" style={{marginTop:16}}>
 <div className={'studio-hero '+(view==='top'&&category==='heavy'?'heavy-hero':'')}><div className="studio-hero-inner">{view==='top'&&category==='heavy'?<><div className="heavy-emblem"><span>HEAVY</span><strong>BALLS</strong><div className="metal-orbs"><i/><i/></div><small>ON LES DÉPOSE SUR LE SYNTHÉTIQUE</small></div></>:<><span className="studio-kicker">✦ NFL STUDIO · SAISON 2026</span><div className="studio-hero-title">{view==='top'?'TOP PARIS':view==='live'?'MES PARIS EN COURS':'BILAN DE SAISON'}</div><p>{view==='top'?'Nos cinq angles à examiner, par catégorie':view==='live'?'Toutes tes mises, tes retours potentiels et leur statut':'Ton historique de paris et tes résultats en dollars canadiens'}</p></>}</div></div>
 <h2 style={{fontSize:28,marginBottom:8,display:'none'}}>{view==='top'?'🏆 TOP PARIS · SEMAINE NFL':view==='live'?'🎯 PARIS EN COURS':'📊 BILAN DE SAISON'}</h2>
 {view==='top'?<><p className="muted">Cotes de bookmakers disponibles dans le cache partagé. Les pourcentages ci-dessous sont les probabilités implicites des cotes, pas les probabilités calculées par un modèle calibré. Les Player Props et leur Top 5 seront proposés uniquement lorsqu'un calcul de joueur vérifiable est disponible.</p>
 <div style={{display:'flex',gap:9,flexWrap:'wrap',margin:'16px 0'}}>{[['general','🏆 Top 5 général'],['moneyline','🏈 Moneyline'],['spreads','↔ Spreads'],['totals','📈 Totaux'],['props','▥ Props joueurs'],['heavy','🔥 HEAVY BALLS']].map(([k,v])=><button key={k} onClick={()=>CATEGORY(k as typeof category)} style={{borderRadius:9,padding:'11px 15px',background:category===k?'#1755aa':'#243849',border:'1px solid #4b7295',color:'white',cursor:'pointer'}}>{v}</button>)}</div>
 {!loaded?<p>Chargement des cotes…</p>:ranking.length===0?<div className="empty">Aucune sélection vérifiée dans cette catégorie actuellement. Aucun Top 5 inventé.</div>:<div className="studio-picks-grid">{ranking.map((o,i)=><article key={o.id} className={'studio-pick-card pick-'+i+(category==='heavy'?' heavy-pick':'')}><span className="pick-rank">#{i+1}</span><span className="pick-market">{category==='heavy'?'HEAVY BALLS':o.market.toUpperCase()}</span><div className="pick-art">{category==='heavy'?'⚡':o.market==='moneyline'?'🏈':o.market==='spreads'?'↔':'★'}</div><p style={{fontSize:12,opacity:.75}}>{o.game}</p><h3 style={{minHeight:55}}>{o.selection}</h3><div style={{display:'flex',justifyContent:'space-between'}}><div>Cote <strong>{fmt(o.odds)}</strong></div><div>Implicite <strong>{Math.round(o.prob*100)} %</strong></div></div><p style={{fontSize:12,color:'#c3d4e6',minHeight:54}}>{category==='heavy'?'Paiement potentiel élevé, probabilité implicite faible. Ce classement ne mesure pas un avantage réel.':'Probabilité implicite calculée d’après la cote affichée. Analyse statistique non calibrée : aucune valeur prédictive garantie.'}</p><button onClick={()=>choose(o)} style={{width:'100%',padding:10,border:0,borderRadius:9,cursor:'pointer',background:'#28aaf0',color:'#061625',fontWeight:900}}>Examiner ce pari</button></article>)}</div>}
 {selected&&<div style={{marginTop:18,padding:18,borderRadius:14,border:'1px solid #6c9ddd',background:'#0c2943'}}><h3>Confirmer un pari pris sur Mise-o-jeu</h3><p>{selected.game} · {selected.selection}</p><div style={{display:'flex',gap:15,flexWrap:'wrap'}}><label>Cote décimale réelle <input type="number" min="1.01" step="0.01" value={odd} onChange={e=>ODD(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label><label>Mise CAD <input type="number" min="0.01" step="0.5" value={stake} onChange={e=>STAKE(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label></div><p>Probabilité implicite recalculée : {Number(odd.replace(',','.'))>1?fmt(100/Number(odd.replace(',','.')))+' %':'—'} · Profit si gagnant : {Number(odd.replace(',','.'))>1&&Number(stake)>0?fmt(Number(stake)*(Number(odd.replace(',','.'))-1))+' $ CAD':'—'}</p><p className="muted">Changer la cote ne change pas la probabilité réelle calculée du joueur ou de l'équipe. Cela change la valeur et le rendement du pari.</p><button onClick={add} style={{padding:12,border:0,borderRadius:9,background:'#37cb9c',fontWeight:800,cursor:'pointer'}}>Enregistrer dans Paris en cours</button> <button onClick={()=>SELECT(null)} style={{padding:12,cursor:'pointer'}}>Annuler</button></div>}
 </>:<><div className="studio-bet-kpis kpis"><div>Mises enregistrées<strong>{fmt(total)} $ CAD</strong></div><div>Profit réalisé net<strong style={{color:profit>=0?'#52dfb0':'#ff9ca2'}}>{fmt(profit)} $ CAD</strong></div><div>Potentiel brut des paris ouverts<strong>{fmt(pending.reduce((s,x)=>s+x.stake*x.chosenOdds,0))} $ CAD</strong></div><div>Fiches<strong>{bets.length}</strong></div></div><p className="muted">Suivi local à ce navigateur. Les mises ne sont pas transmises à Mise-o-jeu. Résultats à confirmer manuellement pour le moment; ce n'est pas encore un suivi des matchs en direct.</p>{(view==='live'?bets.map((b,i)=>({...b,idx:i})).filter(b=>b.status==='open'):bets.map((b,i)=>({...b,idx:i}))).length?<div style={{display:'grid',gap:10}}>{bets.map((b,i)=>({...b,idx:i})).filter(b=>view==='history'||b.status==='open').map(b=><div key={b.idx} style={{padding:13,borderRadius:10,background:'#1e3343',border:'1px solid #42627a'}}><strong>{b.selection}</strong><p style={{margin:'4px 0',fontSize:13}}>{b.game} · Mise {fmt(b.stake)} $ · Cote {fmt(b.chosenOdds)} · {b.status==='open'?'En cours':b.status==='won'?'Gagné':b.status==='lost'?'Perdu':'Annulé'}</p><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{b.status==='open'&&<><button onClick={()=>update(b.idx,'won')}>Marquer gagné</button><button onClick={()=>update(b.idx,'lost')}>Marquer perdu</button><button onClick={()=>update(b.idx,'void')}>Annulé</button></>}</div></div>)}</div>:<p className="empty">Aucun pari enregistré.</p>}</>}
 </section>
}
