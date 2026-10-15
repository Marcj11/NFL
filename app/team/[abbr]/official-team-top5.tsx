'use client';
import {useEffect,useState} from 'react';
type Pick={selection?:string;market?:string;line?:number;odds?:number;bookmaker?:string;probability?:number|null;decision?:string;explanation?:string;reason?:string};
type Game={game_id?:string;match?:string;away_team?:string;home_team?:string;home_probability?:number|null;away_probability?:number|null;moneyline?:Pick;top5?:Pick[]};
type Payload={connected?:boolean;reason?:string;report?:{rows?:Game[];games?:Game[]}|null};
const pct=(n:number|null|undefined)=>typeof n==='number'&&n>=0&&n<=1?(n*100).toFixed(1)+' %':'Non calculee';
export default function OfficialTeamTop5({team}:{team:string}){
 const [data,setData]=useState<Payload|null>(null);
 useEffect(()=>{let active=true;fetch('/api/expert-independent',{cache:'no-store'}).then(r=>r.json()).then(j=>{if(active)setData(j)}).catch(()=>{if(active)setData({connected:false,reason:'connexion_indisponible'})});return()=>{active=false}},[]);
 const rows=data?.report?.games||data?.report?.rows||[];
 const game=rows.find(x=>x.home_team===team||x.away_team===team);
 const choice=game?.moneyline;
 const picks=Array.isArray(game?.top5)?game.top5.slice(0,5):[];
 const explanation=(p:Pick)=>p.explanation?.trim()||p.reason?.trim()||'Explication non fournie par le moteur : decision non validable.';
 const status=(p:Pick)=>p.decision==='MISER'||p.decision==='bet'?(p.explanation?.trim()||p.reason?.trim()?'MISER':'EN ATTENTE'):'PASSER';
 return <section style={{background:'#061321',border:'1px solid #31587b',borderRadius:22,padding:22,margin:'24px 0',color:'#eaf5ff'}}>
 <h2>EXPERT NFL · PROCHAIN AFFRONTEMENT</h2>
 <p style={{fontSize:13,color:'#a9c5db'}}>Moteur independant · {game?.match||'Affrontement non disponible'}</p>
 {!data?<p>Chargement des predictions...</p>:!data.connected?<p>Aucune prediction du moteur independant publiee. {data.reason||''}</p>:null}
 <div style={{background:'#132a3f',border:'1px solid #294f70',borderRadius:12,padding:14,margin:'12px 0'}}>
 <h3>MONEYLINE</h3>
 <p>{game?.away_team||'Visiteur'} : <b>{pct(game?.away_probability)}</b> · {game?.home_team||'Domicile'} : <b>{pct(game?.home_probability)}</b></p>
 <p>{choice?.selection||'Selection non publiee'} · {choice?.bookmaker||'Bookmaker non fourni'} · Cote : {choice?.odds??'Non disponible'}</p>
 <strong>{choice?status(choice):'EN ATTENTE'}</strong>
 <p style={{fontSize:13,color:'#b8cede'}}>Pourquoi : {choice?explanation(choice):'Aucun calcul independant disponible pour ce match; aucune mise recommandee.'}</p>
 </div>
 <h3>TOP 5 · MEILLEURS PARIS DU MATCH</h3>
 {Array.from({length:5},(_,i)=>{const p=picks[i];return <article key={i} style={{background:'#132a3f',border:'1px solid #294f70',borderRadius:12,padding:12,margin:'7px 0'}}>
 <strong>#{i+1} · {p?.selection||'Selection non disponible'}</strong>
 <div style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:8}}><span>{p?.market||'Marche non evalue'}</span><span>{p?.bookmaker||'Bookmaker indisponible'} · {p?.odds??'Cote indisponible'}</span><b>{pct(p?.probability)}</b><b>{p?status(p):'EN ATTENTE'}</b></div>
 <p style={{fontSize:13,color:'#b8cede'}}>Pourquoi : {p?explanation(p):'Le moteur independant n a pas publie de selection verifiee.'}</p>
 </article>})}
 <p style={{fontSize:12,color:'#adc2d5'}}>Chaque decision doit etre justifiee, y compris MISER. Aucun resultat de l ancien plugin Sites.</p>
 </section>
}
