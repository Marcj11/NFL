'use client';
import {useEffect,useState} from 'react';
type Game={game_id?:string;match?:string;away_team?:string;home_team?:string;favorite?:string|null;favorite_probability?:number|null;home_probability?:number|null;away_probability?:number|null;decision?:string;summary?:string;status?:string};
type Payload={connected?:boolean;report?:{id?:string;created_at?:string;model_version?:string;rows?:Game[]}};
export default function OfficialTeamTop5({team}:{team:string}){
 const [data,setData]=useState<Payload|null>(null);
 useEffect(()=>{let active=true;fetch('/api/expert-independent',{cache:'no-store'}).then(r=>r.json()).then(j=>{if(active)setData(j)}).catch(()=>{if(active)setData({connected:false})});return()=>{active=false}},[]);
 const report=data?.report;
 const games=(Array.isArray(report?.rows)?report.rows:[]).filter(x=>x.home_team===team||x.away_team===team);
 const probability=(x:Game)=>x.favorite===x.home_team?x.home_probability:x.favorite===x.away_team?x.away_probability:x.favorite_probability;
 const categories=['Moneyline','Spreads','Player Props','Heavyball'];
 return <section style={{background:'#061321',border:'1px solid #31587b',borderRadius:22,padding:22,margin:'24px 0',color:'#eaf5ff'}}>
 <h2>EXPERT NFL · TOP 5 PAR CATEGORIE</h2>
 <p style={{fontSize:13,color:'#a9c5db'}}>Source EXPERT NFL independant · Rapport {report?.id||'non disponible'} · {report?.model_version||''} · {report?.created_at||''}</p>
 {!data?<p>Chargement du rapport officiel...</p>:!data.connected?<p>Rapport EXPERT NFL indisponible.</p>:null}
 {categories.map(cat=><div key={cat} style={{margin:'22px 0'}}><h3 style={{color:'#8fcaff'}}>{cat.toUpperCase()}</h3>
 {Array.from({length:5},(_,i)=>{const g=cat==='Moneyline'?games[i]:undefined;const p=g?probability(g):null;const hasP=typeof p==='number';const decision=g?.decision==='bet'?'MISER':'PASSER';
 return <article key={i} style={{background:'#132a3f',border:'1px solid #294f70',borderRadius:12,padding:12,margin:'7px 0'}}>
 <strong>#{i+1} · {g?.match||'Selection officielle indisponible'}</strong>
 <div style={{display:'flex',flexWrap:'wrap',gap:14,marginTop:8}}><span>{g?.favorite?'Choix : '+g.favorite:'Aucun choix officiel'}</span><b>{hasP?(Number(p)*100).toFixed(1)+' %':'Probabilite non calculee'}</b><b style={{color:decision==='MISER'?'#78e4b2':'#f8c76c'}}>{decision}</b></div>
 {g?.summary&&<p style={{fontSize:13,color:'#b8cede'}}>{g.summary}</p>}
 </article>})}</div>)}
 <p style={{fontSize:12,color:'#adc2d5'}}>Les emplacements sans calcul officiel restent visibles avec PASSER et sans probabilite. Aucune simulation ni cote inventee.</p>
 </section>
}
