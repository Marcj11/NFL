'use client';
import {useEffect,useState} from 'react';
type Bucket={range:string;n:number;predicted:number|null;observed:number|null};
type Model={name:string;forecastCount:number;settledCount:number;brier:number|null;calibration:Bucket[]};
export default function ForecastAudit(){
 const [models,SET]=useState<Model[]>([]),[status,STATUS]=useState('loading'),[stored,STORED]=useState(0),[settlement,SETTLEMENT]=useState('unknown');
 useEffect(()=>{let ok=true;fetch('/api/forecast-audit',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(ok){SET(Array.isArray(d.models)?d.models:[]);STORED(Number(d.storedForecasts)||0);SETTLEMENT(String(d.settlementStatus||'unknown'));STATUS(d.status||'unavailable')}}).catch(()=>{if(ok)STATUS('unavailable')});return()=>{ok=false}},[]);
 return <section style={{padding:18,border:'1px solid #359ecf',borderRadius:15,background:'#0b2847',margin:'20px 0'}}><h2>🧠 BULLETIN DE NOTES DES MOTEURS</h2><p style={{fontSize:12}}>Brier Score et calibration basés exclusivement sur des prédictions sauvegardées avant chaque match et des résultats confirmés. Plus le Brier est faible, mieux c’est.</p>
 <div style={{border:'1px solid #467da7',borderRadius:12,padding:'12px 14px',background:'#08213b',margin:'12px 0'}}>
  <strong>📚 TEST HISTORIQUE — MODÈLE DE RÉFÉRENCE</strong>
  <p style={{fontSize:14,margin:'8px 0'}}>219 matchs testés · 63,0 % de résultats corrects · Brier 0,2221</p>
  <p style={{fontSize:12,color:'#b5d4e8',margin:0}}>Calcul du 15 octobre 2026 : prévisions reconstituées uniquement avec les matchs antérieurs, scores historiques et avantage à domicile. Référence à 50 % : Brier 0,2500. Ce test rétrospectif n'est pas une mesure prospective des deux moteurs complets ni une garantie de rentabilité.</p>
 </div>
 {status==='ok'&&<p style={{fontSize:13,color:'#bbdfef'}}>Prévisions réellement enregistrées : <strong>{stored}</strong> · Évaluation automatique : {settlement==='ok'?'connectée':'à vérifier'} · Les matchs non terminés restent en attente.</p>}
 {status!=='ok'?<p>Registre des modèles temporairement indisponible.</p>:models.length===0?<p>Aucune prévision pré-match encore enregistrée dans le nouveau registre. On n’inventera pas un Brier Score.</p>:models.map(m=><div key={m.name} style={{borderTop:'1px solid #3f779b',padding:'13px 0'}}><strong>{m.name}</strong><p>{m.settledCount} rencontres évaluées sur {m.forecastCount} prévisions · Brier Score : {m.brier===null?'En attente':m.brier.toFixed(4)}</p><div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:6}}>{m.calibration.map(b=><div key={b.range} style={{minWidth:0,fontSize:10,border:'1px solid #387db0',borderRadius:8,padding:6}}><b>{b.range}</b><p>{b.n} matchs</p><p>Prédit : {b.predicted===null?'—':(b.predicted*100).toFixed(0)+'%'}</p><p>Réel : {b.observed===null?'—':(b.observed*100).toFixed(0)+'%'}</p></div>)}</div></div>)}
 </section>;
}
