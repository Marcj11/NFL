const base=process.env.URL; if(!base)throw Error("missing URL");
let fails=0;
for(const path of ["/","/api/elo?week=6"]){
 try{
  const r=await fetch(base+path,{signal:AbortSignal.timeout(25000)});
  const payload=path.startsWith("/api/elo")?await r.json():null;
  const good=r.ok&&(!payload||(payload.engine==="Elo"&&Array.isArray(payload.games)&&payload.games.length===14&&payload.games.every(g=>Number.isFinite(g.home_win_probability)&&Math.abs(g.home_win_probability+g.away_win_probability-1)<1e-8)));
  console.log(JSON.stringify({path,status:r.status,pass:good,games:payload?.games?.length,error:payload?.error}));
  if(!good)fails++;
 }catch(e){console.log(path,String(e));fails++;}
}
process.exitCode=fails?1:0;