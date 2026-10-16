'use client';
import {useEffect,useMemo,useState} from 'react';
import LiveBetTracker from './live-bet-tracker';
import ForecastAudit from './forecast-audit';
type Offer={id:string;game:string;market:string;marketKey?:string;selection:string;line?:number;book:string;odds:number;prob:number;team:string;player?:string;playerImage?:string;playerTeam?:string;kickoff?:string};
type Bet=Offer&{stake:number;chosenOdds:number;placedAt:string;status:'open'|'won'|'lost'|'void';resultConfirmedAt?:string};
const fmt=(n:number)=>n.toLocaleString('fr-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
const decimal=(n:number)=>n>0?1+n/100:n<0?1+100/Math.abs(n):0;
const STORE='nfl-studio-bets-v1';
const WALLET_KEY='nfl-studio-wallet-secret';
const reconcileBets=(remote:Bet[],local:Bet[])=>{
 const merged=new Map<string,Bet>();
 for(const b of remote)if(b?.id)merged.set(b.id,b);
 for(const b of local)if(b?.id){
  const prev=merged.get(b.id);
  if(!prev||(!prev.resultConfirmedAt&&b.resultConfirmedAt)||(prev.resultConfirmedAt&&b.resultConfirmedAt&&Date.parse(b.resultConfirmedAt)>Date.parse(prev.resultConfirmedAt))||(!prev.resultConfirmedAt&&!b.resultConfirmedAt))merged.set(b.id,b);
 }
 return [...merged.values()];
};

const heroTag=(v:'top'|'live'|'history')=>v==='top'?'TOP PARIS':v==='live'?'PARIS EN COURS':'BILAN DE SAISON';
const logo=(abbr:string)=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+(abbr==='LA'?'lar':abbr==='WAS'?'wsh':abbr.toLowerCase())+'.png';
const teamCodes:Record<string,string>={'Buffalo Bills':'BUF','Las Vegas Raiders':'LV','Detroit Lions':'DET','Kansas City Chiefs':'KC','Dallas Cowboys':'DAL','Philadelphia Eagles':'PHI','Green Bay Packers':'GB','San Francisco 49ers':'SF','Baltimore Ravens':'BAL','Cincinnati Bengals':'CIN','New York Giants':'NYG','New England Patriots':'NE','Minnesota Vikings':'MIN','Chicago Bears':'CHI','Houston Texans':'HOU','Seattle Seahawks':'SEA','New York Jets':'NYJ','Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Carolina Panthers':'CAR','Cleveland Browns':'CLE','Denver Broncos':'DEN','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAX','Los Angeles Chargers':'LAC','Los Angeles Rams':'LA','Miami Dolphins':'MIA','New Orleans Saints':'NO','Pittsburgh Steelers':'PIT','Tampa Bay Buccaneers':'TB','Tennessee Titans':'TEN','Washington Commanders':'WAS'};
const teamFrom=(s:string)=>Object.entries(teamCodes).find(([name])=>s.includes(name))?.[1];
const teamSides=(s:string)=>s.split(' vs ').map(teamFrom).filter((v):v is string=>Boolean(v));
function PlayerPortrait({player,game}:{player:string;game:string}){
 const [source,SET_SOURCE]=useState<string|null>(null),[status,SET_STATUS]=useState('loading');
 useEffect(()=>{
  let alive=true;SET_SOURCE(null);SET_STATUS('loading');
  const sides=teamSides(game);if(sides.length!==2){SET_STATUS('missing');return()=>{alive=false}};
  const params=new URLSearchParams({player,away:sides[0],home:sides[1]});
  fetch('/api/player-portrait?'+params.toString()).then(r=>r.json()).then(d=>{
   if(!alive)return;
   if(d.found===true&&typeof d.url==='string'){SET_SOURCE(d.url);SET_STATUS('ready')}else SET_STATUS('missing');
  }).catch(()=>{if(alive)SET_STATUS('missing')});
  return()=>{alive=false};
 },[player,game]);
 return <div className="player-feature"><div className="player-electric" aria-hidden="true"/>
  {source&&status==='ready'?<img className="player-action-image" src={source} alt={'Portrait ESPN de '+player} onError={()=>{SET_SOURCE(null);SET_STATUS('missing')}}/>:<div className="player-photo-unavailable">{status==='loading'?'PHOTO ESPN EN CHARGEMENT':'PORTRAIT NON DISPONIBLE'}</div>}
  <div className="player-feature-name">{player}</div>
 </div>;
}
export default function BettingHub({view}:{view:'top'|'live'|'history'}){
 const [offers,setOffers]=useState<Offer[]>([]),[loaded,LOADED]=useState(false),[bets,BETS]=useState<Bet[]>([]);
 const [category,CATEGORY]=useState<'general'|'moneyline'|'spreads'|'totals'|'props'|'heavy'>('general');
 const [selected,SELECT]=useState<Offer|null>(null);
 const [showBetForm,SHOW_BET_FORM]=useState(false);
 const [odd,ODD]=useState(''),[stake,STAKE]=useState('5');
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(v))BETS(v)}catch{}},[]);
 const [walletCode,WALLET_CODE]=useState(''),[syncStatus,SYNC_STATUS]=useState('');
 const [startingBalance,SET_BALANCE]=useState(0),[balanceDraft,BALANCE_DRAFT]=useState('0');
 useEffect(()=>{const amount=Number(localStorage.getItem('nfl-studio-starting-bankroll')||0);if(Number.isFinite(amount)){SET_BALANCE(amount);BALANCE_DRAFT(String(amount))}},[]);
 const save=(v:Bet[])=>{BETS(v);try{localStorage.setItem(STORE,JSON.stringify(v));const secret=localStorage.getItem(WALLET_KEY);if(secret)fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',secret,bets:v,startingBalance})}).then(r=>{if(!r.ok)SYNC_STATUS('Erreur de sauvegarde cloud')}).catch(()=>SYNC_STATUS('Synchronisation momentanément indisponible'))}catch{}};
 const connectWallet=async()=>{
  let secret=walletCode.trim().toLowerCase();
  if(!secret){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);secret=Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('')}
  if(!/^[a-f0-9]{48,128}$/.test(secret)){SYNC_STATUS('Le code doit être copié au complet.');return}
  try{
   SYNC_STATUS('Connexion au coffre…');
   const res=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',secret})});
   if(!res.ok)throw Error('read');const data=await res.json();
   const remoteBalance=Number(data.startingBalance||0);if(remoteBalance>0){SET_BALANCE(remoteBalance);BALANCE_DRAFT(String(remoteBalance));localStorage.setItem('nfl-studio-starting-bankroll',String(remoteBalance))}
   const local=JSON.parse(localStorage.getItem(STORE)||'[]');const all=reconcileBets(Array.isArray(data.bets)?data.bets:[],Array.isArray(local)?local:[]);localStorage.setItem(WALLET_KEY,secret);WALLET_CODE(secret);BETS(all);localStorage.setItem(STORE,JSON.stringify(all));await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',secret,bets:all,startingBalance:remoteBalance||startingBalance})});SYNC_STATUS('Coffre relié. Garde ton code privé.');
  }catch{SYNC_STATUS('Connexion impossible. Tes billets locaux sont conservés.')}
 };
 useEffect(()=>{try{const secret=localStorage.getItem(WALLET_KEY);if(!secret)return;WALLET_CODE(secret);fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',secret})}).then(r=>r.json()).then(d=>{if(!Array.isArray(d.bets))return;const amount=Number(d.startingBalance||0);if(amount>0){SET_BALANCE(amount);BALANCE_DRAFT(String(amount));localStorage.setItem('nfl-studio-starting-bankroll',String(amount))}const old=JSON.parse(localStorage.getItem(STORE)||'[]');const arr=reconcileBets(d.bets,Array.isArray(old)?old:[]);BETS(arr);localStorage.setItem(STORE,JSON.stringify(arr))}).catch(()=>{})}catch{}},[]);

 useEffect(()=>{
  if(view==='top')return;
  const refresh=async()=>{
   const secret=localStorage.getItem(WALLET_KEY);if(!secret)return;
   try{const r=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',secret})});
    if(!r.ok)return;const data=await r.json();if(!Array.isArray(data.bets))return;
    const old=JSON.parse(localStorage.getItem(STORE)||'[]');const merged=reconcileBets(data.bets,Array.isArray(old)?old:[]);
    BETS(merged);localStorage.setItem(STORE,JSON.stringify(merged));
   }catch{}
  };
  const timer=setInterval(refresh,45000);return()=>clearInterval(timer);
 },[view]);
 useEffect(()=>{let active=true;LOADED(false);fetch('/api/odds').then(r=>r.json()).then(d=>{
 const out:Offer[]=[];
 for(const g of d.games||[]){const game=g.away_team+' vs '+g.home_team;if(!Number.isFinite(Date.parse(g.commence_time))||Date.parse(g.commence_time)<=Date.now())continue;
 for(const b of g.bookmakers||[])for(const m of b.markets||[])for(const o of m.outcomes||[]){
 const odds=decimal(Number(o.price));if(odds<=1||!Number.isFinite(odds))continue;
 const market=m.key==='h2h'?'moneyline':m.key==='spreads'?'spreads':m.key==='totals'?'totals':m.key.startsWith('player_')?'props':'';
 if(!market)continue;const selection=market==='props'?String(o.description||o.name)+' · '+m.key+' '+(o.point??''):market==='moneyline'?'Victoire · '+o.name:market==='spreads'?o.name+' '+o.point:o.name+' '+o.point+' points';
 out.push({id:[game,market,o.name,o.point??'',market==='props'?o.description||'':''].join('|'),game,market,marketKey:m.key,selection,line:o.point,odds,prob:1/odds,book:b.title,kickoff:g.commence_time,team:o.name,player:market==='props'?String(o.description||''):undefined,playerImage:typeof o.player_image==='string'?o.player_image:undefined,playerTeam:typeof o.team==='string'?o.team:undefined});
 }}
 const best=new Map<string,Offer>();for(const x of out){const older=best.get(x.id);if(!older||x.odds>older.odds)best.set(x.id,x)}
 if(active){setOffers([...best.values()]);LOADED(true)}
 }).catch(()=>{if(active)LOADED(true)});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;fetch('/api/player-props').then(r=>r.json()).then(data=>{if(!active||!Array.isArray(data.offers))return;setOffers(previous=>{const map=new Map(previous.map(o=>[o.id,o]));for(const prop of data.offers){if(prop.market==='props'&&Number.isFinite(Number(prop.odds))&&Number(prop.odds)>1&&typeof prop.id==='string'&&typeof prop.selection==='string'&&typeof prop.game==='string'&&(!prop.kickoff||(Number.isFinite(Date.parse(prop.kickoff))&&Date.parse(prop.kickoff)>Date.now())))map.set(prop.id,prop as Offer)}return [...map.values()]})}).catch(()=>{});return()=>{active=false}},[]);
 const [official,SET_OFFICIAL]=useState<Array<{away_team?:string;home_team?:string;home_probability?:number|null;away_probability?:number|null}>>([]);
 useEffect(()=>{let active=true;fetch('/api/expert-independent',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)SET_OFFICIAL(Array.isArray(d.report?.rows)?d.report.rows:[])}).catch(()=>{});return()=>{active=false}},[]);
 const [research,SET_RESEARCH]=useState<Record<string,{probability:number;explanation:string}>>({});
 const [researchStatus,SET_RESEARCH_STATUS]=useState('chargement');
 useEffect(()=>{let alive=true;fetch('/api/expert-prop-research',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(!alive)return;SET_RESEARCH_STATUS(String(data.status||'inconnu'));const map:Record<string,{probability:number;explanation:string}>={};
  for(const row of data.evaluations||[]){if(row.experimental===true&&typeof row.probability==='number'&&row.probability>=0&&row.probability<=1){
   const o=row.offer||{};const market=String(o.selection||'').split(' · ').pop()||'';const direction=/\bover\b/i.test(String(o.selection))?'over':/\bunder\b/i.test(String(o.selection))?'under':'';const key=[o.player,market,o.line,direction].join('|').toLowerCase();
   map[key]={probability:row.probability,explanation:String(row.explanation||'Simulation experimentale non validee')};
  }}SET_RESEARCH(map);
 }).catch(()=>{if(alive)SET_RESEARCH_STATUS('indisponible')});return()=>{alive=false}},[]);
 const researchValue=(o:Offer)=>{
  const parts=o.selection.split(' · ');
  const market=parts[parts.length-1]||'';
  const direction=/\bover\b/i.test(o.selection)?'over':/\bunder\b/i.test(o.selection)?'under':'';
  return research[[o.player,market,o.line,direction].join('|').toLowerCase()]||null;
 };
 const [gameResearchLoading,SET_GAME_RESEARCH_LOADING]=useState(true);
 const [gamesResearch,SET_GAMES_RESEARCH]=useState<Record<string,{home_win_probability:number;away_win_probability:number;projected_margin:number;projected_total:number;spread_sd:number;total_sd:number;explanation:string}>>({});
 useEffect(()=>{let active=true;SET_GAME_RESEARCH_LOADING(true);fetch('/api/odds').then(r=>r.json()).then(async d=>{
  const events=(d.games||[]).filter((g:{commence_time:string})=>Date.parse(g.commence_time)>Date.now()).slice(0,16);
  // Limit parallel research requests to avoid function saturation on Hobby deployments.
  const data:Array<{key:string;value:any}|null>=[];
  for(let i=0;i<events.length&&active;i+=3){
   const batch=await Promise.all(events.slice(i,i+3).map(async(g:{home_team:string;away_team:string;commence_time:string})=>{
    const home=teamCodes[g.home_team],away=teamCodes[g.away_team];if(!home||!away)return null;
    try{const p=new URLSearchParams({home,away,before:g.commence_time});const r=await fetch('/api/expert-game-research?'+p,{cache:'no-store'});if(!r.ok)return null;const x=await r.json();return x.status==='experimental_unvalidated'?{key:g.away_team+' vs '+g.home_team,value:x}:null}catch{return null}
   }));
   data.push(...batch);
   if(active)SET_GAMES_RESEARCH(Object.fromEntries(data.filter((x):x is {key:string;value:any}=>Boolean(x)).map(x=>[x.key,x.value])));
  }

  if(active)SET_GAME_RESEARCH_LOADING(false);
 }).catch(()=>{if(active)SET_GAME_RESEARCH_LOADING(false)});return()=>{active=false}},[]);
 const gameProjection=(o:Offer):number|null=>{
  const g=gamesResearch[o.game];if(!g)return null;
  const sides=teamSides(o.game);if(sides.length!==2)return null;
  const home=sides[1],chosen=teamFrom(o.team);
  const safe=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
  const cdf=(z:number)=>Math.max(0,Math.min(1,0.5*(1+Math.tanh(z*0.79788456*(1+0.044715*z*z)))));
  if(o.market==='moneyline'){
   if(!chosen||!sides.includes(chosen))return null;
   const p=chosen===home?g.home_win_probability:g.away_win_probability;
   return safe(p)&&p>0&&p<1?p:null;
  }
  if(o.market==='spreads'){
   if(!chosen||!sides.includes(chosen)||!safe(o.line)||!safe(g.projected_margin)||!safe(g.spread_sd)||g.spread_sd<=0)return null;
   const margin=chosen===home?g.projected_margin:-g.projected_margin;
   return cdf((margin+Number(o.line))/g.spread_sd);
  }
  if(o.market==='totals'){
   if(!safe(o.line)||!safe(g.projected_total)||!safe(g.total_sd)||g.total_sd<=0)return null;
   const over=/^over\b/i.test(o.selection),under=/^under\b/i.test(o.selection);
   if(over===under)return null;
   const above=cdf((g.projected_total-Number(o.line))/g.total_sd);
   return under?1-above:above;
  }
  return null;
 };
 const officialProbability=(o:Offer):number|null=>{
  if(o.market!=='moneyline')return null;
  const sides=teamSides(o.game);
  const row=official.find(g=>sides.length===2&&sides[1]===String(g.home_team)&&sides[0]===String(g.away_team));
  if(!row)return null;
  const selected=teamFrom(o.team);
  const prob=selected===row.home_team?row.home_probability:selected===row.away_team?row.away_probability:null;
  return typeof prob==='number'&&Number.isFinite(prob)&&prob>0&&prob<1?prob:null;
 };
 const ranking=useMemo(()=>{
 const family=category==='spreads'?'spreads':category==='totals'?'totals':category==='props'?'props':category==='moneyline'?'moneyline':null;
 const probability=(o:Offer)=>officialProbability(o)??(o.market==='props'?researchValue(o)?.probability??null:gameProjection(o));
 const eligible=offers.filter(o=>{const p=probability(o);const g=gamesResearch[o.game];return p!==null&&Number.isFinite(p)&&p>0&&p<1&&Number.isFinite(o.odds)&&o.odds>1&&(!!o.kickoff&&Number.isFinite(Date.parse(o.kickoff))&&Date.parse(o.kickoff)>Date.now())&&(!family||o.market===family)&&(category!=='heavy'||o.odds>=3)&&(o.market==='props'||!g||(Number.isFinite(g.spread_sd)&&g.spread_sd>0&&Number.isFinite(g.total_sd)&&g.total_sd>0))});
 const edge=(o:Offer)=>probability(o)!*o.odds-1;
 const ordered=eligible.sort((a,b)=>edge(b)-edge(a));
 const selected:Offer[]=[],seen=new Set<string>();
 for(const o of ordered){
  const key=[o.game,o.market,o.marketKey||'',o.selection,o.line??''].join('|');
  if(seen.has(key))continue;
  
  seen.add(key);selected.push(o);
  if(selected.length>=5)break;
 }
 return selected;
 },[category,offers,official,research,gamesResearch]);
 const marketCoverage=useMemo(()=>({moneyline:ranking.filter(o=>o.market==='moneyline').length,spreads:ranking.filter(o=>o.market==='spreads').length,totals:ranking.filter(o=>o.market==='totals').length,props:ranking.filter(o=>o.market==='props').length}),[ranking]);
 const pickVariation=(o:Offer,rank:number,n:number)=>{
  // Stable per-offer wording: it does not jump around when the user navigates.
  const key=o.id+'|'+o.market+'|'+rank;let h=0;
  for(let i=0;i<key.length;i++)h=(Math.imul(h,31)+key.charCodeAt(i))|0;
  return Math.abs(h%Math.max(1,n));
 };
 const heavyClosers=[
  'Va-tu les déposer sur le synthétique, tes grosses crisses de corones ?',
  'Si tu prends ce pari-là, c’est tes deux testicules qui viennent s’appuyer direct sur le synthétique. Mais lis les chiffres avant de faire le héros, tabarnak !',
  'Dézippe ta fly, les boys : ça prend des corones en maudit pour embarquer là-dedans.',
  'Attention : pari réservé aux gars avec des testicules forgés dans le titane. Le risque, lui, est bien réel !',
  'Les corones sur le gazon, le casque attaché, pis pas de bullshit : c’est un méchant long shot.',
  'Tu sens le synthétique sous tes deux grosses corones ? C’est le risque qui vient te dire bonjour, mon champion.',
  'C’est le genre de cote qui fait trembler le jockstrap. Le booker rit peut-être déjà dans sa barbe, esti.',
  'Pour celle-là, tes corones ont intérêt à être en acier trempé : c’est pas une victoire gratuite, sacrament.'
 ];
 const cardTitles:Record<string,string[]>={
  general:['POURQUOI CE PARI SORT DU LOT, LES BOYS ?','LE BOOKER NOUS LAISSE-TU UNE OUVERTURE ?','LE VERDICT DU VESTIAIRE','C’EST QUOI LE FUCK AVEC CETTE COTE ?','POURQUOI ÇA SE RAMASSE DANS LE TOP ?'],
  moneyline:['LA VICTOIRE, ON Y CROIT-TU ?','LE BOOKER A-T-IL SOUS-ESTIMÉ CETTE GANG ?','ON PREND QUI POUR GAGNER, TABARNAK ?','LA VÉRITÉ DERRIÈRE CETTE MONEYLINE'],
  spreads:['LE HANDICAP, ÇA PASSE-TU ?','LA LIGNE EST-TU DANS LE CHAMP ?','LE SPREAD SOUS LA LOUPE DES BOYS','COMBIEN DE POINTS ON LUI DONNE, ESTI ?'],
  totals:['ÇA VA SCORER EN MASSE OU FAIRE DUR ?','LE TOTAL : DU FEU OU UN GROS ZÉRO ?','LES POINTS VONT-TU PLEUVOIR ?','LE BOOKER A-T-IL MAL COMPTÉ ?'],
  props:['LE JOUEUR VA-TU LIVRER LA MARCHANDISE ?','SES STATS PARLENT-TU OU C’EST DU VENT ?','LE JOUEUR SOUS LE MICROSCOPE DES BOYS','ÇA SENT LE GROS MATCH OU LA DÉBARQUE ?'],
  heavy:['HEAVYBALLS : LES CORONES SUR LE SYNTHÉTIQUE','COTE DE MALADE : T’AS-TU LES CORONES ?','LE PARI QUI FAIT TREMBLER LE JOCKSTRAP','LE SYNTHÉTIQUE VA-TU GOÛTER LE TITANE ?','LE GROS CRISS DE LONG SHOT DES BOYS']
 };
 const titleFor=(o:Offer,rank:number)=>{const names=cardTitles[category]||cardTitles.general;return names[pickVariation(o,rank,names.length)]};
 const reasoning=(o:Offer,rank:number)=>{
  const officialP=officialProbability(o),prop=o.market==='props'?researchValue(o):null,g=gamesResearch[o.game];
  const p=officialP??(o.market==='props'?prop?.probability??null:gameProjection(o));
  if(p===null||!Number.isFinite(p))return 'Pas de probabilité calculable pour ce marché. Les boys, on va pas se bullshitter : sans chiffre, pas de verdict.';
  const implied=100/o.odds,edge=100*(p-1/o.odds),ev=100*(p*o.odds-1);
  const fmtP=(x:number)=>x.toFixed(1).replace('.',',');
  const plus=(x:number)=>(x>=0?'+':'')+fmtP(x);
  const intro:Record<string,string[]>={
   moneyline:['On jase de la victoire de '+o.team+'. La machine regarde le duel et sort '+fmtP(p*100)+' % de chances.','Pour '+o.game+', notre modèle donne '+fmtP(p*100)+' % à cette victoire. Ça sort pas d’une boule de cristal, esti.','La moneyline nous intrigue : '+o.selection+'. Notre projection de réussite est de '+fmtP(p*100)+' %.'],
   spreads:['Faut voir si '+o.selection+' peut couvrir la ligne. Le modèle donne '+fmtP(p*100)+' % à ce scénario.','Le spread, c’est pas de la magie : on compare le handicap à notre marge prévue et on obtient '+fmtP(p*100)+' %.','Pour ce handicap, les boys, la machine estime '+fmtP(p*100)+' % de réussite.'],
   totals:['Ça va-tu compter des points ? Pour '+o.selection+', notre projection voit '+fmtP(p*100)+' % de chances.','On passe le total au tordeur : le modèle attribue '+fmtP(p*100)+' % à '+o.selection+'.','Les boys, le total est pas décidé à coups de cris : notre simulation sort '+fmtP(p*100)+' %.'],
   props:['Pour '+(o.player||'ce joueur')+', on regarde les matchs passés plutôt que sa réputation. Résultat : '+fmtP(p*100)+' % pour ce seuil.','On passe '+(o.player||'le joueur')+' au détecteur de bullshit : l’historique simulé donne '+fmtP(p*100)+' %.','Gros nom ou gros zéro, on s’en fout : pour '+o.selection+', les données donnent '+fmtP(p*100)+' %.'],
   heavy:['Osti de grosse cote à '+fmt(o.odds)+' ! Le modèle donne '+fmtP(p*100)+' % à ce pari de malade.','Les boys, c’est pas une mise pour les genoux mous : '+o.selection+', probabilité estimée '+fmtP(p*100)+' %.','Un long shot qui donne le vertige. On a quand même passé les chiffres : '+fmtP(p*100)+' % de réussite estimée.']
  };
  const type=category==='heavy'?'heavy':o.market;
  const opts=intro[type]||intro.moneyline;
  const opening=opts[pickVariation(o,rank,opts.length)];
  const source=o.market==='props'?'Ça vient de la simulation sur les performances précédentes du joueur.':officialP!==null?'Le chiffre vient du rapport indépendant EXPERT NFL.':'Ça vient des scores récents, de la projection du match et de l’ajustement QB quand disponible.';
  const matchup=g&&o.market!=='props'?' Marge prévue : '+fmtP(g.projected_margin)+' points; total : '+fmtP(g.projected_total)+'.':'';
  const numbers=' Le booker affiche '+fmtP(implied)+' % implicitement. Avantage de probabilité : '+plus(edge)+' points; rendement espéré théorique : '+plus(ev)+' %.';
  const normalEnds=ev>0?['Ça ressemble à une ouverture, mais on se garde une petite gêne : la probabilité est expérimentale.','Le booker a peut-être une faiblesse ici. Faut que nos chiffres soient justes, sinon on va se faire ramasser.','Sur papier, y’a de la valeur. Pas une licence pour garrocher ton cash, tabarnak.','On a un écart intéressant. Est-ce que le modèle est assez solide ? C’est ça la vraie question.']:['Le prix est pas avantageux selon la machine. Pas besoin de jouer au cowboy.','La cote nous fait pas de cadeau. Même avec un gros ego, ça change rien.','Les chiffres disent pas oui. On peut sacrer, mais ça les fera pas bouger.'];
  const closing=category==='heavy'?heavyClosers[pickVariation(o,rank,heavyClosers.length)]:normalEnds[pickVariation(o,rank,normalEnds.length)];
  return opening+' '+source+matchup+numbers+' '+closing+(officialP===null?' Modèle expérimental : prudence avec ce pourcentage.':'');
 };
 const choose=(v:Offer)=>{SELECT(v);SHOW_BET_FORM(false);ODD(fmt(v.odds).replace(',','.'));STAKE('5')};
 const add=()=>{if(!selected)return;const d=Number(odd.replace(',','.')),s=Number(stake.replace(',','.'));if(!Number.isFinite(d)||d<=1||!Number.isFinite(s)||s<=0)return;save([{...selected,chosenOdds:d,stake:s,placedAt:new Date().toISOString(),status:'open'},...bets]);SELECT(null)};
 const update=(idx:number,status:Bet['status'])=>{const next=bets.map((x,i)=>i===idx?{...x,status,resultConfirmedAt:new Date().toISOString()}:x);save(next)};
 const wins=bets.filter(x=>x.status==='won').reduce((s,b)=>s+b.stake*(b.chosenOdds-1),0);
 const losses=bets.filter(x=>x.status==='lost').reduce((s,b)=>s+b.stake,0);
 const updateStartingBankroll=()=>{
  const amount=Number(balanceDraft.replace(',','.'));if(!Number.isFinite(amount)||amount<0||amount>100000000){SYNC_STATUS('Entre un montant valide en CAD.');return}
  SET_BALANCE(amount);localStorage.setItem('nfl-studio-starting-bankroll',String(amount));
  const secret=localStorage.getItem(WALLET_KEY);if(secret)fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',secret,bets,startingBalance:amount})}).then(r=>SYNC_STATUS(r.ok?'Bankroll sauvegardée.':'Échec de la sauvegarde cloud')).catch(()=>SYNC_STATUS('Échec de la sauvegarde cloud'));
 };
 const availableBankroll=startingBalance-bets.reduce((sum,b)=>sum+b.stake,0)+bets.reduce((sum,b)=>sum+(b.status==='won'?b.stake*b.chosenOdds:b.status==='void'?b.stake:0),0);
 const pending=bets.filter(x=>x.status==='open');
 const total=bets.reduce((s,x)=>s+x.stake,0);
 const profit=wins-losses;
 const settled=bets.filter(b=>b.status==='won'||b.status==='lost').sort((a,b)=>Date.parse(a.resultConfirmedAt||a.placedAt)-Date.parse(b.resultConfirmedAt||b.placedAt));
 const weeklySummary=Object.entries(bets.reduce<Record<string,{count:number;wins:number;losses:number;profit:number;stake:number}>>((out,b)=>{
  const dt=new Date(b.placedAt||Date.now());const date=Number.isFinite(dt.getTime())?dt.toISOString().slice(0,10):'Date inconnue';
  const monday=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate()));monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));const wk='Semaine du '+monday.toISOString().slice(0,10);
  const item=out[wk]||{count:0,wins:0,losses:0,profit:0,stake:0};
  item.count++;if(b.status==='won'){item.wins++;item.stake+=b.stake;item.profit+=b.stake*(b.chosenOdds-1)}if(b.status==='lost'){item.losses++;item.stake+=b.stake;item.profit-=b.stake}out[wk]=item;return out
 },{})).sort((a,b)=>b[0].localeCompare(a[0]));
 const won=bets.filter(b=>b.status==='won').length,lost=bets.filter(b=>b.status==='lost').length;
 const settledStake=settled.reduce((s,b)=>s+b.stake,0);
 const roi=settledStake?100*profit/settledStake:0;
 const curve=settled.reduce<number[]>((arr,b)=>[...arr,arr[arr.length-1]+(b.status==='won'?b.stake*(b.chosenOdds-1):-b.stake)],[0]);
 const lo=Math.min(0,...curve),hi=Math.max(1,...curve),span=hi-lo||1;
 const coords=curve.map((n,i)=>[20+(i/(Math.max(1,curve.length-1)))*560,155-(n-lo)/span*120] as const);
 const curvePath=coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const mix=Object.entries(bets.reduce<Record<string,{count:number;profit:number;stake:number}>>((a,b)=>{const k=b.market||'autres';const p=a[k]||{count:0,profit:0,stake:0};p.count++;if(b.status==='won'){p.profit+=b.stake*(b.chosenOdds-1);p.stake+=b.stake}else if(b.status==='lost'){p.profit-=b.stake;p.stake+=b.stake}a[k]=p;return a},{})).sort((a,b)=>b[1].profit-a[1].profit);

 return <section className="panel" style={{marginTop:16}}>{view!=='top'&&<div style={{padding:16,border:'1px solid #55b9e7',borderRadius:14,marginBottom:18,background:'#102b4d'}}><strong>🔐 COFFRE DES BOYS · MES PARIS SYNCHRONISÉS</strong><p>Crée un code privé, garde-le et colle-le sur ton deuxième appareil pour retrouver tes billets.</p><input value={walletCode} onChange={e=>WALLET_CODE(e.target.value)} placeholder="Code de synchronisation privé" aria-label="Code de synchronisation" style={{width:'100%',maxWidth:550,padding:12,color:'#07162a',borderRadius:7}}/><button type="button" onClick={connectWallet} style={{display:'block',marginTop:10,padding:12,background:'#61ebbd',borderRadius:8,color:'#082333',fontWeight:900}}>CRÉER / RELIER MON COFFRE</button><button type="button" disabled={!walletCode} onClick={()=>navigator.clipboard.writeText(walletCode).then(()=>SYNC_STATUS('Code copié. Garde-le privé, c’est la clé de ton coffre.')).catch(()=>SYNC_STATUS('Copie le code manuellement.'))} style={{padding:11,margin:'9px 0',borderRadius:8,border:'1px solid #77d4ff',background:'#12355a',color:'#fff',cursor:'pointer'}}>📋 COPIER MON CODE PRIVÉ</button><div style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap',marginTop:14}}><label style={{fontSize:12}}>Bankroll de départ (CAD)<input type="number" min="0" step="1" value={balanceDraft} onChange={e=>BALANCE_DRAFT(e.target.value)} style={{display:'block',padding:10,width:150,color:'#101d29'}}/></label><button type="button" onClick={updateStartingBankroll} style={{padding:11,borderRadius:8,background:'#65c1ff',fontWeight:900}}>Sauvegarder</button></div><p style={{fontSize:14}}>💰 Disponible : <strong>{fmt(availableBankroll)} $ CAD</strong> · Mises ouvertes : {fmt(bets.filter(b=>b.status==='open').reduce((s,b)=>s+b.stake,0))} $ · Profit réalisé : {fmt(profit)} $</p><p style={{fontSize:12}}>{syncStatus}</p></div>}
 <div className={'studio-hero '+(view==='top'&&category==='heavy'?'heavy-hero':'')}><div className="studio-stadium-lights" aria-hidden="true"><span/><span/><span/><span/></div><div className="studio-goalposts" aria-hidden="true"/><div className="studio-hero-inner">{view==='top'&&category==='heavy'?<><div className="heavy-emblem"><span className="heavy-overline">GROS RISQUES · GROS GAINS</span><span>HEAVY</span><strong>BALLS</strong><div className="metal-orbs"><i/><i/></div><div className="heavy-turf" aria-hidden="true"/><div className="heavy-stars" aria-hidden="true">✦ &nbsp; ★ &nbsp; ✦</div><small>ON LES DÉPOSE SUR LE SYNTHÉTIQUE</small></div></>:<><span className="studio-kicker">✦ NFL STUDIO · SAISON 2026</span><div className="studio-hero-title">{view==='top'?'TOP PARIS':view==='live'?'MES PARIS EN COURS':'BILAN DE SAISON'}</div><div className="studio-hero-rule" aria-hidden="true"><span>★</span></div><p>{view==='top'?'Meilleurs angles disponibles, avec diversification entre marchés et matchs':view==='live'?'Toutes tes mises, tes retours potentiels et leur statut':'Ton historique de paris et tes résultats en dollars canadiens'}</p></>}</div></div>
 <h2 style={{fontSize:28,marginBottom:8,display:'none'}}>{view==='top'?'🏆 TOP PARIS · SEMAINE NFL':view==='live'?'🎯 PARIS EN COURS':'📊 BILAN DE SAISON'}</h2>
 {view==='top'?<><p className="muted">Aucune recommandation officielle EXPERT NFL : moteur complet non exécuté. Marchés observés chez les bookmakers. Top 5 exploratoire calculé avec les cotes et les statistiques disponibles. Probabilités expérimentales clairement identifiées; un rapport indépendant vérifié reste prioritaire. Tu choisis librement tes paris. Sans validation de la probabilité et de l’avantage, décision : PASSER.</p>
 <div className="market-tabs" role="tablist" aria-label="Catégories de paris">{[['general','🏆 Top 5 général'],['moneyline','🏈 Moneyline'],['spreads','↔ Spreads'],['totals','📈 Totaux'],['props','▥ Props joueurs'],['heavy','🔥 HEAVY BALLS']].map(([k,v])=><button key={k} role="tab" aria-selected={category===k} className={category===k?'selected':''} onClick={()=>CATEGORY(k as typeof category)}>{v}</button>)}</div>
 <div style={{fontSize:12,color:'#b9dff3',margin:'11px 0',padding:'11px 13px',border:'1px solid #4384b7',borderRadius:11,background:'#0b2844'}}>Couverture du classement : {ranking.length}/5 choix calculables · Moneyline {marketCoverage.moneyline} · Spreads {marketCoverage.spreads} · Totaux {marketCoverage.totals} · Props {marketCoverage.props}. {ranking.length<5?'Moins de cinq choix fiables à afficher pour cette catégorie.':''} Simulations exploratoires non calibrées : une valeur espérée positive calculée n’est pas une garantie de profit.</div>
 {!loaded?<p>Chargement des cotes…</p>:ranking.length===0?<div className="empty">{gameResearchLoading?'Analyses des matchs en cours : les probabilités arrivent progressivement.':'Aucune sélection calculable dans cette catégorie actuellement. Vérifier les données et les probabilités du modèle.'} {category==='props'?' État du simulateur : '+researchStatus+'.':''}</div>:<div className="studio-picks-grid">{ranking.map((o,i)=><article key={o.id} className={'studio-pick-card pick-'+i+(category==='heavy'?' heavy-pick':'')}><span className="pick-rank">#{i+1}</span><span className="pick-market">{category==='heavy'?'HEAVY BALLS':o.market.toUpperCase()}</span><div className={"pick-art"+(o.market==="props"?" player-prop-art":"")}><div className="pick-spotlights" aria-hidden="true"/>{o.market==="props"?<PlayerPortrait player={o.player||"Joueur NFL"} game={o.game}/>:teamFrom(o.team)?<img className="pick-main-team-logo" src={logo(teamFrom(o.team)!)} alt={o.team}/>:<span>🏈</span>}<div className="pick-field-lines" aria-hidden="true"/>{o.market!=='props'&&teamSides(o.game).length===2&&<div className="pick-versus"><img src={logo(teamSides(o.game)[0])} alt=""/><b>VS</b><img src={logo(teamSides(o.game)[1])} alt=""/></div>}</div>{o.market==='props'&&<button className="pick-player-link" type="button" onClick={async()=>{const p=o.player||'';const sides=teamSides(o.game);try{const query=new URLSearchParams({name:p,teams:sides.join(',')});const response=await fetch('/api/players/lookup?'+query);const info=await response.json();if(info.player?.id){window.location.assign('/player/'+info.player.id)}else window.alert('Impossible de trouver la fiche ESPN de '+p+' pour le moment.')}catch{window.alert('Le service ESPN est temporairement indisponible.')}}}>🏈 VOIR LA FICHE DE {o.player?.toUpperCase()||'CE JOUEUR'} <span>↗</span></button>}<p className="pick-game">{o.game}</p><div className="pick-book">{o.book} · cote observée · {officialProbability(o)!==null?'rapport indépendant vérifié':'projection expérimentale'}</div><h3>{o.selection}</h3><div className="pick-metrics"><div><small>COTE</small><strong>{fmt(o.odds)}</strong></div><div><small>{officialProbability(o)!==null?'MODÈLE INDÉPENDANT':'ESTIMATION EXP.'}</small><strong>{officialProbability(o)!==null?Math.round(officialProbability(o)!*100)+'%':o.market==='props'&&researchValue(o)!==null?Math.round(researchValue(o)!.probability*100)+'% exp.':gameProjection(o)!==null?Math.round(gameProjection(o)!*100)+'% exp.':'—'}</strong></div></div><p style={{fontSize:13,color:'#dcecff',lineHeight:1.55,margin:'12px 0 8px',padding:'12px',background:'rgba(10,25,47,.72)',border:'1px solid rgba(120,180,245,.3)',borderRadius:10}}><strong style={{color:'#7de6fc'}}>{titleFor(o,i+1)}</strong><span style={{display:'block',marginTop:6}}>{reasoning(o,i+1)}</span></p><p style={{fontSize:12,color:'#c3d4e6',minHeight:54}}>{category==='heavy'?'PASSER — grande cote avec projection expérimentale seulement; avantage non validé et risque élevé.':officialProbability(o)!==null?'Rapport indépendant vérifié. Comparer les cotes et le contexte avant de choisir.':researchValue(o)?.explanation||gamesResearch[o.game]?.explanation||'Estimation exploratoire; vérifier le contexte et les conditions du bookmaker.'}</p><button className="pick-action" onClick={()=>choose(o)}>Voir ce pari →</button></article>)}</div>}
 {selected&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:99999,background:'rgba(1,7,20,.91)',display:'flex',alignItems:'center',justifyContent:'center',padding:'min(3vw,20px)',backdropFilter:'blur(14px)'}} onClick={()=>SELECT(null)}>
 <div role="dialog" aria-modal="true" aria-label="Analyse détaillée du pari" onClick={e=>e.stopPropagation()} style={{position:'relative',width:'min(940px,100%)',maxHeight:'94dvh',overflowY:'auto',lineHeight:1.65,borderRadius:20,border:'1px solid #4786b6',boxShadow:'0 25px 95px #000',padding:'clamp(18px,4vw,36px)',background:'linear-gradient(155deg,#102744,#071322 72%)',color:'#f2f7ff'}}>
 <div style={{height:5,background:'linear-gradient(90deg,#00d8ff,#3c77ff,#fe5d8f)',position:'sticky',top:0,zIndex:1,borderRadius:8,marginBottom:16}}/>
 <div className="bet-entry-head"><span>✦ NFL STUDIO · RAPPORT D'ANALYSE</span><button aria-label="Fermer" onClick={()=>SELECT(null)}>✕</button></div>
 <div style={{padding:'6px 0 12px'}}>
 <p style={{color:'#82d8ff',fontWeight:800,letterSpacing:1,fontSize:12}}>ÉTUDE D'UN MARCHÉ · {selected.market.toUpperCase()}</p>
 <h2 style={{fontSize:'clamp(23px,4vw,33px)',margin:'5px 0 8px'}}>{selected.selection}</h2>
 <p style={{opacity:.8,margin:'0 0 20px'}}>{selected.game} · {selected.book}</p>
 {(()=>{
 const officialP=officialProbability(selected),prop=selected.market==='props'?researchValue(selected):null,g=gamesResearch[selected.game];
 const p=officialP??(selected.market==='props'?prop?.probability??null:gameProjection(selected));
 const implied=1/selected.odds,edge=p===null?null:100*(p-implied),ev=p===null?null:100*(p*selected.odds-1);
 const pct=(n:number)=>(100*n).toFixed(1).replace('.',',')+' %';
 const signed=(n:number)=>(n>=0?'+':'')+n.toFixed(1).replace('.',',');
 const bodyStyle={margin:'8px 0 18px',color:'#e8f2ff',fontSize:15,lineHeight:1.85,padding:'16px 19px',borderRadius:12,background:'linear-gradient(105deg,rgba(15,43,78,.88),rgba(21,37,68,.72))',borderLeft:'4px solid #34d5ff',boxShadow:'inset 0 0 25px rgba(20,150,230,.07)'} as const;
 const titleStyle={margin:'25px 0 8px',fontSize:19,fontWeight:900,color:'#8ce5ff',padding:'8px 13px',borderRadius:9,background:'linear-gradient(90deg,rgba(20,98,144,.60),rgba(15,48,81,.05))',borderBottom:'1px solid rgba(76,174,227,.4)'} as const;
 return <>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
 {[[ 'Cote du bookmaker',fmt(selected.odds)],['Probabilité implicite',pct(implied)],['Probabilité calculée',p===null?'Indisponible':pct(p)],['Valeur espérée',ev===null?'Indisponible':signed(ev)+' %']].map(([label,value])=><div key={label} style={{padding:'12px 14px',border:'1px solid #365577',borderRadius:12,background:'#10253e'}}><div style={{fontSize:11,color:'#b5cadd'}}>{label}</div><strong style={{fontSize:22,color:'#fff'}}>{value}</strong></div>)}
 </div>
 <div style={{marginTop:24,padding:'22px',background:'linear-gradient(125deg,rgba(9,68,104,.65),rgba(34,22,74,.65))',border:'1px solid #357caa',borderRadius:16}}>
 <div style={{fontWeight:900,fontSize:12,letterSpacing:2,color:'#73e4ff'}}>🏈 LE VERDICT DU VESTIAIRE</div>
 <p style={{fontSize:'clamp(17px,2.5vw,21px)',fontWeight:650,lineHeight:1.65,margin:'10px 0 14px'}}>
 {selected.market==='props'
 ?`On sort le tableau noir pour ${selected.player||'notre joueur du jour'}. Le pari demande ${selected.selection}, et la cote de ${fmt(selected.odds)} veut dire que le bookmaker évalue ce scénario autour de ${pct(implied)}. ${p===null?'Notre moteur n’a pas assez de matière pour rendre son verdict — pas question de jouer au devin.':`Notre simulation historique, elle, voit ${pct(p)} de chances d’y arriver. ${edge!==null&&edge>0?'C’est un écart intéressant sur papier, mais le joueur doit encore livrer la marchandise sur le terrain.':'À ce prix-là, l’avantage n’est pas démontré.'}`}`
 :selected.market==='moneyline'
 ?`Dans ce duel ${selected.game}, le scénario étudié est simple : ${selected.selection}. À ${fmt(selected.odds)}, le bookmaker demande une réussite d’environ ${pct(implied)} pour atteindre le seuil de rentabilité. ${p===null?'Le modèle n’a pas livré de projection exploitable.':'Notre projection place plutôt cette victoire à '+pct(p)+'.'} ${g?'Sur le tableau de bord, la marge prévue du domicile est de '+g.projected_margin.toFixed(1)+' point(s), pour un total attendu de '+g.projected_total.toFixed(1)+' points.':'On évite de broder sur des statistiques qu’on n’a pas.'} ${edge!==null&&edge>0?'Le prix attire l’œil : reste à voir si notre modèle est assez solide pour défier la ligne.':'Pour l’instant, le bookmaker ne nous donne pas de cadeau évident.'}`
 :`On examine ${selected.selection} pour ${selected.game}. ${g?'Nos scores projetés pointent vers une marge domicile de '+g.projected_margin.toFixed(1)+' point(s) et un total de '+g.projected_total.toFixed(1)+' points.':'Le détail du scénario de match n’est pas disponible.'} À la cote de ${fmt(selected.odds)}, le seuil implicite est de ${pct(implied)}. ${p===null?'Sans probabilité du moteur, on garde le casque sur le banc.':'Notre estimation monte à '+pct(p)+', ce qui donne '+(edge===null?'un avantage inconnu':signed(edge)+' points d’écart')+'.'}`}
 </p>
 <div style={{borderTop:'1px solid rgba(145,205,255,.3)',paddingTop:12,color:'#ffd47c',fontWeight:850,fontSize:16}}>
 {p===null?'Pas de chiffres, pas de fanfaronnade : même le vestiaire sait quand passer son tour.'
 :ev!==null&&ev>0?(selected.market==='props'?'Le gars peut jouer comme un mâle alpha ou comme un gros zéro : ici, ce sont ses chiffres qui tranchent, pas notre grande gueule. 🏈':'Les boys, le booker nous laisse peut-être une porte grande ouverte. On va-tu le saigner ? Attendons de voir si le modèle dit vrai, tabarnak. 🔥')
 :'Une grosse cote de marde, ça reste une cote de marde. Pas besoin de jouer au cowboy, les boys. 🤠'}
 </div>
 </div>
 <h3 style={titleStyle}>01 · Le booker va-tu se faire saigner ?</h3>
 <p style={bodyStyle}>{p===null?'On va se le dire, les boys : notre moteur a sorti fuck all comme probabilité exploitable. Faire semblant de connaître les chances de ce pari, ce serait de la bullshit. Pour l’instant, ce pari reste sur le banc.':`Le modèle sort ${pct(p)} de chances pour ce pari. Le bookmaker, lui, nous sert une cote de ${fmt(selected.odds)}, soit ${pct(implied)} de probabilité implicite. Ça fait ${signed(edge!)} points de différence et une valeur espérée théorique de ${signed(ev!)} %. Pas pire comme duel de chiffres, mais on ne commence pas à se péter les bretelles : une estimation, c’est pas un touché déjà marqué, tabarnak.`}</p>
 <h3 style={titleStyle}>02 · On sort les chiffres, pas de bullshit</h3>
 <p style={bodyStyle}>{officialP!==null?'Ici, c’est le rapport indépendant EXPERT NFL qui fournit la probabilité de victoire. On se sert de son chiffre pour challenger la cote du bookmaker. Par contre, sa décomposition complète n’est pas disponible dans cette fenêtre : prétendre que tel receveur ou telle blessure vaut exactement trois points, ça serait se conter des histoires.':selected.market==='props'?'On check le gars aller depuis une couple de games. Si ses chiffres montrent qu’il est rendu un gros zéro, on va le dire; s’il performe, on va pas inventer de la marde non plus. Le moteur part de ses performances précédentes, donne davantage de poids aux récentes et simule les résultats possibles autour du seuil demandé. Quand les simulations dépassent souvent ce seuil, le pourcentage grimpe. Quand elles se plantent en dessous, ça redescend. '+(prop?.explanation||'Et s’il manque un historique fiable, on n’invente rien, même si le gars a l’air d’un mâle alpha sur sa photo.'):'On regarde les points marqués et encaissés par les deux équipes dans leurs derniers matchs disponibles. On projette ensuite la marge et le total du match. Un bonus de domicile entre dans le calcul et le quart-arrière projeté peut influencer les points si son historique est suffisant. Ensuite, on tient compte de l’incertitude pour estimer les chances du résultat. Pas glamour comme un vestiaire qui gueule, mais au moins c’est pas de la bullshit inventée.'}</p>
 <h3 style={titleStyle}>03 · Qui joue comme un mâle alpha, qui fait dur ?</h3>
 <p style={bodyStyle}>{selected.market==='props'?`Le gars qu’on a à l’œil, c’est ${selected.player||'celui affiché sur le billet'}. Le seuil est de ${selected.line??'valeur indisponible'}. ${prop?'Notre simulation de ses performances passées produit la probabilité affichée.':'On n’a pas retrouvé de simulation exploitable pour cette offre.'} Avant de crier au génie, il faudrait aussi confirmer son statut et le contexte défensif. Un gros nom sur un chandail ne garantit absolument rien.`:g?`Pour ${selected.game}, notre projection donne une marge de ${g.projected_margin.toFixed(1)} point(s) en faveur du domicile si elle est positive, et un total de ${g.projected_total.toFixed(1)} points. ${selected.market==='moneyline'?'C’est la marge et son incertitude qui alimentent les chances de victoire.':selected.market==='spreads'?'On ajoute le handicap à la marge projetée pour voir à quelle fréquence le pari pourrait couvrir la ligne.':'On compare le total projeté au seuil du bookmaker pour évaluer le dessus ou le dessous.'} C’est cette mécanique qui décide, pas le gars le plus bruyant autour de la table.`:'Les projections détaillées de ce match ne sont pas remontées ici. On ne va pas inventer la météo, le cornerback blessé ou le plan de match juste pour faire beau, sacrament.'}</p>
 <h3 style={titleStyle}>04 · À cette cote-là, on le saigne-tu ?</h3>
 <p style={bodyStyle}>{p===null?'Sans probabilité, impossible de calculer un avantage. On passe notre tour au lieu de lancer des billets à l’aveuglette.':ev!==null&&ev>0?`À ce prix-là, notre modèle voit un avantage théorique de ${signed(edge!)} points de probabilité. Sur 100 $ de mises réparties sur beaucoup de paris comparables, l’espérance nette serait de ${signed(ev!)} $ selon le modèle. À soir les boys, on voudrait saigner le booker, c’est pas compliqué — mais seulement si notre estimation tient la route. Mais si le pourcentage de départ est trop optimiste, la belle valeur peut fondre vite en maudit.`:`La valeur espérée calculée est de ${signed(ev??0)} %. Notre modèle ne voit donc pas de cadeau à cette cote. Même en criant comme des débiles devant la télé, une cote de marde reste une cote de marde.`}</p>
 <h3 style={titleStyle}>05 · Ce qui pourrait nous péter dans face</h3>
 <p style={bodyStyle}>{officialP!==null?'Les QB réellement titulaires, les blessés de dernière minute, les changements tactiques et la qualité de la calibration peuvent renverser notre lecture. Le rapport indépendant ne dévoile pas ici chacun de ses facteurs. Alors on garde un œil sur le terrain au lieu de vendre la peau de l’ours.':'Les probabilités sont encore expérimentales et non validées sur un historique indépendant de paris. Les blessures, la météo, les alignements confirmés et les confrontations individuelles ne sont pas toujours intégrés. Si un cornerback se blesse, on pourra en parler quand la donnée sera confirmée et reliée au modèle, pas avant. Ça serait trop facile de bullshitter pour avoir l’air brillant.'}</p>
 <p style={{padding:'11px 14px',borderRadius:9,background:'rgba(255,185,75,.1)',border:'1px solid rgba(255,185,75,.35)',fontSize:13,fontWeight:700}}>{p===null?'VERDICT DU BOYS CLUB : PAS DE CHIFFRES, PAS DE MISE À L’AVEUGLE.':ev!==null&&ev>0?'VERDICT DES BOYS : SI LE MODÈLE A RAISON, ON POURRAIT SAIGNER LE BOOKER. MAIS ON GARDE LA TÊTE FROIDE, TABARNAK.':'VERDICT DU BOYS CLUB : PAS BESOIN DE JOUER AU MÂLE ALPHA QUAND LES CHIFFRES DISENT NON.'}</p>
 </>})()}
 </div>
 {!showBetForm?<button onClick={()=>SHOW_BET_FORM(true)} style={{padding:'15px 20px',border:'2px solid #b1ffdb',borderRadius:12,background:'linear-gradient(100deg,#56fbb3,#2ed4fa)',fontWeight:950,fontSize:16,cursor:'pointer',color:'#061325',boxShadow:'0 0 28px rgba(46,212,250,.28)'}}>Gros, fais pas ton peureux, clic icitte →</button>:<div style={{borderTop:'1px solid #395c7c',paddingTop:16}}><h3>Bon, combien tu mets là-dessus, le gros ?</h3><p>Cote observée : {fmt(selected.odds)} · {selected.book}</p><div style={{display:'flex',gap:15,flexWrap:'wrap'}}><label>Cote décimale réelle <input type="number" min="1.01" step="0.01" value={odd} onChange={e=>ODD(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label><label>Mise CAD <input type="number" min="0.01" step="0.5" value={stake} onChange={e=>STAKE(e.target.value)} style={{display:'block',padding:8,width:140,color:'#111'}}/></label></div><p>Profit potentiel : {Number(odd.replace(',','.'))>1&&Number(stake)>0?fmt(Number(stake)*(Number(odd.replace(',','.'))-1))+' $ CAD':'—'}</p><button onClick={add} style={{padding:12,border:0,borderRadius:9,background:'#37cb9c',fontWeight:800,cursor:'pointer',color:'#071528'}}>C'est dans mes paris en cours, esti !</button></div>}
 <button onClick={()=>SELECT(null)} style={{marginLeft:10,padding:12,cursor:'pointer'}}>Fermer</button>
 </div></div>}
 </>:<><div className="studio-bet-kpis kpis"><div>💳 Mises enregistrées<strong>{fmt(total)} $ CAD</strong></div><div>📈 Profit réalisé net<strong style={{color:profit>=0?'#52dfb0':'#ff9ca2'}}>{fmt(profit)} $ CAD</strong></div><div>🏆 Gain potentiel brut<strong>{fmt(pending.reduce((s,x)=>s+x.stake*x.chosenOdds,0))} $ CAD</strong></div><div>🎯 Paris enregistrés<strong>{bets.length}</strong></div></div>{view==='history'&&<div className="season-analytics">
 <div className="season-chart"><h3>📈 Évolution des gains nets</h3><div className="season-big">{profit>=0?'+':''}{fmt(profit)} $ CAD</div><p>Résultat cumulé des {settled.length} paris terminés · ROI {roi.toFixed(1)} %</p><svg viewBox="0 0 600 182" role="img" aria-label="Évolution des profits cumulés, calculée sur les paris enregistrés"><defs><linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#42f5b0" stopOpacity=".35"/><stop offset="1" stopColor="#42f5b0" stopOpacity="0"/></linearGradient></defs>{[35,75,115,155].map(y=><line key={y} x1="20" x2="580" y1={y} y2={y} stroke="#42637d" strokeDasharray="5 7" opacity=".5"/>)}<path d={curvePath+' L '+coords[coords.length-1][0]+' 170 L 20 170 Z'} fill="url(#profitFill)"/><path d={curvePath} stroke={profit>=0?'#48f0aa':'#ff6689'} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round"/><circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="6" fill="#fff" stroke="#48f0aa" strokeWidth="3"/></svg></div>
 <div className="season-results"><h3>🎯 Répartition des résultats</h3><div className="season-ring" style={{background:won+lost?'conic-gradient(#40df9d 0 '+(won/(won+lost)*100)+'%,#f45b77 '+(won/(won+lost)*100)+'% 100%)':'conic-gradient(#1e445f 0 100%)'}}><div><strong>{won+lost}</strong><small>terminés</small></div></div><div className="season-legend"><span>🟢 Gagnés <strong>{won}</strong></span><span>🔴 Perdus <strong>{lost}</strong></span><span>Réussite <strong>{won+lost?((won/(won+lost))*100).toFixed(1):'—'}%</strong></span></div></div>
 <div className="season-markets"><h3>🏆 Résultats par marché</h3>{mix.length?mix.map(([name,s])=><div key={name} className="season-market-row"><b>{name==='moneyline'?'Moneyline':name==='spreads'?'Spreads':name==='totals'?'Totaux':name==='props'?'Props joueurs':name}</b><span>{s.count} paris</span><strong style={{color:s.profit>=0?'#45e6a2':'#ff7187'}}>{s.profit>=0?'+':''}{fmt(s.profit)} $</strong></div>):<p>Les performances par marché apparaîtront dès qu'un pari sera enregistré.</p>}</div>
 </div>}
 {view==='live'&&<LiveBetTracker bets={pending}/>}
 {view==='history'&&<ForecastAudit/>}
 {view==='history'&&<div style={{border:'1px solid #4aafe2',padding:16,borderRadius:14,margin:'16px 0',background:'#102942'}}><h2>📊 BILAN HEBDOMADAIRE DES BOYS</h2><p>Chaque semaine, gains, pertes, profit net et rendement des mises réglées en CAD.</p>{weeklySummary.length?weeklySummary.map(([week,s])=><div key={week} style={{padding:12,borderBottom:'1px solid #376a93'}}><strong>{week}</strong><div>{s.count} paris · {s.wins} gagnés / {s.losses} perdus</div><div style={{color:s.profit>=0?'#75ebbd':'#ff9ba9'}}>Profit : {fmt(s.profit)} $ · ROI : {s.stake?(100*s.profit/s.stake).toFixed(1):'—'} %</div></div>):<p>Enregistre des paris pour produire le premier bilan.</p>}<p style={{fontSize:12,color:'#c3d9ea'}}>Brier Score et calibration : non calculés tant que les probabilités pré-match horodatées et les résultats correspondants n'ont pas été validés. Les prédictions expérimentales ne sont pas présentées comme des performances officielles.</p></div>}<p className="muted">Suivi local à ce navigateur. Les mises ne sont pas transmises à Mise-o-jeu. Résultats à confirmer manuellement pour le moment; ce n'est pas encore un suivi des matchs en direct.</p>{(view==='live'?bets.map((b,i)=>({...b,idx:i})).filter(b=>b.status==='open'):bets.map((b,i)=>({...b,idx:i}))).length?<div style={{display:'grid',gap:10}}>{bets.map((b,i)=>({...b,idx:i})).filter(b=>view==='history'||b.status==='open').map(b=><div key={b.idx} className={'live-bet-row status-'+b.status}><div className="bet-side-art">{teamFrom(b.team)?<img src={logo(teamFrom(b.team)!)} alt={b.team}/>:<span>🏈</span>}</div><div className="bet-row-content"><strong>{b.selection}</strong><p style={{margin:'4px 0',fontSize:13}}>{b.game} · Mise {fmt(b.stake)} $ · Cote {fmt(b.chosenOdds)} · <span className="bet-status">{b.status==='open'?'EN COURS':b.status==='won'?'✓ GAGNÉ':b.status==='lost'?'✕ PERDU':'ANNULÉ'}</span></p><div className="bet-row-return">Retour potentiel <strong>{fmt(b.stake*b.chosenOdds)} $</strong></div><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{b.status==='open'&&<><button onClick={()=>update(b.idx,'won')}>Marquer gagné</button><button onClick={()=>update(b.idx,'lost')}>Marquer perdu</button><button onClick={()=>update(b.idx,'void')}>Annulé</button></>}</div></div></div>)}</div>:<p className="empty">Aucun pari enregistré.</p>}</>}
 </section>
}
