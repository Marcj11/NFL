'use client';
import {useState} from 'react';
import {preparedBets} from './prepared-bets';
export default function ImportParis(){
 const [code,setCode]=useState('');
 const [status,setStatus]=useState('Les nouveaux billets sont prêts à être ajoutés au coffre.');
 const [busy,setBusy]=useState(false);
 async function importFile(file:File|null,ready?:unknown){
  if(!file&&!ready)return;
  setBusy(true);
  try{
   const raw=ready??JSON.parse(await file!.text());
   if(!Array.isArray(raw)||raw.length>100||raw.some((x:any)=>!x||typeof x.id!=='string'||!x.id||!x.game||!x.selection||!(Number(x.chosenOdds)>1)||!(Number(x.stake)>0)))throw Error('Fichier de paris invalide.');
   const secret=code.trim().toLowerCase();
   if(!secret)throw Error('Inscris le code de ton coffre.');
   const req=async(action:string,body:object)=>{const r=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,secret,...body})});if(!r.ok)throw Error('Erreur de connexion au coffre');return r.json()};
   const existing=await req('read',{});
   const before=Array.isArray(existing.bets)?existing.bets:[];
   const ids=new Set(before.map((x:any)=>x.id));
   const additions=raw.filter((x:any)=>!ids.has(x.id));
   if(!additions.length){setStatus('Tous les billets sont déjà présents. Aucun doublon ajouté.');return}
   const merged=[...additions,...before];
   const saved=await req('save',{bets:merged,startingBalance:Number(existing.startingBalance||0)});
   if(!saved.ok)throw Error('Enregistrement non confirmé.');
   const verified=await req('read',{});
   const confirmed=new Set((verified.bets||[]).map((x:any)=>x.id));
   if(additions.some((x:any)=>!confirmed.has(x.id)))throw Error('Vérification du coffre échouée.');
   localStorage.setItem('nfl-studio-wallet-secret',secret);
   const local=JSON.parse(localStorage.getItem('nfl-studio-bets-v1')||'[]');
   const map=new Map((verified.bets||[]).map((x:any)=>[x.id,x]));
   for(const x of (Array.isArray(local)?local:[]))if(!map.has(x.id))map.set(x.id,x);
   localStorage.setItem('nfl-studio-bets-v1',JSON.stringify([...map.values()]));
   setStatus(additions.length+' billet(s) importé(s), vérifiés dans le coffre. Total : '+(verified.bets||[]).length+'. Retourne à Mes paris.');
  }catch(e){setStatus(e instanceof Error?e.message:'Importation impossible');}
  finally{setBusy(false)}
 }
 return <main style={{maxWidth:650,margin:'50px auto',padding:25,color:'#fff',background:'#10243c',borderRadius:20}}>
 <a href="/" style={{color:'#8adfff'}}>← Heavyball Bet</a><h1>Importer mes paris</h1>
 <p>Importation sécurisée : les billets existants restent dans le coffre et les numéros déjà présents sont ignorés.</p>
 <label>Code du coffre<input value={code} onChange={e=>setCode(e.target.value)} placeholder="Code de ton coffre" style={{display:'block',padding:13,width:'100%',margin:'8px 0 22px',color:'#111'}} /></label>
 <button type="button" disabled={busy} onClick={()=>void importFile(null,preparedBets)} style={{display:'block',padding:18,width:'100%',margin:'20px 0',background:'#55e5ac',color:'#071c26',border:0,borderRadius:12,fontWeight:950,fontSize:18}}>AJOUTER LES NOUVEAUX BILLETS À MES PARIS</button><label style={{display:'block'}}>Fichier des billets (.json)<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>void importFile(e.target.files?.[0]||null)} style={{display:'block',margin:'12px 0',padding:16,maxWidth:'100%'}} /></label>
 <p role="status" style={{color:'#98eacb',fontWeight:800}}>{busy?'Enregistrement en cours…':status}</p>
 </main>
}