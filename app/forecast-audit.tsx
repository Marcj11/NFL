'use client';
import {useEffect,useState} from 'react';
type Bucket={range:string;n:number;predicted:number|null;observed:number|null};
type Model={name:string;forecastCount:number;settledCount:number;brier:number|null;calibration:Bucket[]};
export default function ForecastAudit(){
 const [models,SET]=useState<Model[]>([]),[status,STATUS]=useState('loading');
 useEffect(()=>{let ok=true;fetch('/api/forecast-audit',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(ok){SET(Array.isArray(d.models)?d.models:[]);STATUS(d.status||'unavailable')}}).catch(()=>{if(ok)STATUS('unavailable')});return()=>{ok=false}},[]);
 return <section style={{padding:18,border:'1px solid #359ecf',borderRadius:15,background:'#0b2847',margin:'20px 0'}}><h2>🧠 BULLETIN DE NOTES DES MOTEURS</h2><p style={{fontSize:12}}>Brier Score et calibration basés exclusivement sur des prédictions sauvegardées avant chaque match et des résultats confirmés. Plus le Brier est faible, mieux c’est.</p>
 {status!=='ok'?<p>Registre des modèles temporairement indisponible.</p>:models.length===0?<p>Aucune prévision pré-match encore enregistrée dans le nouveau registre. On n’inventera pas un Brier Score.</p>:models.map(m=><div key={m.name} style={{borderTop:'1px solid #3f779b',padding:'13px 0'}}><strong>{m.name}</strong><p>{m.settledCount} rencontres évaluées sur {m.forecastCount} prévisions · Brier Score : {m.brier===null?'En attente':m.brier.toFixed(4)}</p><div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:6}}>{m.calibration.map(b=><div key={b.range} style={{minWidth:0,fontSize:10,border:'1px solid #387db0',borderRadius:8,padding:6}}><b>{b.range}</b><p>{b.n} matchs</p><p>Prédit : {b.predicted===null?'—':(b.predicted*100).toFixed(0)+'%'}</p><p>Réel : {b.observed===null?'—':(b.observed*100).toFixed(0)+'%'}</p></div>)}</div></div>)}
 </section>;
}
