'use client';
import {useEffect,useRef,useState} from 'react';
import LiveHighlights from './live-highlights';
import HighlightTicket from './highlight-ticket';
import DailyBetsTicket from './daily-bets-ticket';
type Bet={id:string;game:string;market:string;marketKey?:string;selection:string;line?:number;player?:string;team:string;status:string;stake?:number;chosenOdds?:number;legs?:Array<{game:string;selection:string;market:string;odds:number;probability:number}>};
type Team={abbr:string;name:string;score:number};
type Game={id:string;date:string;home:Team;away:Team;status:string;state:string;clock:string;period:number;complete:boolean};
type Player={name:string;category:string;values:Record<string,string>};
type Feed={status:string;games:Game[];players:Record<string,Player[]>;updatedAt:string};
const logoUrl=(abbr:string)=>'https://a.espncdn.com/i/teamlogos/nfl/500/'+(({LA:'lar',WSH:'wsh'} as Record<string,string>)[abbr]||abbr).toLowerCase()+'.png';
const TeamLogo=({abbr,size=36}:{abbr:string;size?:number})=><img src={logoUrl(abbr)} alt={'Logo '+abbr} loading="lazy" style={{width:size,height:size,objectFit:'contain',filter:'drop-shadow(0 0 8px #42caff55)',flexShrink:0}}/>;
const tidy=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
const playerKey=(s:string)=>tidy(s).replace(/\s+/g,'');
const sideMatch=(raw:string,t:Team)=>{const part=tidy(raw),name=tidy(t.name),short=tidy(t.abbr==='LAR'?'LA':t.abbr==='WSH'?'WAS':t.abbr);return part===name||part===short||part===name.split(' ').slice(-1)[0]};
const match=(name:string,g:Game)=>{const sides=name.split(/\s+vs\s+/i);return sides.length===2&&sideMatch(sides[0],g.away)&&sideMatch(sides[1],g.home)};
function measure(b:Bet,players:Player[]):{value:number;label:string}|null{
 const key=(b.marketKey||b.selection||'').toLowerCase();
 const player=playerKey(b.player||'');if(!player)return null;
 const categories:[string,string,string[]][]=[
 ['player_pass_yds','passing',['YDS']],['player_pass_tds','passing',['TD']],['player_pass_completions','passing',['C/ATT']],
 ['player_rush_yds','rushing',['YDS']],['player_reception_yds','receiving',['YDS']],['player_receptions','receiving',['REC']]
 ];
 const aliases:Record<string,string>={player_rushing_yards:'player_rush_yds',player_receiving_yards:'player_reception_yds',player_reception_yards:'player_reception_yds',player_passing_yards:'player_pass_yds'};
 const normalized=aliases[key]||key;
 const choice=categories.find(x=>normalized.includes(x[0]));if(!choice)return null;
 const row=players.find(p=>playerKey(p.name)===player&&p.category.toLowerCase().includes(choice[1]));
 if(!row)return null;
 const val=choice[2].map(x=>row.values[x]).find(v=>v!==undefined);if(val===undefined)return null;
 const num=choice[0]==='player_pass_completions'?Number(val.split('/')[0]):Number(val);
 return Number.isFinite(num)?{value:num,label:choice[0].replaceAll('player_','').replaceAll('_',' ')}:null;
}
type Mood='good'|'neutral'|'bad';
const moodTheme=(m:Mood)=>m==='good'?{background:'linear-gradient(145deg,#225f49,#163f37 70%,#112f34)',border:'1px solid #57efa8',boxShadow:'inset 0 0 35px #44ff981e,0 0 16px #4cff9a24'}:m==='bad'?{background:'linear-gradient(145deg,#713444,#4a2938 70%,#302633)',border:'1px solid #ff8596',boxShadow:'inset 0 0 35px #ff648c1a,0 0 16px #ff648c26'}:{background:'linear-gradient(145deg,#69512f,#453a2c 70%,#302e30)',border:'1px solid #ffc477',boxShadow:'inset 0 0 35px #ffd16a19,0 0 16px #ffbe6920'};
function ticketMood(b:Bet,feed:Feed):Mood{
 if(b.market==='parlay'&&b.legs?.length){
  const states=b.legs.map(leg=>{
   const g=feed.games.find(g=>match(leg.game,g));if(!g)return 0;
   const chosen=leg.selection.toLowerCase();
   const side=chosen.includes(g.home.name.toLowerCase())?g.home:chosen.includes(g.away.name.toLowerCase())?g.away:null;
   if(!side)return 0;
   const other=side===g.home?g.away:g.home;
   const handicap=leg.market==='spreads'?Number(leg.selection.match(/([+-]\\d+(?:\\.\\d+)?)/)?.[1]):0;
   const margin=side.score-other.score+(Number.isFinite(handicap)?handicap:0);
   return g.state==='pre'?0:Math.sign(margin);
  });
  return states.some(s=>s<0)?'bad':states.some(s=>s>0)?'good':'neutral';
 }
 const g=feed.games.find(g=>match(b.game,g));if(!g||g.state!=='in')return 'neutral';
 const actual=measure(b,feed.players[g.id]||[]);
 const line=Number(b.line),hasLine=b.line!==undefined&&b.line!==null&&Number.isFinite(line)&&line>=0;
 if(b.market==='props'){
  const goal=hasLine&&/\\bover\\b|\\bplus\\b|\\d+\\+/i.test(b.selection)?Math.floor(line)+1:null;
  if(!actual||!goal)return 'neutral';
  const progress=100*actual.value/goal;
  return actual.value>=goal||progress>=65?'good':progress<25?'bad':'neutral';
 }
 if(b.market==='moneyline'||b.market==='spreads'){
  const home=sideMatch(b.team,g.home),away=sideMatch(b.team,g.away);
  if(!home&&!away)return 'neutral';
  const margin=home?g.home.score-g.away.score:g.away.score-g.home.score;
  const adjusted=margin+(b.market==='spreads'&&hasLine?line:0);
  return adjusted>0?'good':adjusted<0?'bad':'neutral';
 }
 return 'neutral';
}
const moodLabel=(m:Mood)=>m==='good'?'🟢 FAVORABLE':m==='bad'?'🔴 DÉFAVORABLE':'🟠 À SURVEILLER';
function Ticket({b,feed}:{b:Bet;feed:Feed}){
 const game=feed.games.find(g=>match(b.game,g));
 const [portrait,SET_PORTRAIT]=useState<string|null>(null);
 const isProp=b.market==='props';
 useEffect(()=>{
  if(!isProp||!b.player||!game)return;
  let live=true;
  const q=new URLSearchParams({player:b.player,away:game.away.abbr,home:game.home.abbr});
  fetch('/api/player-portrait?'+q).then(r=>r.json()).then(d=>{if(live)SET_PORTRAIT(d.found&&typeof d.url==='string'?d.url:null)}).catch(()=>{});
  return()=>{live=false};
 },[b.player,isProp,game?.away.abbr,game?.home.abbr]);
 if(!game)return null;
 const actual=measure(b,feed.players[game.id]||[]);
 const line=Number(b.line);
 const hasLine=b.line!==undefined&&b.line!==null&&Number.isFinite(line)&&line>=0;
 const target=hasLine?Math.floor(line)+1:null;
 const total=game.home.score+game.away.score;
 const over=/\bover\b|\bplus\b|\d+\+/i.test(b.selection);
 const propGoal=isProp&&over&&target!==null?target:null;
 const progress=isProp&&actual&&propGoal?Math.max(0,Math.min(100,100*actual.value/propGoal)):b.market==='totals'&&hasLine&&line>0?Math.max(0,Math.min(100,100*total/line)):null;
 const reached=isProp&&actual&&propGoal!==null&&actual.value>=propGoal;
 const pickHome=sideMatch(b.team,game.home),pickAway=sideMatch(b.team,game.away);
 const pickedScore=pickHome?game.home.score:pickAway?game.away.score:null;
 const otherScore=pickHome?game.away.score:pickAway?game.home.score:null;
 const diff=pickedScore!==null&&otherScore!==null?pickedScore-otherScore:null;
 const cover=b.market==='spreads'&&diff!==null&&hasLine?diff+line:null;
 const money=b.market==='moneyline'&&diff!==null?diff:null;
 const scoreRelevant=b.market==='spreads'||b.market==='moneyline'||b.market==='totals';
 const mood:Mood=game.state!=='in'?'neutral':isProp?(reached?'good':progress!==null&&progress>=65?'good':progress!==null&&progress<25?'bad':'neutral'):cover!==null?(cover>0?'good':cover<0?'bad':'neutral'):money!==null?(money>0?'good':money<0?'bad':'neutral'):'neutral';
 const barColor=reached?'linear-gradient(90deg,#18e7bd,#83ffe4)':'linear-gradient(90deg,#00c9ff,#38a5ff,#7e6eff)';
 const label=actual?.label==='rush yds'?'verges au sol':actual?.label==='reception yds'?'verges en réception':actual?.label==='pass yds'?'verges à la passe':actual?.label==='receptions'?'réceptions':actual?.label||'statistique';
 return <article className="studio-live-ticket" data-mood={mood} style={{padding:'22px 19px',borderRadius:22,...moodTheme(mood),overflow:'hidden'}}>
  <div style={{fontSize:12,fontWeight:950,letterSpacing:1.1,color:'#ffffff',marginBottom:7}}>{moodLabel(mood)}</div>
  <div className="studio-live-top"><span>{game.state==='in'?'🔴 EN DIRECT':game.complete?'✓ FINAL':'⏳ À VENIR'}</span><span>{game.status}{game.clock&&game.state==='in'?' · '+game.clock:''}</span></div><div className="studio-live-matchup"><TeamLogo abbr={game.away.abbr} size={37}/><span>{game.away.abbr}</span><b>VS</b><span>{game.home.abbr}</span><TeamLogo abbr={game.home.abbr} size={37}/></div>
  {isProp?<div style={{display:'flex',alignItems:'center',gap:16,margin:'18px 0'}}>
    <div style={{width:100,height:122,border:'1px solid #299dc7',borderRadius:14,background:'linear-gradient(155deg,#154568,#08182e)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
     {(/\bjames\s+cook\b/i.test([b.player,b.selection].filter(Boolean).join(' ')))?<span role="img" aria-label="Tas de merde" style={{fontSize:88,lineHeight:1}}>💩</span>:portrait?<img src={portrait} alt={'Portrait de '+b.player} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={()=>SET_PORTRAIT(null)}/>:<span style={{fontSize:40}}>🏈</span>}
    </div>
    <div style={{minWidth:0,flex:1}}>
      <div style={{fontSize:12,color:'#81dafa',letterSpacing:1.2,fontWeight:800}}>PROP JOUEUR · {game.away.abbr} vs {game.home.abbr}</div>
      <h3 style={{fontSize:23,margin:'7px 0',lineHeight:1.1}}>{b.player||b.selection}</h3>
      <div style={{fontSize:13,color:'#b9d3ee'}}>{b.selection}</div>
    </div>
   </div>:<div className="studio-live-pick" style={{marginTop:15}}><span>{b.market.toUpperCase()}</span><h3>{b.selection}</h3></div>}
  {scoreRelevant&&<div className="studio-live-score"><strong>{game.away.abbr} <b>{game.away.score}</b></strong><span>VS</span><strong>{game.home.abbr} <b>{game.home.score}</b></strong></div>}
  {isProp&&<div style={{padding:'16px 0'}}>
    <div style={{fontSize:13,color:'#8edcff',fontWeight:850,letterSpacing:1}}>{label.toUpperCase()}</div>
    <div style={{display:'flex',alignItems:'baseline',gap:9,margin:'7px 0 15px'}}>
     <strong style={{fontSize:44,color:'#42f1c9',lineHeight:1}}>{actual?actual.value:'—'}</strong>
     <span style={{fontSize:19,color:'#b7cdea'}}> / {propGoal??(hasLine?line:'—')} {label}</span>
    </div>
    <div style={{height:17,background:'#223651',borderRadius:999,overflow:'hidden',boxShadow:'inset 0 0 12px #031320'}}>
      <div style={{height:'100%',width:(progress??0)+'%',borderRadius:999,background:barColor,boxShadow:'0 0 18px #00ddfa',transition:'width 650ms ease'}}/>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:9,fontSize:13}}>
      <strong style={{color:reached?'#65ffd4':'#86cbf5'}}>{progress!==null?Math.round(progress)+' % complété':'En attente des statistiques ESPN'}</strong>
      <span style={{color:'#b7cdea'}}>Objectif : {propGoal??'—'}</span>
    </div>
  </div>}
  {b.market==='totals'&&<div><strong>{total} points combinés</strong>{progress!==null&&<div className="studio-live-progress"><div style={{width:progress+'%'}}/></div>}</div>}
  {cover!==null&&<p style={{fontWeight:850,color:cover>0?'#65ffd4':cover===0?'#ffe082':'#ff9bad'}}>{cover>0?'✓ Handicap couvert pour le moment':cover===0?'Égalité avec le handicap':'Handicap non couvert actuellement'} · Écart réel {diff!>0?'+':''}{diff} · Ligne {line>0?'+':''}{line}</p>}
  {money!==null&&<p style={{fontWeight:850,color:money>0?'#65ffd4':money===0?'#ffe082':'#ff9bad'}}>{money>0?'Ton équipe mène':money===0?'Égalité':'Ton équipe tire de l’arrière'}</p>}
  {reached&&<strong className="studio-live-alert">⚡ OBJECTIF ATTEINT ! Vérifie le règlement officiel du pari.</strong>}
  <div style={{display:'flex',justifyContent:'space-between',gap:10,marginTop:14,padding:'12px 0',borderTop:'1px solid #264a6c',fontSize:13}}>
    <span>MISE <strong>{'stake' in b?Number((b as Bet&{stake:number}).stake).toFixed(2):'—'} $</strong></span>
    <span>COTE <strong>{'chosenOdds' in b?Number((b as Bet&{chosenOdds:number}).chosenOdds).toFixed(2):'—'}</strong></span>
    <span>RETOUR <strong>{'stake' in b&&'chosenOdds' in b?(Number((b as Bet&{stake:number}).stake)*Number((b as Bet&{chosenOdds:number}).chosenOdds)).toFixed(2)+' $':'—'}</strong></span>
  </div>
  <small>ESPN · Mise à jour {new Date(feed.updatedAt).toLocaleTimeString('fr-CA',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit'})}. {game.state==='pre'?'Match à venir.':isProp&&!actual?'Statistiques individuelles non encore disponibles.':'Résultat à confirmer selon le bookmaker.'}</small>
 </article>;
}
function ParlayTicket({b,feed}:{b:Bet;feed:Feed}){
 const legs=b.legs||[];
 const states=legs.map(leg=>{
  const game=feed.games.find(g=>match(leg.game,g));
  if(!game)return {leg,status:'unknown' as const,detail:'Match non disponible'};
  const sides=leg.game.split(/\\s+vs\\s+/i);
  const chosen=leg.selection.toLowerCase();
  const homeSelected=chosen.includes(game.home.name.toLowerCase());
  const awaySelected=chosen.includes(game.away.name.toLowerCase());
  const side=homeSelected?game.home:awaySelected?game.away:null;
  const other=homeSelected?game.away:awaySelected?game.home:null;
  const handicap=leg.market==='spreads'?Number(leg.selection.match(/([+-]\\d+(?:\\.\\d+)?)/)?.[1]):0;
  if(!side||!other)return {leg,status:'unknown' as const,detail:'Sélection non reconnue'};
  const margin=side.score-other.score+(Number.isFinite(handicap)?handicap:0);
  const status=game.complete?(margin>0?'won' as const:margin<0?'lost' as const:'push' as const):game.state==='in'?(margin>0?'leading' as const:'trailing' as const):'pending' as const;
  return {leg,status,detail:game.away.abbr+' '+game.away.score+' – '+game.home.abbr+' '+game.home.score+(game.complete?' · FINAL':game.state==='in'?' · LIVE':' · À venir')};
 });
 const won=states.filter(x=>x.status==='won').length,lost=states.filter(x=>x.status==='lost').length,active=states.filter(x=>x.status==='leading').length;
 const parlayMood:Mood=states.some(x=>x.status==='lost'||x.status==='trailing')?'bad':states.some(x=>x.status==='leading'||x.status==='won')?'good':'neutral';
 const overall=lost?'UNE BRANCHE PERDUE':won===states.length?'TOUTES LES BRANCHES GAGNÉES':active?'DES BRANCHES EN BONNE POSITION':'EN ATTENTE';
 return <article className="studio-live-ticket" data-mood={parlayMood} style={{padding:22,borderRadius:22,...moodTheme(parlayMood)}}>
  <div style={{color:'#ebb4ff',fontWeight:900,letterSpacing:1}}>💥 {b.selection.startsWith('Heavyball')?'HEAVYBALL PARLAY':'PARLAY'} · {legs.length} BRANCHES</div>
  <div style={{fontSize:12,fontWeight:950,color:'#fff',marginTop:8}}>{moodLabel(parlayMood)}</div>
  <h3 style={{fontSize:22,margin:'12px 0'}}>{overall}</h3>
  <div style={{height:14,borderRadius:20,background:'#25334e',overflow:'hidden'}}><div style={{height:'100%',width:(legs.length?100*won/legs.length:0)+'%',background:'linear-gradient(90deg,#8a4fff,#27efc7)',boxShadow:'0 0 16px #a47fff',transition:'width 700ms'}}/></div>
  <p style={{color:'#c9d4ed',margin:'8px 0 15px'}}>{won} / {legs.length} branches officiellement gagnées · {active} favorable(s) en direct</p>
  {states.map((x,i)=><div key={i} style={{padding:'12px 0',borderTop:'1px solid #3c416b'}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{i+1}. {x.leg.selection}</strong><b style={{color:x.status==='won'?'#58ffd1':x.status==='lost'?'#ff829d':x.status==='leading'?'#8bf0df':'#d2baff'}}>{x.status==='won'?'✓ GAGNÉ':x.status==='lost'?'✕ PERDU':x.status==='leading'?'● FAVORABLE':x.status==='trailing'?'● DÉFAVORABLE':'EN ATTENTE'}</b></div>
   <div style={{display:'flex',alignItems:'center',gap:7,marginTop:5}}>{(()=>{const g=feed.games.find(g=>match(x.leg.game,g));return g?<><TeamLogo abbr={g.away.abbr} size={24}/><TeamLogo abbr={g.home.abbr} size={24}/></>:null})()}<span style={{fontSize:12,color:'#b6cce5'}}>{x.detail} · cote {x.leg.odds.toFixed(2)}</span></div>
  </div>)}
  <p style={{fontWeight:800,color:'#aef9e4'}}>Mise {Number(b.stake||0).toFixed(2)} $ · Cote {Number(b.chosenOdds||0).toFixed(2)} · Retour possible {(Number(b.stake||0)*Number(b.chosenOdds||0)).toFixed(2)} $</p>
  <small>ESPN actualisé {new Date(feed.updatedAt).toLocaleTimeString('fr-CA',{timeZone:'America/Toronto'})} · Suivi indicatif; confirmation finale selon le bookmaker.</small>
 </article>;
}
export default function LiveBetTracker({bets,allBets}:{bets:Bet[];allBets:Bet[]}){
 const [feed,SET]=useState<Feed|null>(null),[alerts,ALERTS]=useState<string[]>([]);
 const past=useRef<Record<string,{away:number;home:number}>>({});
 useEffect(()=>{let active=true;const update=()=>fetch('/api/live-coverage',{cache:'no-store'}).then(r=>r.json()).then((d:Feed)=>{
  if(!active)return;
  if(Array.isArray(d.games)){const notices:string[]=[];
   for(const g of d.games){const before=past.current[g.id];if(before&&g.state==='in'&&(g.away.score!==before.away||g.home.score!==before.home)){
    const who=g.away.score>before.away?g.away.name:g.home.name;
    notices.push('⚡ LE SCORE BOUGE : '+who+' — '+g.away.abbr+' '+g.away.score+' / '+g.home.abbr+' '+g.home.score);
    const oldLeader=Math.sign(before.away-before.home),newLeader=Math.sign(g.away.score-g.home.score);
    if(oldLeader!==0&&newLeader!==0&&oldLeader!==newLeader)notices.push('🔥 REVIREMENT AU TABLEAU : les meneurs viennent de changer !');
   }
   past.current[g.id]={away:g.away.score,home:g.home.score};
   }if(notices.length)ALERTS(prev=>[...notices,...prev].slice(0,5));
  }
  SET(d);
 }).catch(()=>{});update();const timer=setInterval(update,45000);return()=>{active=false;clearInterval(timer)}},[]);
 const matches=feed?.games?bets.filter(b=>b.market==='parlay'&&b.legs?.length||feed.games.some(g=>match(b.game,g))):[];
 const [order,ORDER]=useState<'live'|'upcoming'|'completed'>('live');
 const [marketFilter,MARKET_FILTER]=useState<'all'|'parlay'|'props'|'game'>('all');
 const statusOf=(b:Bet)=>{
  const games=b.market==='parlay'&&b.legs?.length?b.legs.map(l=>feed?.games.find(g=>match(l.game,g))):[feed?.games.find(g=>match(b.game,g))];
  if(games.some(g=>g?.state==='in'))return 'live';
  if(games.length&&games.every(g=>g?.complete))return 'completed';
  if(games.some(g=>g?.complete))return 'live';
  return 'upcoming';
 };
 const visible=matches.filter(b=>statusOf(b)===order).filter(b=>marketFilter==='all'||marketFilter==='parlay'&&b.market==='parlay'||marketFilter==='props'&&b.market==='props'||marketFilter==='game'&&b.market!=='props'&&b.market!=='parlay').sort((a,b)=>{
  const time=(bet:Bet)=>{const first=bet.market==='parlay'&&bet.legs?.length?bet.legs[0].game:bet.game;return Date.parse(feed?.games.find(g=>match(first,g))?.date||'')||0};
  if(order==='live'&&feed){const rank:Record<Mood,number>={good:0,neutral:1,bad:2};const difference=rank[ticketMood(a,feed)]-rank[ticketMood(b,feed)];if(difference!==0)return difference;}
  return order==='upcoming'?time(a)-time(b):time(b)-time(a);
 });
 if(!bets.length)return null;
 return <section className="studio-live"><div className="studio-live-head"><span>⚡ LIVE TRACKER · ESPN</span><h2>LES PARIS DES BOYS EN DIRECT</h2><p>Scores actualisés automatiquement aux 45 secondes. Progression des Props lorsque la statistique du joueur est disponible.</p></div>
 
 {alerts.length>0&&<div className="studio-live-alerts"><strong>🔔 LES NOUVELLES DU SCORE</strong>{alerts.map((alert,i)=><p key={i}>{alert}</p>)}</div>}
 {!feed?<p>On branche les tableaux de matchs…</p>:feed.status!=='ok'?<p>Les scores en direct sont momentanément indisponibles.</p>:matches.length===0?<p>Aucune de tes mises ouvertes ne correspond aux rencontres de la semaine suivie actuellement.</p>:<><div style={{display:'flex',gap:7,overflowX:'auto',margin:'12px 0',paddingBottom:4}}>{([['live','🔴 En direct'],['upcoming','⏰ À venir'],['completed','🏁 Terminés']] as const).map(([k,label])=><button key={k} onClick={()=>ORDER(k)} style={{whiteSpace:'nowrap',padding:'10px 12px',borderRadius:12,background:order===k?'#236878':'#172e48',color:'#fff',fontWeight:800,border:'1px solid '+(order===k?'#65ebdb':'#345876')}}>{label} ({matches.filter(b=>statusOf(b)===k).length})</button>)}</div><div style={{display:'flex',gap:7,overflowX:'auto',marginBottom:14}}>{([['all','Tous'],['parlay','🔥 Parlays'],['props','🎯 Props'],['game','🏈 Matchs']] as const).map(([k,label])=><button key={k} onClick={()=>MARKET_FILTER(k)} style={{whiteSpace:'nowrap',padding:'7px 11px',borderRadius:20,background:marketFilter===k?'#315c83':'#142940',color:'#fff',border:'1px solid #43627c'}}>{label}</button>)}</div><LiveHighlights /><div style={{fontSize:12,color:'#a8dbef',fontWeight:800,margin:'10px 0'}}>🎨 Tri automatique : 🟢 Favorables → 🟠 À surveiller → 🔴 Défavorables · Les états sont indicatifs pendant le match.</div><div className="studio-live-grid">{visible.map(b=>b.market==='parlay'&&b.legs?.length?<ParlayTicket key={b.id} b={b} feed={feed}/>:<Ticket key={b.id} b={b} feed={feed}/>)}<HighlightTicket /><DailyBetsTicket bets={allBets}/></div></>}
 </section>;
}
