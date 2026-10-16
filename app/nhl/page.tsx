"use client";
import {useEffect,useMemo,useState} from "react";
import "./nhl.css";
type Club={abbr:string;name:string;division:string};
type Game={id:number;date:string;state:string;home:Club&{score?:number};away:Club&{score?:number}};
const clubs:Club[]=[
["ANA","Ducks","Pacifique"],["BOS","Bruins","Atlantique"],["BUF","Sabres","Atlantique"],["CGY","Flames","Pacifique"],["CAR","Hurricanes","Métropolitaine"],["CHI","Blackhawks","Centrale"],["COL","Avalanche","Centrale"],["CBJ","Blue Jackets","Métropolitaine"],["DAL","Stars","Centrale"],["DET","Red Wings","Atlantique"],["EDM","Oilers","Pacifique"],["FLA","Panthers","Atlantique"],["LAK","Kings","Pacifique"],["MIN","Wild","Centrale"],["MTL","Canadiens","Atlantique"],["NSH","Predators","Centrale"],["NJD","Devils","Métropolitaine"],["NYI","Islanders","Métropolitaine"],["NYR","Rangers","Métropolitaine"],["OTT","Senators","Atlantique"],["PHI","Flyers","Métropolitaine"],["PIT","Penguins","Métropolitaine"],["SJS","Sharks","Pacifique"],["SEA","Kraken","Pacifique"],["STL","Blues","Centrale"],["TBL","Lightning","Atlantique"],["TOR","Maple Leafs","Atlantique"],["UTA","Mammoth","Centrale"],["VAN","Canucks","Pacifique"],["VGK","Golden Knights","Pacifique"],["WSH","Capitals","Métropolitaine"],["WPG","Jets","Centrale"]
].map(([abbr,name,division])=>({abbr,name,division}));
const nav=[["Tableau de bord","accueil"],["Semaine NHL","calendrier"],["Matchs","matchs"],["Analyse","analyse"],["Prob. victoire","probabilites"],["Cotes","cotes"],["Handicaps","handicaps"],["Props joueurs","props"],["Suivi P&L CAD","profits"]] as const;
const logo=(abbr:string)=>"https://assets.nhle.com/logos/nhl/svg/"+abbr+"_light.svg";
const nowDate=()=>new Date().toISOString().slice(0,10);
function addDays(base:string,days:number){const d=new Date(base+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export default function NHLHome(){
 const [date,setDate]=useState(nowDate);const [games,setGames]=useState<Game[]>([]);const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");const [search,setSearch]=useState("");const [division,setDivision]=useState("Toutes");
 const [selected,setSelected]=useState("MTL");const [mobileMenu,setMobileMenu]=useState(false);
 useEffect(()=>{let alive=true;setBusy(true);setError("");fetch("/api/nhl/schedule?date="+date)
 .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Calendrier indisponible");return d;})
 .then(d=>{if(alive)setGames(d.games||[])}).catch(e=>{if(alive){setGames([]);setError(String(e.message||e));}})
 .finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[date]);
 const filtered=useMemo(()=>clubs.filter(t=>(division==="Toutes"||t.division===division)&&
 (t.name+" "+t.abbr).toLowerCase().includes(search.toLowerCase())),[division,search]);
 const club=clubs.find(t=>t.abbr===selected)||clubs[0];
 return <div className="nhl-root"><div className="nhl-shell">
 <aside className={mobileMenu?"nhl-side open":"nhl-side"}>
 <div className="nhl-brand"><span className="nhl-mark">NHL</span><strong>STUDIO</strong><small>HOCKEY • 32 FRANCHISES</small></div>
 <nav>{nav.map(([title,id],i)=><a key={id} href={"#"+id} onClick={()=>setMobileMenu(false)} className={i===0?"current":""}>{title}</a>)}</nav>
 <a className="nhl-back" href="/">← Retour à NFL Studio</a>
 <div className="nhl-status">● NHL officielle · Calendrier</div>
 </aside>
 <main className="nhl-main" id="accueil">
 <header className="nhl-header"><button className="nhl-mobile" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Menu">☰</button><input aria-label="Rechercher une équipe" placeholder="Rechercher une équipe…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="nhl-switch"><a href="/">NFL</a><strong>NHL</strong></div></header>
 <section className="nhl-hero"><div className="nhl-kicker">NHL STUDIO / SAISON 2026–2027</div><h1>LE HOCKEY.<br/>LES CHIFFRES.</h1><p>Calendrier officiel, analyses et suivi de paris dans une interface pensée pour la NHL.</p><div className="nhl-hero-watermark">HOCKEY</div></section>
 <section className="nhl-panel" id="calendrier"><div className="nhl-heading"><div><small>CALENDRIER</small><h2>Semaine NHL</h2></div><div className="nhl-date-controls"><button onClick={()=>setDate(addDays(date,-7))}>←</button><input type="date" aria-label="Date du calendrier" value={date} onChange={e=>setDate(e.target.value)}/><button onClick={()=>setDate(addDays(date,7))}>→</button></div></div><div className="nhl-weekdays">{Array.from({length:7},(_,i)=>{const d=addDays(date,i);return <button key={d} className={i===0?"active":""} onClick={()=>setDate(d)}><span>{new Date(d+"T12:00:00Z").toLocaleDateString("fr-CA",{weekday:"short",timeZone:"UTC"})}</span><b>{d.slice(-2)}</b></button>})}</div></section>
 <div className="nhl-columns"><div>
 <section className="nhl-panel" id="equipes"><div className="nhl-heading"><div><small>LA LIGUE</small><h2>Les 32 équipes</h2></div><span>Sélection interactive</span></div><div className="nhl-tabs">{["Toutes","Atlantique","Métropolitaine","Centrale","Pacifique"].map(d=><button className={division===d?"active":""} key={d} onClick={()=>setDivision(d)}>{d}</button>)}</div><div className="nhl-teams">{filtered.map(t=><button key={t.abbr} className={selected===t.abbr?"nhl-team active":"nhl-team"} onClick={()=>setSelected(t.abbr)}><img src={logo(t.abbr)} alt="" onError={e=>{(e.currentTarget as HTMLImageElement).style.visibility="hidden"}}/><span>{t.name}</span></button>)}</div><div className="nhl-selected"><img src={logo(club.abbr)} alt="" /><div><small>ÉQUIPE SÉLECTIONNÉE</small><b>{club.name}</b><span>Division {club.division}</span></div></div></section>
 <section className="nhl-panel" id="matchs"><div className="nhl-heading"><div><small>RENCONTRES</small><h2>Matchs · {date}</h2></div><span>Source : API officielle NHL</span></div>{busy?<div className="nhl-empty">Chargement du calendrier…</div>:error?<div className="nhl-empty">Erreur du calendrier : {error}</div>:games.length===0?<div className="nhl-empty">Aucun match prévu à cette date.</div>:<div className="nhl-games">{games.map(g=><article key={g.id} className="nhl-game"><div className="nhl-game-top"><span>{new Date(g.date).toLocaleString("fr-CA",{timeZone:"America/Toronto",hour:"2-digit",minute:"2-digit"})}</span><span>{g.state==="OFF"?"Terminé":g.state==="LIVE"?"En direct":"À venir"}</span></div><div className="nhl-game-teams">{[g.away,g.home].map(t=><div key={t.abbr}><img src={logo(t.abbr)} alt=""/><span>{t.name||t.abbr}</span><b>{t.score??"–"}</b></div>)}</div></article>)}</div>}</section>
 </div><div>
 <section className="nhl-panel nhl-feature" id="analyse"><div className="nhl-heading"><div><small>ANALYSE</small><h2>Vue d'ensemble</h2></div></div><p>Modèle NHL en développement. Les prédictions ne sont pas encore connectées à cette interface.</p><div className="nhl-kpis"><div><small>PRÉCISION HISTORIQUE*</small><b>57,08 %</b></div><div><small>MODÈLE</small><b>Expérimental</b></div></div><small>*Backtest de référence basé sur les scores historiques, pas un rendement de paris.</small></section>
 <section className="nhl-panel" id="probabilites"><div className="nhl-heading"><div><small>MODÈLE</small><h2>Probabilités de victoire</h2></div></div><div className="nhl-empty">À connecter aux données pré-match validées.</div></section>
 <section className="nhl-panel" id="cotes"><div className="nhl-heading"><div><small>MARCHÉ</small><h2>Cotes Moneyline</h2></div></div><div className="nhl-empty">Aucune cote vérifiée connectée. Aucun pari recommandé pour le moment.</div></section>
 <section className="nhl-panel" id="handicaps"><div className="nhl-heading"><div><small>PARIS</small><h2>Handicaps / Totaux</h2></div></div><div className="nhl-empty">Marchés en préparation.</div></section>
 <section className="nhl-panel" id="props"><div className="nhl-heading"><div><small>JOUEURS</small><h2>Props joueurs</h2></div></div><div className="nhl-empty">Buteurs, tirs, points et arrêts : connexion à venir.</div></section>
 <section className="nhl-panel" id="profits"><div className="nhl-heading"><div><small>PORTEFEUILLE</small><h2>Suivi P&L · CAD</h2></div></div><div className="nhl-kpis"><div><small>MISES NHL</small><b>— CAD</b></div><div><small>PROFIT / PERTE</small><b>— CAD</b></div></div><p>Historique NHL distinct de la NFL. Synchronisation à venir.</p></section>
 </div></div><footer className="nhl-footer">NHL Studio · Interface expérimentale · Ne présente aucune recommandation de mise validée.</footer>
 </main></div></div>
}