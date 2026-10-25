'use client';
import {useEffect,useState} from 'react';
type Game={id:string;home:{abbr:string;score:number};away:{abbr:string;score:number};state:string;status:string};
type Notice={id:string;message:string;date:string;kind:string};
export default function NflNotifications(){
 const [items,SET]=useState<Notice[]>([]),[open,OPEN]=useState(false);
 useEffect(()=>{
  let alive=true;
  const poll=async()=>{
   try{
    const r=await fetch('/api/live-coverage',{cache:'no-store'});if(!r.ok)return;
    const data=await r.json(),games:Game[]=Array.isArray(data.games)?data.games:[];
    const key='nfl-studio-notification-scores-v1';
    const old:Record<string,string>=JSON.parse(localStorage.getItem(key)||'{}'),now:Record<string,string>={};
    const notices:Notice[]=[];
    for(const g of games){
     const current=g.away.score+'-'+g.home.score;now[g.id]=current;
     if(old[g.id]&&old[g.id]!==current&&g.state==='in'){
      notices.push({id:g.id+':'+current,message:'🏈 Le score a changé : '+g.away.abbr+' '+g.away.score+' – '+g.home.abbr+' '+g.home.score,date:new Date().toISOString(),kind:'score'});
     }
    }
    if(!alive)return;
    if(notices.length)SET(prev=>[...notices,...prev].slice(0,25));
    localStorage.setItem(key,JSON.stringify({...old,...now}));
   }catch{}
  };poll();const timer=setInterval(poll,60000);return()=>{alive=false;clearInterval(timer)}
 },[]);
 return <section style={{margin:'12px 0',padding:13,borderRadius:13,border:'1px solid #3d88c7',background:'#091e36'}}>
 <button onClick={()=>OPEN(v=>!v)} type="button" style={{cursor:'pointer',border:0,background:'transparent',color:'#8bebdb',fontWeight:900}}>🔔 CENTRE DE NOTIFICATIONS {items.length?'('+items.length+')':''} {open?'▴':'▾'}</button>
 {open&&<div style={{marginTop:12}}><p style={{fontSize:12,color:'#bad5e6'}}>Les alertes de scores arrivent ici lorsque NFL Studio est ouvert. Les alertes QB, blessures et cotes nécessitent encore des changements confirmés par une source adaptée; aucune notification inventée.</p>{items.length?items.map(n=><p key={n.id} style={{fontSize:12,padding:9,background:'#13345a',borderRadius:8}}>{n.message}</p>):<p style={{fontSize:12}}>Aucune nouvelle alerte depuis l'ouverture.</p>}</div>}
 </section>;
}
