'use client';
import {useEffect,useMemo,useState} from 'react';
type Leg={game:string;selection:string;market:string;odds:number;team?:string};
type Bet={id:string;game:string;market:string;selection:string;team:string;status:'open'|'won'|'lost'|'void';stake:number;chosenOdds:number;kickoff?:string;placedAt?:string;legs?:Leg[]};
type Game={date?:string;status?:string;state?:string;complete?:boolean;home?:{name:string;abbr:string;score:number};away?:{name:string;abbr:string;score:number}};
const clean=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
const known:Record<string,string>={BUF:'Buffalo Bills',LV:'Las Vegas Raiders',GB:'Green Bay Packers',DAL:'Dallas Cowboys',NE:'New England Patriots',NYJ:'New York Jets',PHI:'Philadelphia Eagles',CAR:'Carolina Panthers',KC:'Kansas City Chiefs',LAC:'Los Angeles Chargers',SF:'San Francisco 49ers',WAS:'Washington Commanders',BAL:'Baltimore Ravens',CLE:'Cleveland Browns',PIT:'Pittsburgh Steelers',TB:'Tampa Bay Buccaneers',IND:'Indianapolis Colts',TEN:'Tennessee Titans',ARI:'Arizona Cardinals',LA:'Los Angeles Rams',LAR:'Los Angeles Rams'};
const same=(v:string,n:string,abbr:string)=>{const x=clean(v),full=clean(n),short=clean(known[abbr]||'');return x===full||x===short||x===clean(abbr)||x===full.split(' ').slice(-1)[0]||x===short.split(' ').slice(-1)[0]};
function gameFor(name:string,games:Game[]){const sides=name.split(/\s+vs\s+/i);return sides.length===2?games.find(g=>g.away&&g.home&&same(sides[0],g.away.name,g.away.abbr)&&same(sides[1],g.home.name,g.home.abbr)):undefined}
function classification(b:Bet,games:Game[],now:number){
 if(b.status!=='open')return 'finished';
 const legs=b.legs?.length?b.legs.map(x=>x.game):[b.game];
 const found=legs.map(g=>gameFor(g,games));
 if(found.some(g=>g&&!g.complete&&(g.state==='in'||/live|progress/i.test(g.status||''))))return 'live';
 if(found.every(g=>g?.complete)&&found.length&&found[0])return 'finished';
 const kickoffs=found.map(g=>g?.date).concat(b.kickoff||[]).map(x=>Date.parse(x||'')).filter(Number.isFinite);
 if(kickoffs.length&&Math.min(...kickoffs)>now)return 'upcoming';
 if(found.some(g=>g?.complete))return 'live';
 if(kickoffs.length&&Math.min(...kickoffs)<=now)return 'live';
 return 'upcoming';
}
function groupOf(b:Bet){if(b.market==='parlay')return /heavyball/i.test(b.selection)?'heavyball':'parlay';if(/heavyball/i.test(b.selection))return 'heavyball';if(b.market==='props')return 'props';if(b.market==='moneyline')return 'moneyline';if(b.market==='spreads')return 'spreads';if(b.market==='totals')return 'totals';return 'other'}
export default function BetOrganizer({bets,onUpdate}:{bets:Bet[];onUpdate:(idx:number,status:'won'|'lost'|'void')=>void}){
 const [tab,TAB]=useState<'live'|'upcoming'|'finished'>('live');
 const [kind,KIND]=useState('all');const [today,TODAY]=useState(false);const [expanded,EXPANDED]=useState<string[]>([]);
 const [feed,FEED]=useState<Game[]>([]);const [updated,UPDATED]=useState('');const [clock,CLOCK]=useState(Date.now());
 useEffect(()=>{let active=true;const load=()=>fetch('/api/live-coverage',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(!active)return;FEED(Array.isArray(d.games)?d.games:[]);UPDATED(typeof d.updatedAt==='string'?d.updatedAt:'');CLOCK(Date.now())}).catch(()=>{if(active)CLOCK(Date.now())});load();const timer=setInterval(load,45000);return()=>{active=false;clearInterval(timer)}},[]);
 const rows=useMemo(()=>bets.map((b,idx)=>({b,idx,state:classification(b,feed,clock),kind:groupOf(b)})),[bets,feed,clock]);
 const counts={live:rows.filter(r=>r.state==='live').length,upcoming:rows.filter(r=>r.state==='upcoming').length,finished:rows.filter(r=>r.state==='finished').length};
 const listing=rows.filter(r=>r.state===tab&&(kind==='all'||r.kind===kind)).filter(r=>{if(!today)return true;const g=gameFor(r.b.legs?.[0]?.game||r.b.game,feed);const d=g?.date||r.b.kickoff||r.b.placedAt;return !!d&&new Date(d).toLocaleDateString('en-CA',{timeZone:'America/Toronto'})===new Date(clock).toLocaleDateString('en-CA',{timeZone:'America/Toronto'})}).sort((a,b)=>{const aTime=Date.parse(gameFor(a.b.legs?.[0]?.game||a.b.game,feed)?.date||a.b.kickoff||a.b.placedAt||'')||0,bTime=Date.parse(gameFor(b.b.legs?.[0]?.game||b.b.game,feed)?.date||b.b.kickoff||b.b.placedAt||'')||0;return tab==='upcoming'?aTime-bTime:bTime-aTime});
 const cats=[['all','Tous'],['heavyball','🔥 Heavyball'],['parlay','🔗 Parlays'],['props','🎯 Props'],['moneyline','🏈 Moneyline'],['spreads','↔ Spread'],['totals','📈 Totaux']];
 const toggle=(id:string)=>EXPANDED(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 return <section style={{display:'grid',gap:14,margin:'18px 0'}}>
 <h2 style={{fontSize:23,margin:0}}>🎟️ MON TABLEAU DE BORD</h2>
 <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
 {([['live','🔴 En direct','#56f2c4'],['upcoming','⏰ À venir','#8fc9ff'],['finished','🏁 Terminés','#d7b6ff']] as const).map(([k,label,color])=><button key={k} onClick={()=>TAB(k)} style={{padding:'12px 5px',background:tab===k?'#1e3952':'#10243a',border:'1px solid '+(tab===k?color:'#365775'),borderRadius:13,color:'#eaf6ff',cursor:'pointer'}}><div style={{fontSize:11,color}}>{label}</div><strong style={{fontSize:27}}>{counts[k]}</strong></button>)}
 </div>
 <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:6}}>{cats.map(([v,label])=><button key={v} onClick={()=>KIND(v)} style={{flexShrink:0,padding:'9px 12px',borderRadius:18,background:kind===v?'#2a6579':'#183049',border:'1px solid '+(kind===v?'#59e7d1':'#365471'),color:'#fff'}}>{label}</button>)}</div>
 <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#bcd3e6'}}><input type="checkbox" checked={today} onChange={e=>TODAY(e.target.checked)}/> Aujourd'hui seulement</label>
 {updated&&<small style={{color:'#8daec6'}}>Scores ESPN actualisés : {new Date(updated).toLocaleTimeString('fr-CA',{timeZone:'America/Toronto'})}. Statuts des billets à confirmer auprès du bookmaker.</small>}
 {listing.length?listing.map(({b,idx,state,kind:k})=>{const legs=b.legs||[];const opened=expanded.includes(b.id);const first=gameFor(legs[0]?.game||b.game,feed);const border=k==='heavyball'?'#ae70ef':k==='parlay'?'#28c9bc':state==='live'?'#4bdcad':'#385b7c';return <article key={b.id} style={{background:k==='heavyball'?'linear-gradient(115deg,#231634,#0d233a)':'#10283f',border:'1px solid '+border,borderRadius:16,padding:14,boxShadow:state==='live'?'0 0 16px #42dc9b13':'none'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:10}}><div style={{minWidth:0}}><div style={{fontSize:11,fontWeight:900,color:border,marginBottom:5}}>{k==='heavyball'?'🔥 HEAVYBALL':k==='parlay'?'🔗 PARLAY':k==='props'?'🎯 PROP':k.toUpperCase()} · {state==='live'?'● EN DIRECT':state==='upcoming'?'À VENIR':b.status==='open'?'RÉSULTAT À CONFIRMER':b.status==='won'?'✓ GAGNÉ':b.status==='lost'?'✕ PERDU':'ANNULÉ'}</div><strong style={{fontSize:16,overflowWrap:'anywhere'}}>{legs.length?legs.length+' BRANCHES · '+b.selection:b.selection}</strong><div style={{fontSize:12,color:'#afc9df',marginTop:4}}>{legs.length?legs.map(x=>x.game).join(' · '):b.game}</div></div><div style={{textAlign:'right',flexShrink:0}}><strong style={{fontSize:21,color:'#f1fdff'}}>{Number(b.chosenOdds||0).toFixed(2)}</strong><div style={{fontSize:11,color:'#9fbfd8'}}>Cote</div></div></div>
 <div style={{display:'flex',justifyContent:'space-between',marginTop:11,gap:8,color:'#c6deed',fontSize:13}}><span>Mise {Number(b.stake||0).toFixed(2)} $</span><strong>Retour {((b.stake||0)*(b.chosenOdds||0)).toFixed(2)} $</strong></div>
 {first?.home&&first?.away&&<div style={{fontSize:12,color:'#b8d4e8',marginTop:9}}>🏈 {first.away.abbr} {first.away.score} – {first.home.abbr} {first.home.score} {first.complete?'· FINAL':first.state==='in'?'· LIVE':''}</div>}
 {legs.length>0&&<><button type="button" onClick={()=>toggle(b.id)} style={{marginTop:12,background:'#223e59',border:'1px solid #537796',borderRadius:9,padding:'9px 12px',color:'#c6f5ff',width:'100%',textAlign:'left'}}>{opened?'▾ Masquer les branches':'▸ Voir les '+legs.length+' branches'}</button>{opened&&legs.map((leg,i)=>{const g=gameFor(leg.game,feed);return <div key={i} style={{padding:'10px 4px',borderBottom:'1px solid #ffffff20'}}><strong>{i+1}. {leg.selection}</strong><div style={{fontSize:12,color:'#aec7dc'}}>{leg.game} · {leg.odds?.toFixed(2)} {g?.complete?'· Match terminé':g?.state==='in'?'· ● EN DIRECT':'· À venir'}</div></div>})}</>}
 {b.status==='open'&&state==='finished'&&<div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:12}}><button onClick={()=>onUpdate(idx,'won')}>✓ Gagné</button><button onClick={()=>onUpdate(idx,'lost')}>✕ Perdu</button><button onClick={()=>onUpdate(idx,'void')}>Annulé</button></div>}
 </article>}) : <p style={{padding:19,border:'1px dashed #406888',borderRadius:12,color:'#a5c7df'}}>Aucun pari dans cette catégorie pour le moment.</p>}
 </section>
}