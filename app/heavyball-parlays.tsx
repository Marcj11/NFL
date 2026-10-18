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
 return <section style={{display:'grid',gap:15,margin:'16px 0'}}>
  <p style={{padding:13,border:'1px solid #e7b665',borderRadius:12,color:'#ffdfa0'}}>Projections expérimentales non calibrées. Les matchs sont supposés indépendants, et les meilleures cotes peuvent provenir de bookmakers différents. Vérifier la disponibilité réelle avant toute mise.</p>
  {(['regular','heavyball'] as const).map(kind=><div key={kind} style={{display:'grid',gap:12}}><h3 style={{fontSize:22,color:kind==='heavyball'?'#ffa85d':'#74f5da'}}>{kind==='heavyball'?'🔥 TOP 5 HEAVYBALL PARLAYS':'🔗 TOP 5 PARLAYS PRUDENTS'}</h3>{pick(kind).length?pick(kind).map((c,i)=><article key={c.legs.map(o=>o.id).join('|')} style={{padding:20,border:'1px solid #00cfff',borderRadius:20,background:'linear-gradient(145deg,#071e37,#151332)',boxShadow:'0 0 18px #00cfff22'}}>
   <strong style={{color:'#61f7dd'}}>{kind==='heavyball'?'HEAVYBALL':'PRUDENT'} PARLAY #{i+1} · {c.legs.length} BRANCHES</strong>
   <h3 style={{fontSize:23,margin:'9px 0'}}>Cote {c.odds.toFixed(2)} · {(c.chance*100).toFixed(1)} % estimé</h3>
   {c.legs.map((o,j)=><div key={o.id} style={{borderTop:'1px solid #395270',padding:'10px 0'}}><strong>{j+1}. {o.selection}</strong><div style={{fontSize:13,color:'#b4cbe0'}}>{o.game} · cote {o.odds.toFixed(2)} · {((probability(o)??0)*100).toFixed(1)} % · {o.book}</div></div>)}
   <p style={{color:'#64ecc1',fontWeight:850}}>EV théorique +{(c.ev*100).toFixed(1)} % · 5 $ → {(5*c.odds).toFixed(2)} $ brut potentiel</p>
   <button type="button" className="pick-action" onClick={()=>onAdd(c,kind)}>Ajouter à Mes paris — 5 $</button>
  </article>):<p className="empty">Aucune combinaison de deux branches ou plus ne dépasse actuellement 40 % de chances estimées avec une EV positive.</p>}</div>)}
 </section>;
}