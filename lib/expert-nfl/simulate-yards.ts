/** Research-only port of independent EXPERT NFL Player Props simulator.
 * Based on plugin expert-nfl-player-props v1.0.0; not calibrated for betting. */
export function simulateYards(values:number[],line:number,seed=42,n=5000){
 if(values.length<5||values.length>100||!Number.isFinite(line)||line<0||values.some(v=>!Number.isFinite(v)||v<0))throw Error('invalid_history');
 let state=seed>>>0;
 const uniform=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.max(1e-12,state/4294967296)};
 const normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
 const gamma=(shape:number):number=>{
  if(shape<1)return gamma(shape+1)*Math.pow(uniform(),1/shape);
  const d=shape-1/3,c=1/Math.sqrt(9*d);
  for(let i=0;i<500;i++){const x=normal(),v0=1+c*x;if(v0<=0)continue;const v=v0*v0*v0,u=uniform();if(u<1-0.0331*x*x*x*x||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v;}
  throw Error('sampling_failed');
 };
 const tail=values.slice(-12),weights=tail.map((_,i)=>Math.pow(.85,tail.length-1-i));
 const baseline=tail.reduce((s,v,i)=>s+v*weights[i],0)/weights.reduce((s,x)=>s+x,0);
 const avg=tail.reduce((s,v)=>s+v,0)/tail.length;
 const variance=tail.reduce((s,v)=>s+(v-avg)**2,0)/Math.max(1,tail.length-1);
 const sd=Math.max(Math.sqrt(baseline)*.8,baseline*.28,4,Math.sqrt(variance));
 const mu=Math.max(baseline,.00001),shape=Math.max(.1,Math.pow(mu/Math.max(sd,.1),2)),scale=mu/shape;
 let over=0,under=0;const samples:number[]=[];
 for(let i=0;i<n;i++){const v=gamma(shape)*scale;samples.push(v);if(v>line)over++;else if(v<line)under++;}
 samples.sort((a,b)=>a-b);const percentile=(p:number)=>samples[Math.floor((n-1)*p)];
 return {projection:baseline,median:percentile(.5),p10:percentile(.1),p90:percentile(.9),p_over:over/n,p_under:under/n,p_push:1-(over+under)/n,sample_games:tail.length,simulations:n,research_only:true,validated_betting_edge:false,decision:'PASSER' as const,explanation:'Simulation exploratoire fondee sur l historique du joueur. Blessures, statut actif, contexte adverse et calibration hors echantillon non confirmes.'};
}
