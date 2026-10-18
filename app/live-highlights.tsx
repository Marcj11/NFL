'use client';
import {useEffect,useState} from 'react';
type Highlight={id:string;gameId:string;matchup:string;time:string;type:string;title:string;detail:string;source:string;url:string};
export default function LiveHighlights(){
 const [items,setItems]=useState<Highlight[]>([]);
 const [updated,setUpdated]=useState('');
 useEffect(()=>{
  let mounted=true;
  const load=async()=>{
   try{
    const response=await fetch('/api/live-highlights',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json();
    if(mounted&&data.status==='ok'){
     setItems(Array.isArray(data.events)?data.events:[]);
     setUpdated(String(data.updatedAt||''));
    }
   }catch{}
  };
  void load();
  const interval=setInterval(()=>{void load()},60000);
  return()=>{mounted=false;clearInterval(interval)};
 },[]);
 const badge=(type:string)=>type==='injury'?'🩹':type==='turnover'?'⚠️':type==='touchdown'?'🏈':type==='big_catch'?'🙌':type==='big_run'?'🏃':'💥';
 return <section className="studio-highlights">
  <div className="studio-highlights-head"><strong>📰 LES GROS MOMENTS EN DIRECT</strong><span>ESPN · chaque minute</span></div>
  <p>Sacks du QB, courses de 20+ verges, réceptions de 25+ verges, interceptions, fumbles, touchés et blessures signalées explicitement.</p>
  {items.length>0?
   <div className="studio-highlights-grid">{items.slice(0,12).map(x=>
    <a href={x.url} key={x.id} target="_blank" rel="noreferrer" className="studio-highlights-item">
     <strong>{badge(x.type)} {x.title} · {x.matchup}</strong>
     <span>{x.detail}</span>
     <small>Source : ESPN {x.time?'· '+x.time:''} ↗</small>
    </a>
   )}</div>:
   <p>Aucun fait majeur confirmé transmis par ESPN pour le moment.</p>}
  {updated&&<small>Vérifié à {new Date(updated).toLocaleTimeString('fr-CA',{timeZone:'America/Toronto'})}</small>}
 </section>
}