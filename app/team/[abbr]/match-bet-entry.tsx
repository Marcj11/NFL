'use client';
import {useState} from 'react';

export type MatchPick={market:string;name:string;player?:string;point?:number;book:string;decimal:number;probability:number};
export default function MatchBetEntry({pick,gameId,game,team}:{pick:MatchPick;gameId:string;game:string;team:string}){
 const [open,setOpen]=useState(false),[price,setPrice]=useState(String(pick.decimal)),[stake,setStake]=useState('5'),[error,setError]=useState('');
 const record=()=>{
  const odds=Number(price.replace(',','.')),amount=Number(stake.replace(',','.'));
  if(!Number.isFinite(odds)||odds<=1||!Number.isFinite(amount)||amount<=0){setError('La cote doit dépasser 1,00 et la mise doit être positive.');return}
  const market=['player_pass_yds','player_rush_yds','player_reception_yds'].includes(pick.market)?'props':pick.market==='h2h'?'moneyline':pick.market;
  const item={id:'match:'+gameId+':'+pick.market+':'+pick.name+':'+Date.now(),game,market,selection:(pick.player?pick.player+' · ':'')+pick.name+(typeof pick.point==='number'?' '+pick.point:''),line:pick.point,book:pick.book,odds:pick.decimal,prob:pick.probability,team,player:pick.player,stake:amount,chosenOdds:odds,placedAt:new Date().toISOString(),status:'open'};
  try{const key='nfl-studio-bets-v1';const previous=JSON.parse(localStorage.getItem(key)||'[]');const all=[item,...(Array.isArray(previous)?previous:[])];localStorage.setItem(key,JSON.stringify(all));const secret=localStorage.getItem('nfl-studio-wallet-secret');if(secret)fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',secret,bets:all})}).catch(()=>{});setOpen(false);setError('')}catch{setError('Impossible d’enregistrer le billet dans ce navigateur.')}
 };
 return <>
  <button type="button" onClick={()=>{setPrice(String(pick.decimal));setStake('5');setError('');setOpen(true)}} style={{width:'100%',marginTop:13,padding:12,border:'1px solid #8beaff',borderRadius:10,fontWeight:900,background:'linear-gradient(120deg,#5feeba,#4ba9ff)',color:'#061626',cursor:'pointer'}}>Gros, fais pas ton peureux, clic icitte →</button>
  {open&&<div role="presentation" onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:99999,display:'grid',placeItems:'center',padding:16,background:'rgba(0,6,18,.91)',backdropFilter:'blur(12px)'}}>
   <div role="dialog" aria-modal="true" aria-label="Enregistrer un pari" onClick={e=>e.stopPropagation()} style={{width:'min(490px,100%)',padding:24,border:'1px solid #72cdff',borderRadius:18,background:'linear-gradient(145deg,#103b63,#091627)',boxShadow:'0 0 55px #1184d966',color:'#fff'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:14}}><h2 style={{fontSize:22,margin:0}}>🏈 LES BOYS, ON MISE COMBIEN ?</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Fermer">✕</button></div>
    <p style={{fontWeight:750}}>{pick.player||pick.name}{typeof pick.point==='number'?' · '+pick.point:''}</p>
    <p>Booker : {pick.book} · cote affichée : {pick.decimal.toFixed(2)}</p>
    <div style={{display:'flex',gap:15,flexWrap:'wrap'}}><label>Cote réellement obtenue<input type="number" min="1.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} style={{display:'block',padding:10,width:155,color:'#111'}}/></label><label>Mise ($ CAD)<input type="number" min="0.01" step="0.50" value={stake} onChange={e=>setStake(e.target.value)} style={{display:'block',padding:10,width:155,color:'#111'}}/></label></div>
    <p>Profit potentiel : {Number(price)>1&&Number(stake)>0?(Number(stake)*(Number(price)-1)).toFixed(2)+' $':'—'}</p>
    {error&&<p style={{color:'#ffbbab'}}>{error}</p>}
    <button type="button" onClick={record} style={{width:'100%',padding:13,border:0,borderRadius:10,fontWeight:900,background:'#51eaba',color:'#081a2b',cursor:'pointer'}}>ENREGISTRER DANS MES PARIS EN COURS, ESTI !</button>
    <p style={{fontSize:12,color:'#c4d8e6'}}>Le billet est conservé localement et synchronisé si ton coffre privé est relié.</p>
   </div>
  </div>}
 </>;
}
