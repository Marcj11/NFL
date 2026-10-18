'use client';
import {useMemo} from 'react';
type Offer={id:string;game:string;market:string;selection:string;odds:number;book:string;kickoff?:string;team:string;prob:number;line?:number;marketKey?:string;player?:string;playerImage?:string;playerTeam?:string};
type Combo={legs:Offer[];chance:number;odds:number;ev:number};
export default function HeavyballParlays({offers,probability,onAdd}:{offers:Offer[];probability:(o:Offer)=>number|null;onAdd:(c:Combo,kind:'regular'|'heavyball')=>void}){
 const all=useMemo(()=>{
  const candidates=offers.filter(o=>o.market==='moneyline'||o.market==='spreads').map(o=>({o,p:probability(o)}))
   .filter((x):x is {o:Offer;p:number}=>x.p!==null&&x.p>=.5&&x.p<1&&x.o.odds>1&&!!x.o.kickoff&&Date.parse(x.o.kickoff)>Date.now())
   .sort((a,b)=>b.p*b.o.odds-a.p*a.o.odds).slice(0,35);
  const final:Combo[]=[];let frontier:Combo[]=candidates.map(x=>({legs:[x.o],chance:x.p,odds:x.o.odds,ev:x.p*x.o.odds-1}));
  for(let depth=2;depth<=7&&frontier.length;depth++){
   const next:Combo[]=[];const keys=new Set<string>();
   for(const c of frontier)for(const x of candidates){
    if(c.legs.some(o=>o.game===x.o.game))continue;
    const legs=[...c.legs,x.o].sort((a,b)=>a.id.localeCompare(b.id));
    const key=legs.map(o=>o.id).join('||');if(keys.has(key))continue;keys.add(key);
    const chance=c.chance*x.p;if(chance<.4)continue;
    const odds=c.odds*x.o.odds,combo={legs,chance,odds,ev:chance*odds-1};
    next.push(combo);if(combo.ev>0)final.push(combo);
   }
   frontier=next.sort((a,b)=>b.ev-a.ev).slice(0,65);
  }
  const selected:Combo[]=[];
  for(const c of final.sort((a,b)=>b.ev-a.ev)){
   if(selected.some(prev=>c.legs.filter(x=>prev.legs.some(y=>y.id===x.id)).length>=Math.min(c.legs.length,prev.legs.length)))continue;
   selected.push(c);if(selected.length>=5)break;
  }
  return final.sort((a,b)=>b.ev-a.ev).slice(0,250);
 },[offers,probability]);
 const pick=(kind:'regular'|'heavyball')=>{const out:Combo[]=[];const sorted=[...all].sort((a,b)=>kind==='regular'?b.chance-a.chance||b.ev-a.ev:b.ev-a.ev);for(const c of sorted){if(out.some(prev=>c.legs.filter(x=>prev.legs.some(y=>y.id===x.id)).length>=Math.min(c.legs.length,prev.legs.length)))continue;out.push(c);if(out.length===5)break}return out};
 const teams:Record<string,string>={'Philadelphia Eagles':'phi','New England Patriots':'ne','Indianapolis Colts':'ind','Buffalo Bills':'buf','Kansas City Chiefs':'kc','Baltimore Ravens':'bal','Dallas Cowboys':'dal','Green Bay Packers':'gb','Carolina Panthers':'car','New York Jets':'nyj','San Francisco 49ers':'sf','Houston Texans':'hou','Jacksonville Jaguars':'jax','Detroit Lions':'det','Chicago Bears':'chi','Seattle Seahawks':'sea','Miami Dolphins':'mia','Denver Broncos':'den','Tampa Bay Buccaneers':'tb','Los Angeles Rams':'lar','Los Angeles Chargers':'lac','Cincinnati Bengals':'cin','Arizona Cardinals':'ari','New Orleans Saints':'no','Pittsburgh Steelers':'pit','Minnesota Vikings':'min','Las Vegas Raiders':'lv','Atlanta Falcons':'atl','Tennessee Titans':'ten','Cleveland Browns':'cle','New York Giants':'nyg','Washington Commanders':'wsh'};
 const palette=(kind:'regular'|'heavyball')=>kind==='regular'?{main:'#5cf1d0',secondary:'#0db8f4',border:'#1c91b2',bg:'linear-gradient(140deg,#08263b,#10152d)'}:{main:'#ffb16a',secondary:'#ac64ff',border:'#9453bd',bg:'linear-gradient(140deg,#2a1535,#10152c)'};
 return <section style={{display:'grid',gap:15,margin:'16px 0'}}>
  <p style={{padding:13,border:'1px solid #e7b665',borderRadius:12,color:'#ffdfa0'}}>Projections expérimentales non calibrées. Les matchs sont supposés indépendants, et les meilleures cotes peuvent provenir de bookmakers différents. Vérifier la disponibilité réelle avant toute mise.</p>
  {(['regular','heavyball'] as const).map(kind=><div key={kind} style={{display:'grid',gap:12}}><h3 style={{fontSize:22,color:kind==='heavyball'?'#ffa85d':'#74f5da'}}>{kind==='heavyball'?'🔥 TOP 5 HEAVYBALL PARLAYS':'🔗 TOP 5 PARLAYS PRUDENTS'}</h3>{pick(kind).length?pick(kind).map((c,i)=><article key={c.legs.map(o=>o.id).join('|')} style={{padding:20,border:'1px solid '+palette(kind).border,borderRadius:22,background:palette(kind).bg,boxShadow:'0 0 24px '+palette(kind).border+'40'}}>
   <strong style={{color:'#61f7dd'}}>{kind==='heavyball'?'HEAVYBALL':'PRUDENT'} PARLAY #{i+1} · {c.legs.length} BRANCHES</strong>
   <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'end',margin:'12px 0'}}><div><small>COTE COMBINÉE</small><div style={{fontSize:30,fontWeight:950}}>{c.odds.toFixed(2)} ×</div></div><div style={{textAlign:'right'}}><small>CHANCE ESTIMÉE</small><div style={{fontSize:27,fontWeight:950,color:palette(kind).main}}>{(c.chance*100).toFixed(1)} %</div></div></div><div style={{height:10,borderRadius:12,background:'#ffffff25',overflow:'hidden',marginBottom:12}}><div style={{height:'100%',width:(c.chance*100)+'%',background:'linear-gradient(90deg,'+palette(kind).secondary+','+palette(kind).main+')'}}/></div>
   {c.legs.map((o,j)=>{const named=Object.keys(teams).find(t=>o.selection.includes(t)||o.team.includes(t));const logo=named?'https://a.espncdn.com/i/teamlogos/nfl/500/'+teams[named]+'.png':'';return <div key={o.id} style={{borderTop:'1px solid #395270',padding:'12px 0',display:'flex',gap:12,alignItems:'center'}}><div style={{width:55,height:55,flexShrink:0,borderRadius:12,background:'#ffffff12',display:'grid',placeItems:'center'}}>{logo?<img alt={named} src={logo} loading="lazy" style={{width:46,height:46,objectFit:'contain'}}/>:'🏈'}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:10,color:palette(kind).main,fontWeight:900}}>BRANCHE {j+1} · {o.market==='spreads'?'SPREAD':'MONEYLINE'}</div><strong style={{fontSize:16}}>{o.market==='spreads'&&Number.isFinite(o.line)?(named||o.team)+' '+(Number(o.line)>0?'+':'')+o.line:o.market==='moneyline'?'Victoire · '+(named||o.team):o.selection}</strong><div style={{fontSize:12,color:'#b4cbe0'}}>{o.game} · {o.book}</div><div style={{height:4,background:'#ffffff24',borderRadius:8,marginTop:7}}><div style={{height:'100%',width:((probability(o)??0)*100)+'%',background:palette(kind).main,borderRadius:8}}/></div></div><div style={{textAlign:'right',flexShrink:0}}><strong>{o.odds.toFixed(2)}</strong><div style={{fontSize:12,color:palette(kind).main}}>{((probability(o)??0)*100).toFixed(1)} %</div></div></div>})}
   <p style={{color:'#64ecc1',fontWeight:850}}>EV théorique +{(c.ev*100).toFixed(1)} % · 5 $ → {(5*c.odds).toFixed(2)} $ brut potentiel</p>
   <button type="button" onClick={()=>onAdd(c,kind)} style={{width:'100%',padding:'13px 10px',borderRadius:12,border:'none',fontWeight:900,fontSize:15,background:'linear-gradient(100deg,'+palette(kind).secondary+','+palette(kind).main+')',color:'#091529'}}>＋ AJOUTER À MES PARIS · 5 $</button>
  </article>):<p className="empty">Aucune combinaison de deux branches ou plus ne dépasse actuellement 40 % de chances estimées avec une EV positive.</p>}</div>)}
 </section>;
}