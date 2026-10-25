/** Provisional injury sensitivity estimates, NOT calibrated or approved for picks. */
export type InjuryPlayer={team:'home'|'away';position:string;status:string;snapShare:number;productionShare:number;replacementQuality:number};
export const markets=['h2h','spreads','totals','player_pass_yds','player_rush_yds','player_reception_yds','defense','kicker','special_teams'] as const;
export type Market=typeof markets[number];
export type InjuryScenario={game_id:string;observed_at:string;kickoff_utc:string;players:InjuryPlayer[]};
const roles:Record<string,number>={QB:3.5,WR:.9,RB:.75,TE:.65,OL:.7,LT:1.05,RT:.75,CB:.75,S:.6,EDGE:.95,DE:.8,DT:.55,LB:.65,K:.3,P:.2};
const availability:Record<string,number>={out:1,'injured reserve':1,doubtful:.75,questionable:.35,active:0};
const emphasis:Record<Market,string[]>={h2h:['QB','OL','WR','EDGE','CB'],spreads:['QB','OL','WR','EDGE','CB'],totals:['QB','WR','RB','OL','CB'],player_pass_yds:['QB','WR','OL','CB'],player_rush_yds:['RB','OL','DT','LB'],player_reception_yds:['WR','TE','QB','CB'],defense:['EDGE','DE','DT','LB','CB'],kicker:['K','QB','OL'],special_teams:['K','P','LB','S']};
export function provisionalInjuryEffects(s:InjuryScenario){
 const result=Object.fromEntries(markets.map(x=>[x,0])) as Record<Market,number>;
 const asof=Date.parse(s.observed_at),kickoff=Date.parse(s.kickoff_utc);
 if(!s.game_id||!Number.isFinite(asof)||!Number.isFinite(kickoff)||asof>=kickoff)return {status:'unavailable',effects:result,reason:'no_pregame_snapshot'} as const;
 for(const p of s.players){
  const pos=p.position.toUpperCase(),status=p.status.toLowerCase();
  if(!(status in availability)||![p.snapShare,p.productionShare,p.replacementQuality].every(x=>Number.isFinite(x)&&x>=0&&x<=1))return {status:'unavailable',effects:result,reason:'invalid_player_inputs'} as const;
  const severity=availability[status],importance=(p.snapShare+p.productionShare)/2,gap=1-p.replacementQuality,sign=p.team==='home'?-1:1;
  for(const market of markets)if(emphasis[market].includes(pos))result[market]+=sign*severity*importance*gap*(roles[pos]??.25);
 }
 return {status:'provisional_uncalibrated',effects:result,reason:'heuristic_only_no_backtest_no_production_picks'} as const;
}
