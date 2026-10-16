'use client';
import {useEffect,useRef,useState} from 'react';
type Bet={id:string;game:string;market:string;marketKey?:string;selection:string;line?:number;player?:string;team:string;status:string};
type Team={abbr:string;name:string;score:number};
type Game={id:string;date:string;home:Team;away:Team;status:string;state:string;clock:string;period:number;complete:boolean};
type Player={name:string;category:string;values:Record<string,string>};
type Feed={status:string;games:Game[];players:Record<string,Player[]>;updatedAt:string};
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
 const choice=categories.find(x=>key.includes(x[0]));if(!choice)return null;
 const row=players.find(p=>playerKey(p.name)===player&&p.category.toLowerCase().includes(choice[1]));
 if(!row)return null;
 const val=choice[2].map(x=>row.values[x]).find(v=>v!==undefined);if(val===undefined)return null;
 const num=choice[0]==='player_pass_completions'?Number(val.split('/')[0]):Number(val);
 return Number.isFinite(num)?{value:num,label:choice[0].replaceAll('player_','').replaceAll('_',' ')}:null;
}
function Ticket({b,feed}:{b:Bet;feed:Feed}){
 const game=feed.games.find(g=>match(b.game,g));if(!game)return null;
 const key=b.marketKey||b.selection,players=feed.players[game.id]||[];
 const actual=measure(b,players),line=Number(b.line),hasLine=Number.isFinite(line)&&line>0;
 const total=game.home.score+game.away.score;
 const chosen=tidy(b.team);const pickHome=sideMatch(b.team,game.home),pickAway=sideMatch(b.team,game.away);
 const pickedScore=pickHome?game.home.score:pickAway?game.away.score:null;
 const otherScore=pickHome?game.away.score:pickAway?game.home.score:null;
 const mlStatus=b.market==='moneyline'&&pickedScore!==null&&otherScore!==null?(game.complete?(pickedScore>otherScore?'✓ Victoire sur le terrain':pickedScore<otherScore?'✕ Défaite sur le terrain':'Égalité — règles à vérifier'):(game.state==='in'?(pickedScore>otherScore?'🟢 Ton équipe mène':pickedScore<otherScore?'🔴 Ton équipe tire de l’arrière':'🟡 Égalité pour le moment'):'Match à venir')):null;
 const progress=actual&&hasLine?Math.max(0,Math.min(100,100*actual.value/line)):b.market==='totals'&&hasLine?Math.max(0,Math.min(100,100*total/line)):null;
 const over=/\bover\b|\bplus\b/i.test(b.selection);
 const locked=actual&&hasLine&&over&&actual.value>line;
 return <article className="studio-live-ticket">
  <div className="studio-live-top"><span>{game.state==='in'?'🔴 EN DIRECT':game.complete?'✓ FINAL':'⏳ À VENIR'}</span><span>{game.status} {game.clock&&game.state==='in'?'· '+game.clock:''}</span></div>
  <div className="studio-live-score"><strong>{game.away.abbr} <b>{game.away.score}</b></strong><span>VS</span><strong>{game.home.abbr} <b>{game.home.score}</b></strong></div>
  <div className="studio-live-pick"><span>{b.market.toUpperCase()}</span><h3>{b.selection}</h3>{actual?<p>{actual.value} {actual.label}{hasLine?' · Seuil '+line:''}</p>:b.market==='totals'?<p>{total} points combinés{hasLine?' · Ligne '+line:''}</p>:<p>Score ESPN actualisé · Statistique individuelle non confirmée pour cette sélection</p>}</div>
  {mlStatus&&<p style={{fontWeight:800,color:'#abf5e3',margin:'8px 0'}}>{mlStatus} · {pickedScore}–{otherScore}</p>}
  {progress!==null&&<div className="studio-live-progress"><div style={{width:progress+'%'}}/></div>}
  {locked&&<strong className="studio-live-alert">⚡ TON SEUIL EST DÉPASSÉ ! Vérifie les règles du marché avant de confirmer.</strong>}
  <small>ESPN · Mise à jour {new Date(feed.updatedAt).toLocaleTimeString('fr-CA',{timeZone:'America/Toronto',hour:'2-digit',minute:'2-digit'})}. Résultat du pari à confirmer manuellement.</small>
 </article>;
}
export default function LiveBetTracker({bets}:{bets:Bet[]}){
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
 if(!bets.length)return null;
 const matches=feed?.games?bets.filter(b=>feed.games.some(g=>match(b.game,g))):[];
 return <section className="studio-live"><div className="studio-live-head"><span>⚡ LIVE TRACKER · ESPN</span><h2>LES PARIS DES BOYS EN DIRECT</h2><p>Scores actualisés automatiquement aux 45 secondes. Progression des Props lorsque la statistique du joueur est disponible.</p></div>
 {alerts.length>0&&<div className="studio-live-alerts"><strong>🔔 LES NOUVELLES DU SCORE</strong>{alerts.map((alert,i)=><p key={i}>{alert}</p>)}</div>}
 {!feed?<p>On branche les tableaux de matchs…</p>:feed.status!=='ok'?<p>Les scores en direct sont momentanément indisponibles.</p>:matches.length===0?<p>Aucune de tes mises ouvertes ne correspond aux rencontres de la semaine suivie actuellement.</p>:<div className="studio-live-grid">{matches.map(b=><Ticket key={b.id} b={b} feed={feed}/>)}</div>}
 </section>;
}
