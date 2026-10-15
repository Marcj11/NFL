'use client';
import {useEffect,useState} from 'react';
type Story={id:string;team:string;opponent:string;headline:string;body:string;punchline:string;metric:string;kind:string;kickoff_utc:string;source:string};
type Feed={status:string;stories:Story[]};
const logo=(t:string)=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+(t==='LA'?'lar':t==='WAS'?'wsh':t.toLowerCase())+'.png';
export default function Vestiaire(){
 const [feed,SET]=useState<Feed|null>(null),[filter,FILTER]=useState('TOUT');
 useEffect(()=>{let active=true;fetch('/api/vestiaire',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error('unavailable');if(active)SET(d)}).catch(()=>{if(active)SET({status:'unavailable',stories:[]})});return()=>{active=false}},[]);
 const stories=(feed?.stories||[]).filter(s=>filter==='TOUT'||s.kind===filter);
 const filters=['TOUT',...new Set((feed?.stories||[]).map(s=>s.kind))];
 return <section className="locker-room">
  <div className="locker-hero"><span>🏈 NFL STUDIO ORIGINAL · RÉSULTATS VÉRIFIÉS</span><h1>LE VESTIAIRE <em>DES BOYS</em></h1><p>La NFL racontée comme à la taverne après une grosse game : du slang, des sacres pis des vrais chiffres.</p></div>
  <div className="locker-disclaimer"><strong>LA RÈGLE DES BOYS</strong> — On s’enflamme sur les résultats enregistrés. Pas de blessures inventées, pas de fausses statistiques de joueurs.</div>
  <div className="locker-tabs" aria-label="Catégories du vestiaire">{filters.map(f=><button key={f} type="button" className={filter===f?'on':''} onClick={()=>FILTER(f)}>{f==='TOUT'?'🔥 TOUT LE VESTIAIRE':f}</button>)}</div>
  {!feed?<div className="locker-wait">Les boys déballent les feuilles de matchs…</div>:feed.status!=='ok'?<div className="locker-wait">Résultats vérifiés indisponibles. Pas de chronique inventée.</div>:stories.length===0?<div className="locker-wait">Aucune chronique dans cette catégorie.</div>:<div className="locker-grid">{stories.map((s,i)=><article className={'locker-story locker-story-'+i%5} key={s.id}>
   <div className="locker-story-top"><span>✦ {s.kind}</span><span>{new Date(s.kickoff_utc).toLocaleDateString('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'short'})}</span></div>
   <div className="locker-story-teams"><img src={logo(s.team)} alt={'Logo '+s.team}/><div><small>CHIFFRE CONFIRMÉ</small><strong>{s.metric}</strong></div><img src={logo(s.opponent)} alt={'Logo '+s.opponent}/></div>
   <h2>{s.headline}</h2><p>{s.body}</p><blockquote>« {s.punchline} »</blockquote>
   <div className="locker-story-footer"><span>Source : {s.source}</span><a href={'/team/'+s.team}>VOIR L’ÉQUIPE ↗</a></div>
  </article>)}</div>}
  <footer className="locker-footnote">Chroniques fondées sur des résultats enregistrés. Les commentaires humoristiques ne sont pas des recommandations de paris.</footer>
 </section>;
}
