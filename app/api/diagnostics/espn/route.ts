import {NextResponse} from 'next/server';
export const revalidate=300;
const SCOREBOARD='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=5&limit=25';
const BASELINE={home:34,away:37,players:[{name:'Josh Allen',category:'passing',label:'YDS',expected:'210'},{name:'Josh Allen',category:'rushing',label:'YDS',expected:'121'},{name:'Khalil Shakir',category:'receiving',label:'YDS',expected:'80'},{name:'Puka Nacua',category:'receiving',label:'YDS',expected:'138'}]};
export async function GET(){
 try{
  const start=Date.now();
  const res=await fetch(SCOREBOARD,{next:{revalidate:300},signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw new Error('ESPN HTTP '+res.status);
  const scoreboard=await res.json();
  const match=(scoreboard.events||[]).find((e:any)=>{const names=(e.competitions?.[0]?.competitors||[]).map((c:any)=>c.team?.abbreviation);return names.includes('BUF')&&(names.includes('LAR')||names.includes('LA'))});
  if(!match)return NextResponse.json({ok:false,reason:'Bills–Rams absent du tableau ESPN semaine 5',fetchedAt:new Date().toISOString(),events:(scoreboard.events||[]).length});
  const scores=Object.fromEntries((match.competitions?.[0]?.competitors||[]).map((c:any)=>[c.team?.abbreviation,c.score]));
  const scoreMatch=Number(scores.BUF)===BASELINE.away&&Number(scores.LAR??scores.LA)===BASELINE.home;
  const gameId=match.id;
  const summaryRes=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event='+encodeURIComponent(gameId),{next:{revalidate:300},signal:AbortSignal.timeout(10000)});
  let stats:any[]=[];let summaryError=null;
  if(summaryRes.ok){
   const summary=await summaryRes.json();
   for(const team of summary.boxscore?.players||[]){
    for(const block of team.statistics||[]){
     const labels=block.labels||[];
     for(const athlete of block.athletes||[]){
      const name=athlete.athlete?.displayName;
      if(!name)continue;
      stats.push({name,category:block.name,values:Object.fromEntries(labels.map((label:string,i:number)=>[label,athlete.stats?.[i]??null]))});
     }
    }
   }
  }else summaryError='ESPN summary HTTP '+summaryRes.status;
  const comparisons=BASELINE.players.map(p=>{const stat=stats.find(s=>s.name===p.name&&s.category===p.category);const observed=stat?.values?.[p.label]??null;return {...p,observed,match:observed===null?null:String(observed)===p.expected}});
  return NextResponse.json({ok:scoreMatch&&comparisons.every(c=>c.match===true),source:'ESPN (point d’acces non officiel)',reference:'Buffalo Bills officiel / Pro Football Reference',gameId,fetchedAt:new Date().toISOString(),fetchDurationMs:Date.now()-start,score:{observed:scores,expected:{BUF:37,LAR:34},match:scoreMatch},comparisons,summaryError,liveLatencyValidated:false,note:'Le temps de telechargement ne mesure pas le retard des mises a jour ESPN.'});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:'ESPN indisponible',fetchedAt:new Date().toISOString()},{status:502})}
}
