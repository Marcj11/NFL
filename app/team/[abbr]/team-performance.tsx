'use client';
type Game={game_id:string;kickoff_utc:string;home_team_id:string;away_team_id:string;home_score:number;away_score:number;result:string;diff:number};
export default function TeamPerformance({recent,team,opponent,name,color,probability}:{recent:Game[];team:string;opponent:string|null;name:string;color:string;probability:number|null}){
 if(!recent.length)return <section className="team-form-panel"><h2>⚡ LES CHIFFRES DES BOYS</h2><p>Aucun résultat complet disponible pour calculer la forme récente.</p></section>;
 const points=recent.map(g=>({date:new Date(g.kickoff_utc).toLocaleDateString('fr-CA',{month:'short',day:'numeric',timeZone:'America/Toronto'}),for:g.home_team_id===team?g.home_score:g.away_score,against:g.home_team_id===team?g.away_score:g.home_score,result:g.result}));
 const avg=(key:'for'|'against')=>points.reduce((s,g)=>s+g[key],0)/points.length;
 const max=Math.max(35,...points.flatMap(g=>[g.for,g.against]));
 const chance=probability!==null&&Number.isFinite(probability)&&probability>=0&&probability<=1?probability:null;
 return <section className="team-form-panel" style={{'--team-primary':color} as React.CSSProperties}>
  <div className="team-form-header"><div><span>✦ NFL STUDIO · STATS CONFIRMÉES</span><h2>LE MOMENT DE VÉRITÉ</h2><p>Les points marqués et encaissés par {name} à leurs {points.length} derniers matchs enregistrés.</p></div><div className="team-form-kpis"><div><small>POINTS MARQUÉS / GAME</small><strong>{avg('for').toFixed(1)}</strong></div><div><small>POINTS ACCORDÉS / GAME</small><strong>{avg('against').toFixed(1)}</strong></div></div></div>
  <div className="team-form-chart">{points.slice().reverse().map((g,i)=><div key={i} className="team-form-column"><div className="team-form-bars"><div style={{height:(g.for/max*100)+'%'}} title={g.for+' points marqués'}><b>{g.for}</b></div><div className="allowed" style={{height:(g.against/max*100)+'%'}} title={g.against+' points accordés'}><b>{g.against}</b></div></div><span className={'team-form-result '+(g.result==='W'?'win':g.result==='L'?'loss':'draw')}>{g.result==='W'?'V':g.result==='L'?'D':'N'}</span><small>{g.date}</small></div>)}</div>
  <div className="team-form-legend"><span><i/> Points marqués</span><span><i/> Points accordés</span></div>
  {chance!==null&&<div className="team-form-prob"><div><span>⚡ PRÉVISION MONEYLINE · MODÈLE EXPÉRIMENTAL</span><strong>{name} : {(chance*100).toFixed(1)} %</strong></div><div className="team-form-probbar"><div style={{width:(chance*100)+'%'}}/></div><small>Prochain adversaire : {opponent||'À confirmer'}. Estimation historique non calibrée, pas une cote de bookmaker.</small></div>}
 </section>;
}
