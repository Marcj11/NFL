'use client';
import {useEffect,useState} from 'react';
type Event={id:string;matchup:string;time:string;type:string;title:string;detail:string;url:string};
const look:Record<string,{icon:string,color:string,shade:string,quip:string}>={
 injury:{icon:'🚑',color:'#ff849c',shade:'rgba(244,76,106,.20)',quip:'Aïe tabarnak, ça pourrait changer la game. On attend de savoir si le gars revient.'},
 turnover:{icon:'⚡',color:'#ffbe70',shade:'rgba(245,157,65,.19)',quip:'Osti, le ballon change de bord! Ça vient de brasser solide.'},
 touchdown:{icon:'🏈',color:'#68f6bb',shade:'rgba(40,217,150,.18)',quip:'BANG! Six points dans les dents, ça réveille le salon en esti!'},
 sack:{icon:'💥',color:'#ffad86',shade:'rgba(241,126,73,.20)',quip:'Le QB vient de manger le gazon en esti. Sa ligne l’a laissé dans le trouble!'},
 big_catch:{icon:'🎯',color:'#8acfff',shade:'rgba(63,164,255,.20)',quip:'Crisse de grosse réception! La défensive vient de se faire ouvrir solide.'},
 big_run:{icon:'🏃',color:'#c1a0ff',shade:'rgba(139,92,246,.20)',quip:'Tabarnak, le porteur vient de trouver une autoroute!'}
};
export default function HighlightTicket(){
 const [events,SET]=useState<Event[]>([]);
 const [index,INDEX]=useState(0);
 const [state,STATE]=useState('Chargement des faits saillants ESPN…');
 useEffect(()=>{let alive=true;const load=async()=>{try{const res=await fetch('/api/live-highlights',{cache:'no-store'});if(!res.ok)throw Error();const data=await res.json();if(!alive)return;const next=Array.isArray(data.events)?data.events as Event[]:[];SET(next);STATE(next.length?'':'Aucun fait saillant confirmé en direct pour le moment.')}catch{if(alive)STATE('ESPN temporairement indisponible.')}};void load();const id=setInterval(()=>{void load()},60000);return()=>{alive=false;clearInterval(id)}},[]);
 useEffect(()=>{const timer=setInterval(()=>INDEX(v=>v+1),30000);return()=>clearInterval(timer)},[]);
 const item=events.length?events[index%events.length]:null;
 const style=look[item?.type||'']||look.sack;
 return <article className="studio-live-ticket" style={{position:'relative',overflow:'hidden',minHeight:340,borderRadius:22,border:'1px solid '+style.color,background:'linear-gradient(140deg,'+style.shade+',#101c36 65%,#0c172a)',boxShadow:'inset 0 0 35px '+style.shade+',0 0 24px #14324b99',padding:'22px 19px',display:'flex',flexDirection:'column',gap:12}}>
  <div style={{position:'absolute',inset:'0 0 auto',height:4,background:'linear-gradient(90deg,'+style.color+',transparent)'}}/>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
   <strong style={{letterSpacing:1,color:'#f7fbff',fontSize:13}}>🔥 CE QUI BRASSE LIVE</strong>
   <span style={{fontSize:11,color:style.color,fontWeight:900}}>ESPN · 30 SEC / FAIT</span>
  </div>
  {item?<><div style={{fontSize:12,fontWeight:900,color:style.color}}>{style.icon} {item.matchup} {item.time?' · '+item.time:''}</div>
   <h3 style={{fontSize:23,margin:0,lineHeight:1.15,color:'#fff'}}>{item.title}</h3>
   <p style={{fontSize:13,lineHeight:1.5,color:'#cfe1ee',margin:0}}>{item.detail}</p>
   <div style={{background:'rgba(0,0,0,.23)',border:'1px solid '+style.color+'70',borderRadius:13,padding:13}}>
    <div style={{color:style.color,fontSize:11,letterSpacing:1,fontWeight:900,marginBottom:6}}>🎙️ LE VESTIAIRE DIT</div>
    <strong style={{fontSize:14,lineHeight:1.5,color:'#fff'}}>{style.quip}</strong>
   </div>
   <div style={{marginTop:'auto',display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',flexWrap:'wrap'}}>
    <a href={item.url} rel="noopener noreferrer" target="_blank" style={{color:'#9ae8ff',fontWeight:850,fontSize:12}}>LIRE SUR ESPN ↗</a>
    <span style={{fontSize:12,color:'#b6cce0'}}>Fait {(index%events.length)+1} / {events.length}</span>
    <button type="button" onClick={()=>INDEX(v=>v+1)} style={{border:'1px solid #77cbed',borderRadius:9,padding:'9px 12px',color:'#fff',background:'#214366',fontWeight:850,cursor:'pointer'}}>Suivant ›</button>
   </div>
  </>:<div style={{margin:'auto 0',textAlign:'center',color:'#c3d9e8',padding:'30px 5px'}}><div style={{fontSize:45,marginBottom:15}}>🏈</div>{state}</div>}
  <small style={{color:'#8aaac0'}}>Faits réels : ESPN play-by-play · Commentaire original NFL Studio</small>
 </article>;
}
