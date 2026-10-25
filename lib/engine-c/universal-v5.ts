/** Shared calculation contract for HEAVYBALLS engine C V5.
 * Experimental until prospectively validated by market. No odds-derived probability forecasts.
 */
export const ENGINE_C_VERSION='engine-c-universal-v5' as const;
export type Market='h2h'|'spreads'|'totals'|'player_pass_yds'|'player_rush_yds'|'player_reception_yds'|'defense'|'kicker'|'special_teams';
export type InjuryInput={source:'ESPN';observed_at:string;kickoff_utc:string;teams_covered:number;official_inactives_verified:boolean;calibrated_market_impacts?:Partial<Record<Market,number>>};
export type Result={model_version:typeof ENGINE_C_VERSION;market:Market;probability:number|null;estimated_ev:number|null;status:'experimental_unvalidated'|'unavailable';reason:string};
const clamp=(x:number)=>Math.max(0.01,Math.min(0.99,x));
const logistic=(z:number)=>1/(1+Math.exp(-z));
export function evaluateEngineC(input:{market:Market;signal?:number;odds:number;history?:number[];line?:number;side?:'over'|'under';injuries?:InjuryInput;}):Result{
 const {market,signal,odds,history,line,side,injuries}=input;
 const unavailable=(reason:string):Result=>({model_version:ENGINE_C_VERSION,market,probability:null,estimated_ev:null,status:'unavailable',reason});
 if(!Number.isFinite(odds)||odds<=1)return unavailable('missing_valid_bookmaker_odds');
 if(!injuries||injuries.source!=='ESPN'||injuries.teams_covered!==2)return unavailable('injury_coverage_missing');
 const seen=Date.parse(injuries.observed_at),kickoff=Date.parse(injuries.kickoff_utc);
 if(!Number.isFinite(seen)||!Number.isFinite(kickoff)||seen>=kickoff)return unavailable('injury_snapshot_not_pregame');
 if(!injuries.official_inactives_verified)return unavailable('official_inactives_unverified');
 const impact=injuries.calibrated_market_impacts?.[market];
 if(typeof impact!=='number'||!Number.isFinite(impact))return unavailable('injury_impact_not_calibrated_for_market');
 let p:number|null=null;
 if(market==='h2h'||market==='spreads'||market==='totals'){
  if(!Number.isFinite(signal))return unavailable('insufficient_pregame_team_data');
  const scale=market==='totals'?17.5:13.5;
  p=clamp(logistic((market==='h2h'?0.75:1.702)*(Number(signal)+impact)/scale));
 }else if(['player_pass_yds','player_rush_yds','player_reception_yds'].includes(market)){
  if(!history||history.length<5||history.some(v=>!Number.isFinite(v))||!Number.isFinite(line)||!side)return unavailable('insufficient_verified_player_history');
  const hits=history.filter(v=>side==='over'?v>Number(line):v<Number(line)).length;
  p=clamp((hits+2)/(history.length+4)+impact);
 }else return unavailable('market_not_calibrated');
 return {model_version:ENGINE_C_VERSION,market,probability:p,estimated_ev:p*odds-1,status:'experimental_unvalidated',reason:'unvalidated_historical_baseline'};
}
