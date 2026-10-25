'use client';
import {useEffect,useState} from 'react';
type Story={id:string;team:string;opponent:string;headline:string;body:string;punchline:string;metric:string;kind:string;kickoff_utc:string;home_score:number;away_score:number;source:string;highlights?:string[];source_details?:string};
type Feed={status:string;stories:Story[]};
type News={id:string;headline:string;excerpt:string;url:string;published:string;source:string;image:string|null};
const logo=(t:string)=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+(t==='LA'?'lar':t==='WAS'?'wsh':t.toLowerCase())+'.png';
export default function Vestiaire(){
 const [feed,SET]=useState<Feed|null>(null),[filter,FILTER]=useState('TOUT'),[news,SET_NEWS]=useState<News[]>([]);
 useEffect(()=>{let active=true;const load=()=>fetch('/api/vestiaire',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error('unavailable');if(active)SET(d)}).catch(()=>{if(active)SET({status:'unavailable',stories:[]})});void load();const id=setInterval(()=>{void load()},120000);return()=>{active=false;clearInterval(id)}},[]);
 useEffect(()=>{let active=true;fetch('/api/vestiaire/news').then(r=>r.json()).then(d=>{if(active&&Array.isArray(d.articles))SET_NEWS(d.articles)}).catch(()=>{});return()=>{active=false}},[]);
 const stories=(feed?.stories||[]).filter(s=>filter==='TOUT'||s.kind===filter);
 const filters=['TOUT',...new Set((feed?.stories||[]).map(s=>s.kind))];
 return <section className="locker-room">
  <div className="locker-hero"><span>🏈 NFL STUDIO ORIGINAL · RÉSULTATS VÉRIFIÉS</span><h1>LE VESTIAIRE <em>DES BOYS</em></h1><p>La NFL racontée comme à la taverne après une grosse game : du vrai parler québécois pis des chiffres vérifiés.</p></div>
  <div className="locker-disclaimer"><strong>LA RÈGLE DES BOYS</strong> — On s’enflamme sur les résultats enregistrés. Pas de sacres dans les chroniques, pas de blessures inventées ni de fausses statistiques.</div>
  <div className="locker-tabs" aria-label="Catégories du vestiaire">{filters.map(f=><button key={f} type="button" className={filter===f?'on':''} onClick={()=>FILTER(f)}>{f==='TOUT'?'🔥 TOUT LE VESTIAIRE':f}</button>)}</div>
  {!feed?<div className="locker-wait">Les boys déballent les feuilles de matchs…</div>:feed.status!=='ok'?<div className="locker-wait">Résultats vérifiés indisponibles. Pas de chronique inventée.</div>:stories.length===0?<div className="locker-wait">Aucun résultat récent confirmé pour cette catégorie. Les chroniques apparaîtront après les matchs.</div>:<div className="locker-grid">{stories.map((s,i)=><article className={'locker-story locker-story-'+i%5} key={s.id}>
   <div className="locker-story-top"><span>✦ {s.kind}</span><span>{new Date(s.kickoff_utc).toLocaleDateString('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'short'})}</span></div>
   <div className="locker-story-teams"><img src={logo(s.team)} alt={'Logo '+s.team}/><div><small>CHIFFRE CONFIRMÉ</small><strong>{s.metric}</strong></div><img src={logo(s.opponent)} alt={'Logo '+s.opponent}/></div>
   <div className="locker-final-score"><span>SCORE FINAL · VISITEURS / DOMICILE</span><strong>{s.away_score} <small>–</small> {s.home_score}</strong></div><h2>{s.headline}</h2><p>{s.body}</p>{s.highlights&&s.highlights.length>0&&<div className="locker-facts"><strong>🏈 LES FAITS SAILLANTS DE LA GAME</strong>{s.highlights.map((fact,i)=><p key={i}>{fact}</p>)}<small>Statistiques détaillées ESPN · Vérifiées sur la feuille du match</small></div>}<blockquote>« {s.punchline} »</blockquote>
   <div className="locker-story-footer"><span>Source : {s.source}</span><a href={'/team/'+s.team}>VOIR L’ÉQUIPE ↗</a></div>
  </article>)}</div>}
  <section className="locker-news"><div className="locker-news-intro"><span>📰 LES VRAIES NOUVELLES · SOURCES EXTERNES</span><h2>LES MÉDIAS ONT JASÉ, LES BOYS</h2><p>Des titres et de courts passages publiés par ESPN. La nouvelle reste à la source : clic icitte pour lire l’article original et vérifier le contexte.</p></div>
   {news.length===0?<p className="locker-news-empty">Aucun extrait ESPN disponible présentement. Pas de fausse citation pour remplir le trou.</p>:<div className="locker-news-grid">{news.map(n=><article key={n.id} className="locker-news-card">
     {n.image&&<img src={n.image} alt="" loading="lazy"/>}
     <div className="locker-news-body"><div className="locker-news-meta"><strong>{n.source} · ARTICLE ORIGINAL</strong><time dateTime={n.published}>{new Date(n.published).toLocaleDateString('fr-CA',{timeZone:'America/Toronto',day:'numeric',month:'short',year:'numeric'})}</time></div><h3>{n.headline}</h3>{n.excerpt&&<blockquote>« {n.excerpt} »</blockquote>}<p>Le contexte complet est dans l’article : on ne va pas se conter des histoires à partir d’un extrait de quinze mots, esti.</p><a href={n.url} target="_blank" rel="noopener noreferrer">LIRE LA SOURCE ESPN ↗</a></div>
    </article>)}</div>}
   <p className="locker-news-credit">Extraits courts reproduits et attribués à ESPN, sans retoucher leur contenu. Ces extraits ne sont pas des déclarations de joueurs à moins que la source l’indique explicitement.</p>
  </section>
  <footer className="locker-footnote">Chroniques fondées sur des résultats enregistrés. Les commentaires humoristiques ne sont pas des recommandations de paris.</footer>
 </section>;
}
