// Isolated reconstruction, NOT approved Model C or a reproduction of the 68.73% backtest.
export type Fixture={id:string;home:string;away:string;homeScore:number;awayScore:number;date:string};
export const eloProbability=(home:number,away:number,advantage=55)=>{if(![home,away,advantage].every(Number.isFinite))throw Error('invalid rating');return 1/(1+10**((away-home-advantage)/400));};
export function replayElo(fixtures:Fixture[],k=24,homeAdvantage=55){
 if(!Number.isFinite(k)||k<=0||!Number.isFinite(homeAdvantage))throw Error('invalid parameters');
 const ratings=new Map<string,number>(),predictions: {id:string;probability:number;winner:number}[]=[];
 const used=new Set<string>();
 for(const f of [...fixtures].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){
  if(!f.id||used.has(f.id)||!f.home||!f.away||f.home===f.away||![f.homeScore,f.awayScore].every(Number.isFinite)||!Number.isFinite(Date.parse(f.date)))throw Error('invalid game');
  used.add(f.id);
  const rh=ratings.get(f.home)??1500,ra=ratings.get(f.away)??1500,p=eloProbability(rh,ra,homeAdvantage);
  const outcome=f.homeScore===f.awayScore?.5:f.homeScore>f.awayScore?1:0;
  predictions.push({id:f.id,probability:p,winner:outcome});
  const delta=k*(outcome-p);
  ratings.set(f.home,rh+delta);ratings.set(f.away,ra-delta);
 }
 return {predictions,ratings,calibrated:false,modelC:false};
}
