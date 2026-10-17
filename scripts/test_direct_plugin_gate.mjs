#!/usr/bin/env node
// Isolated direct-plugin integration gate: no fallback to cached reports or substitutes.
// Run: node scripts/test_direct_plugin_gate.mjs
const engines=[
 {name:"EXPERT NFL Recherche 1.6.2",url:process.env.EXPERT_NFL_RESEARCH_API_URL,token:process.env.EXPERT_NFL_RESEARCH_API_TOKEN},
 {name:"EXPERT NFL Player Props 1.0.9",url:process.env.EXPERT_NFL_PLAYER_PROPS_API_URL,token:process.env.EXPERT_NFL_PLAYER_PROPS_API_TOKEN}
];
let success=true;
for(const engine of engines){
 if(!engine.url||!engine.token){console.log("FAIL",engine.name,"no independently authorized endpoint + credential");success=false;continue;}
 try{
  const parsed=new URL(engine.url);
  if(parsed.protocol!=="https:")throw Error("HTTPS required");
  const res=await fetch(parsed,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+engine.token},body:JSON.stringify({type:"capabilities",read_only:true}),signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error("HTTP "+res.status);
  const data=await res.json();
  if(!data || data.engine_version!==engine.name.split(" ").at(-1) || data.can_analyze_external_odds!==true || data.read_only!==true)throw Error("identity/capability attestation mismatch");
  console.log("PASS",engine.name,"identity and read-only capability handshake");
 }catch(e){console.log("FAIL",engine.name,String(e));success=false;}
}
console.log(success?"GO: both connections authenticated; still require same-odds result comparison":"NO_GO: do not integrate plugin chat");
process.exitCode=success?0:1;
