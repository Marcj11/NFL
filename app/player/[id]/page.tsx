'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
type Athlete={id:string;displayName?:string;fullName?:string;headshot?:{href?:string};team?:{displayName?:string;abbreviation?:string};position?:{displayName?:string};injuries?:unknown[]};
type Game={date:string;opponent:string;stats:Record<string,string>};
export default function PlayerPage(){
 const {id}=useParams<{id:string}>();
 const [data,SET]=useState<{athlete:Athlete|null;games:Game[];source:string;status:string}|null>(null);
 useEffect(()=>{let active=true;fetch('/api/players/profile?id='+encodeURIComponent(id)).then(r=>r.json()).then(d=>{if(active)SET(d)}).catch(()=>{if(active)SET({athlete:null,games:[],source:'ESPN',status:'unavailable'})});return()=>{active=false}},[id]);
 const a=data?.athlete,games=data?.games||[];
 return <main style={{maxWidth:1100,margin:'auto',padding:'22px 18px 100px',color:'#eaf7ff',background:'#061426',minHeight:'100vh',fontFamily:'Arial,sans-serif'}}>
 <a href="/" style={{color:'#87dbff'}}>← NFL STUDIO / ACCUEIL</a>
 <section style={{marginTop:20,padding:25,borderRadius:20,border:'1px solid #54b3f9',background:'radial-gradient(ellipse at right top,#295ab383,transparent 60%),#102947',display:'flex',flexWrap:'wrap',gap:20,alignItems:'center'}}>
 {a?.headshot?.href?<img src={a.headshot.href} alt={a.displayName||''} style={{width:160,height:160,objectFit:'contain'}}/>:<div style={{fontSize:70}}>🏈</div>}
 <div><span style={{color:'#85e9cc',fontWeight:900}}>✦ FICHE JOUEUR · ESPN</span><h1 style={{fontSize:'clamp(28px,5vw,52px)',margin:'9px 0'}}>{a?.displayName||a?.fullName||'Joueur NFL'}</h1><p>{a?.team?.displayName||'Équipe à confirmer'} · {a?.position?.displayName||'Position à confirmer'}</p><small>Source : ESPN · Aucune blessure déduite des statistiques historiques</small></div>
 </section>
 <section style={{marginTop:22,padding:22,borderRadius:18,background:'#0d2440',border:'1px solid #388dcc'}}><h2>📈 LES 5 DERNIÈRES PERFORMANCES</h2>
 {games.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:12}}>{games.map((g,i)=><div key={i} style={{padding:12,borderRadius:12,background:'#152f51',border:'1px solid #4589af'}}><strong>{g.opponent}</strong><p style={{fontSize:12}}>{g.date}</p>{Object.entries(g.stats).slice(0,6).map(([k,v])=><p key={k} style={{fontSize:12}}>{k}: <strong>{v}</strong></p>)}</div>)}</div>:<p>Statistiques des cinq derniers matchs non disponibles à partir de la source actuelle. Aucune donnée inventée.</p>}
 </section>
 <section style={{marginTop:22,padding:22,borderRadius:18,background:'#0d2440',border:'1px solid #388dcc'}}><h2>🎯 PLAYER PROPS</h2><p>Cette fiche présente les données sportives disponibles. L'analyse d'un pari nécessite en plus une ligne et une cote réelles, ainsi qu'une probabilité calibrée. Aucun avantage fictif n'est affiché.</p></section>
 </main>;
}
