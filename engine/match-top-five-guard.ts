export type MatchTopPick={market:string;player?:string;team_id?:string;probability:number;decimal:number;expected_value:number};
export function guardMatchTop5<T extends MatchTopPick>(ranked:T[],teams:string[]):(T&{heavyball:boolean})[]{
 const validTeams=new Set(teams.map(t=>t.toUpperCase())),seen=new Set<string>(),out:(T&{heavyball:boolean})[]=[];
 for(const p of ranked){
  if(!(p.expected_value>0&&p.probability>0&&p.probability<1&&p.decimal>1))continue;
  const prop=p.market.startsWith('player_');
  if(prop&&(!p.team_id||!validTeams.has(p.team_id.toUpperCase())||!p.player))continue;
  const key=prop?'player:'+p.player!.toLowerCase():p.market;
  if(seen.has(key))continue;
  seen.add(key);out.push({...p,heavyball:p.decimal>=3});
  if(out.length===5)break;
 }
 return out;
}
