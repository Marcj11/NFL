import {ENGINE_C_VERSION} from './universal-v5';
export {ENGINE_C_VERSION};
export type MarketFamily='h2h'|'spreads'|'totals'|'player_pass_yds'|'player_rush_yds'|'player_reception_yds'|'defense'|'kicker'|'special_teams';
export function classify(m:string):MarketFamily{
 if(/sacks|tackles|interceptions|qb_hits|pass_defended|forced_fumbles/.test(m))return 'defense';
 if(/field_goal|extra_point|kicking_points|pats|kicker/.test(m))return 'kicker';
 if(m==='player_pass_yds'||m==='player_rush_yds'||m==='player_reception_yds')return m;
 return 'special_teams';
}
export function engineCProbability(baseline:number,market:MarketFamily,delta=0):number|null{
 if(!Number.isFinite(baseline)||baseline<=0||baseline>=1)return null;
 const d=Math.max(-3,Math.min(3,delta));
 const scale=market==='h2h'||market==='spreads'?.12:market==='totals'?.085:.065;
 const logit=Math.log(baseline/(1-baseline));
 return Math.max(.01,Math.min(.99,1/(1+Math.exp(-(logit+d*scale)))));
}
