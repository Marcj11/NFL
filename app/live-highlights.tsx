'use client';
import {useEffect,useMemo,useState} from 'react';
type Highlight={id:string;gameId:string;matchup:string;time:string;type:string;title:string;detail:string;source:string;url:string};
const styles:Record<string,{icon:string;label:string;accent:string;rgb:string}>={
 injury:{icon:'🚑',label:'ALERTE BLESSURE',accent:'#ff7998',rgb:'255,90,124'},
 turnover:{icon:'⚡',label:'REVIREMENT',accent:'#ffcb70',rgb:'245,174,71'},
 touchdown:{icon:'🏈',label:'TOUCHDOWN',accent:'#65ffc0',rgb:'59,234,155'},
 sack:{icon:'💥',label:'SACK DU QB',accent:'#ffac76',rgb:'255,133,74'},
 big_catch:{icon:'🎯',label:'GROSSE RÉCEPTION',accent:'#80cbff',rgb:'60,176,255'},
 big_run:{icon:'🏃',label:'LONGUE COURSE',accent:'#b49aff',rgb:'148,113,255'}
};
function voice(x:Highlight){
 const seed=[...x.id].reduce((a,c)=>a+c.charCodeAt(0),0);
 const choices:Record<string,string[]>={
 injury:["Aïe, tabarnak. Si ce gars-là sort pour de bon, ça peut brasser dans le plan de match.","Ouch. Ça, c’est le genre de nouvelle qui peut foutre une attaque dans le trouble. On attend la confirmation.","Crisse, pas le temps de niaiser : faudra voir s’il revient avant de paniquer sur les paris."],
 turnover:["Osti, ça vient de virer de bord d’une claque! Une possession de cadeau, ça pardonne rarement.","Tabarnak, le ballon change de bord pis le momentum aussi. Méchant coup de théâtre.","Ben voyons donc! Un revirement de même, ça te change une game plus vite qu’un coup de sifflet."],
 touchdown:["BANG! Les boys viennent de planter six points. Ça commence à sentir la poudre!","Tabarnak, ça c’est répondre sur le terrain. Le tableau vient de prendre une claque.","Le voilà, le maudit touché! Le match vient de se réveiller solide."],
 sack:["Le QB vient de se faire ramasser en esti. Sa ligne l’a laissé dans le trafic!","Ouch! Le quart vient de manger le gazon, pis pas à peu près.","La protection vient de prendre le bord, tabarnak. Gros coup de pression sur cette série."],
 big_catch:["Crisse de belle réception! La défensive vient de se faire ouvrir une porte en plein milieu.","Ça, mon chum, c’est une passe qui fait lever le salon au complet!","Osti que ça voyage vite quand le receveur trouve de l’espace!"],
 big_run:["Le porteur a trouvé une autoroute, tabarnak! La défense a manqué le virage.","Crisse, il est parti comme une fusée. Belle façon de faire avancer les chaînes!","Ça court en maudit! Les secondeurs vont revoir ce jeu-là sur la tablette."]
 };
 const a=choices[x.type]||choices.turnover;return a[seed%a.length];
}
function frenchSummary(x:Highlight){
 const d=x.detail;
 const yard=d.match(/(?:for|gain of) (\d+) yards/i);
 const y=yard?' de '+yard[1]+' verges':'';
 const descriptions:Record<string,string>={
 injury:'ESPN signale une possible blessure pendant ce match. Le statut du joueur doit être confirmé.',
 turnover:'ESPN rapporte un changement de possession important sur cette séquence.',
 touchdown:'Un touché vient d’être inscrit, selon le suivi des jeux ESPN.',
 sack:'Le quarterback a été plaqué derrière la ligne de mêlée, selon ESPN.',
 big_catch:'ESPN signale une réception explosive'+y+' qui fait progresser l’attaque.',
 big_run:'ESPN signale une longue course'+y+' qui donne un gros gain à l’attaque.'
 };
 return descriptions[x.type]||'Séquence importante signalée dans le suivi ESPN.';
}
export default function LiveHighlights(){
 const [items,setItems]=useState<Highlight[]>([]);
 const [updated,setUpdated]=useState('');
 const [state,setState]=useState<'loading'|'ok'|'unavailable'>('loading');
 const [filter,setFilter]=useState('all');
 useEffect(()=>{
  let mounted=true;
  const load=async()=>{try{const response=await fetch('/api/live-highlights',{cache:'no-store'});if(!response.ok)throw Error('ESPN indisponible');const data=await response.json();if(!mounted)return;if(data.status!=='ok')throw Error('ESPN indisponible');setItems(Array.isArray(data.events)?data.events:[]);setUpdated(String(data.updatedAt||''));setState('ok')}catch{if(mounted)setState('unavailable')}};
  void load();const timer=setInterval(()=>{void load()},60000);return()=>{mounted=false;clearInterval(timer)};
 },[]);
 const games=useMemo(()=>[...new Set(items.map(x=>x.matchup))], [items]);
 const shown=items.filter(x=>filter==='all'||x.matchup===filter).slice(0,18);
 return <section style={{margin:'20px 0 26px',border:'1px solid rgba(93,189,255,.45)',borderRadius:24,background:'radial-gradient(ellipse at 15% 0%,rgba(18,92,145,.38),transparent 55%),linear-gradient(155deg,#101d37,#071323)',boxShadow:'0 18px 65px #0006,inset 0 1px #ffffff1a',padding:'clamp(16px,3vw,27px)',color:'#ecf6ff'}}>
  <div style={{display:'flex',gap:14,justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap'}}>
   <div><div style={{fontSize:11,letterSpacing:2.5,fontWeight:900,color:'#79d9ff'}}>NFL STUDIO · LE VESTIAIRE LIVE</div><h2 style={{fontSize:'clamp(23px,4vw,33px)',margin:'5px 0',fontWeight:950,letterSpacing:-.9}}>🔥 CE QUI BRASSE <span style={{color:'#74dfff'}}>LIVE</span></h2><p style={{margin:'5px 0',fontSize:13,color:'#bed5e7'}}>Les gros jeux, les blessures et les revirements. Les faits viennent du play-by-play ESPN; la jasette vient de nous.</p></div>
   <span style={{padding:'8px 11px',borderRadius:999,background:'rgba(245,40,80,.12)',border:'1px solid rgba(255,88,117,.55)',fontSize:11,fontWeight:900,letterSpacing:1}}><span style={{color:'#ff657d'}}>●</span> ESPN · MISE À JOUR 60 S</span>
  </div>
  {games.length>1&&<div style={{display:'flex',gap:8,overflowX:'auto',padding:'15px 0 4px'}}>
   {['all',...games].map(g=><button key={g} type="button" onClick={()=>setFilter(g)} style={{flexShrink:0,border:'1px solid '+(filter===g?'#71dcff':'#45647d'),background:filter===g?'#164567':'#17243a',color:'#f5fbff',borderRadius:999,padding:'9px 13px',fontWeight:800,cursor:'pointer'}}>{g==='all'?'Tous les matchs':g}</button>)}
  </div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,310px),1fr))',gap:13,marginTop:18}}>
   {shown.map(x=>{const t=styles[x.type]||styles.sack;return <article key={x.id} style={{position:'relative',overflow:'hidden',border:'1px solid rgba('+t.rgb+',.55)',borderRadius:19,background:'linear-gradient(145deg,rgba('+t.rgb+',.16),rgba(9,23,42,.94) 57%)',boxShadow:'inset 0 1px #ffffff19,0 8px 24px #0005',padding:17}}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+t.accent+',transparent)'}}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:7,fontSize:11,fontWeight:900,letterSpacing:.9}}>
     <span style={{color:t.accent}}>{t.icon} {t.label}</span><span style={{color:'#d2e0eb'}}>{x.matchup} {x.time?'· '+x.time:''}</span>
    </div>
    <h3 style={{fontSize:20,lineHeight:1.15,margin:'15px 0 9px',fontWeight:950}}>{x.title}</h3>
    <p style={{fontSize:13,color:'#d2e4f3',lineHeight:1.5,margin:'0 0 11px'}}>{frenchSummary(x)}</p>
    <div style={{fontSize:12,color:'#b5cce0',borderLeft:'2px solid #4a8ebd',paddingLeft:10,marginBottom:13}}><b style={{color:'#e1f3ff'}}>Détail ESPN :</b> {x.detail}</div>
    <div style={{background:'rgba(0,0,0,.24)',border:'1px solid rgba('+t.rgb+',.32)',borderRadius:12,padding:'11px 12px',marginBottom:12}}>
     <div style={{fontSize:10,letterSpacing:1.5,color:t.accent,fontWeight:900,marginBottom:5}}>🎙️ LE VESTIAIRE DIT</div>
     <p style={{fontSize:14,fontWeight:750,lineHeight:1.4,margin:0}}>{voice(x)}</p>
    </div>
    <div style={{fontSize:11,color:'#b6cde0',marginBottom:9}}>🎟️ Impact sur tes paris : à évaluer selon la sélection; aucun verdict automatique inventé.</div>
    <a href={x.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',textDecoration:'none',borderRadius:9,padding:'9px 12px',color:'#071527',background:'#9de9ff',fontSize:12,fontWeight:950}}>VOIR LA SOURCE ESPN ↗</a>
   </article>})}
  </div>
  {shown.length===0&&<div style={{padding:'23px 12px',textAlign:'center',color:'#c0d8e9',border:'1px dashed #527593',borderRadius:14,marginTop:15}}>{state==='loading'?'Chargement des événements ESPN…':state==='unavailable'?'ESPN est temporairement indisponible. Les événements précédents restent affichés s’ils sont chargés.':items.length?'Aucun événement pour ce match.':'Aucun gros événement confirmé sur les matchs en cours. Les cartes apparaîtront ici automatiquement.'}</div>}
  <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginTop:15,fontSize:11,color:'#9ebad0'}}><span>Source factuelle : ESPN play-by-play · Commentaires originaux NFL Studio (pas des citations ESPN)</span><span>{updated?'Actualisé à '+new Date(updated).toLocaleTimeString('fr-CA',{timeZone:'America/Toronto'}):'En attente de données'}</span></div>
 </section>;
}
