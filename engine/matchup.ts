export type Unit={qb:number;ol:number;receivers:number;backs:number;passRush:number;coverage:number;runDefense:number;coachPassRate:number;coachTempo:number;coachAggression:number};
export type Team={name:string;unit:Unit;qbAvailable?:boolean;receiverAvailable?:boolean};
export type Context={windMph:number;rain:boolean;restHome:number;restAway:number;homeAdvantage:number};
export type Input={home:Team;away:Team;context:Context;simulations:number;seed:number};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
function rng(seed:number){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function poisson(mu:number,r:()=>number){let n=0,p=1;do{n++;p*=r()}while(p>Math.exp(-mu)&&n<100);return n-1;}
function play(a:Team,d:Team,c:Context,home:boolean,r:()=>number){
 const au=a.unit,du=d.unit,qb=clamp(au.qb-(a.qbAvailable===false?.23:0),0,1),wr=clamp(au.receivers-(a.receiverAvailable===false?.18:0),0,1),wind=clamp(c.windMph,0,60)/60;
 const passRate=clamp(.35+.31*(au.coachPassRate-.5)+.1*(qb-.5)-.08*wind-(c.rain?.03:0),.2,.77),n=clamp(poisson(61+11*(au.coachTempo-.5),r),38,88);
 let passY=0,rushY=0,receiverY=0,turnovers=0;
 for(let i=0;i<n;i++){
  if(r()<passRate){
   if(r()>clamp(.61+.36*(au.ol-du.passRush),.12,.94)){if(r()<.028)turnovers++;continue;}
   if(r()<clamp(.58+.27*(qb-.5)+.18*(wr-du.coverage)-.11*wind-(c.rain?.035:0),.24,.87)){
    const y=Math.max(0,Math.round(7+16*(wr-du.coverage)+9*(qb-.5)+(r()+r()+r()-1.5)*20));passY+=y;if(r()<clamp(.25+.27*(wr-.5),.1,.43))receiverY+=y;
   }else if(r()<.029)turnovers++;
  }else{rushY+=Math.max(-3,Math.round(4+7*(au.backs-du.runDefense)+5*(au.ol-.5)+(r()+r()-1)*8));if(r()<.008)turnovers++;}
 }
 const rest=home?c.restHome-c.restAway:c.restAway-c.restHome,adv=home?c.homeAdvantage:-c.homeAdvantage;
 const points=clamp(poisson(clamp(18+.047*(passY+rushY-300)+2*(au.coachAggression-.5)+.14*rest+adv-3.6*turnovers,1,54)/7,r)*7+(r()<.3?3:0),0,70);
 return {points,passY,rushY,receiverY};
}
export function simulate(i:Input){
 for(const u of [i.home.unit,i.away.unit])for(const v of Object.values(u))if(!Number.isFinite(v)||v<0||v>1)throw Error('unit must be 0..1');
 if(!Number.isInteger(i.simulations)||i.simulations<100||i.simulations>100000||!Number.isInteger(i.seed)||Object.values(i.context).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw Error('invalid input');
 const r=rng(i.seed),n=i.simulations;let hw=0,aw=0,tie=0,sw=0,sp=0,over=0,hScore=0,aScore=0,hPass=0,aPass=0,hRush=0,aRush=0,hReceiver=0,aReceiver=0;
 for(let k=0;k<n;k++){
  const h=play(i.home,i.away,i.context,true,r),a=play(i.away,i.home,i.context,false,r),margin=h.points-a.points;
  if(margin>0)hw++;else if(margin<0)aw++;else tie++;
  if(margin>3)sw++;else if(margin===3)sp++;
  if(h.points+a.points>44.5)over++;
  hScore+=h.points;aScore+=a.points;hPass+=h.passY;aPass+=a.passY;hRush+=h.rushY;aRush+=a.rushY;hReceiver+=h.receiverY;aReceiver+=a.receiverY;
 }
 return {engine:'prototype-v0.1',calibrated:false,simulations:n,homeWin:hw/n,awayWin:aw/n,tie:tie/n,spreadHomeMinus3:{win:sw/n,push:sp/n,lose:(n-sw-sp)/n},totalOver44_5:over/n,meanScore:{home:hScore/n,away:aScore/n},meanStats:{homePassYards:hPass/n,awayPassYards:aPass/n,homeRushYards:hRush/n,awayRushYards:aRush/n,homeReceiverYards:hReceiver/n,awayReceiverYards:aReceiver/n},scenarioNote:'Coefficients illustratifs non estimes sur donnees NFL; aucun conseil de mise.'};
}