import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
const base="https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";
const scalar=(x:any):string|null=>x==null?null:typeof x==="string"||typeof x==="number"?String(x):typeof x==="object"?scalar(x.displayValue??x.value??null):null;
export async function GET(req:NextRequest){
 const kind=req.nextUrl.searchParams.get("kind")||"scoreboard";
 const day=req.nextUrl.searchParams.get("date")||new Date().toISOString().slice(0,10);
 const gameId=req.nextUrl.searchParams.get("gameId");
 if(!["scoreboard","news","summary"].includes(kind))return NextResponse.json({error:"Invalid ESPN resource"},{status:400});
 if(kind==="scoreboard"&&!/^\d{4}-\d{2}-\d{2}$/.test(day))return NextResponse.json({error:"Invalid date"},{status:400});
 if(kind==="summary"&&(!gameId||!/^\d{6,12}$/.test(gameId)))return NextResponse.json({error:"Invalid game ID"},{status:400});
 const endpoint=kind==="news"?base+"/news?limit=14":kind==="summary"?base+"/summary?event="+gameId:base+"/scoreboard?dates="+day.replace(/-/g,"");
 try{
 const response=await fetch(endpoint,{next:{revalidate:kind==="news"?600:kind==="summary"?20:30},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error("ESPN status "+response.status);
 const data=await response.json();
 if(kind==="news"){
 const articles=(data.articles||[]).slice(0,14).map((a:any)=>({id:String(a.id||a.headline||""),title:String(a.headline||""),description:String(a.story||a.description||"").replace(/<[^>]*>/g,"").slice(0,350),published:a.published||a.lastModified||null,url:a.links?.web?.href||a.link||null,image:a.images?.[0]?.url||null})).filter((a:any)=>a.title&&a.url);
 return NextResponse.json({source:"ESPN",articles});
 }
 if(kind==="summary"){
 const box=data.boxscore?.players||[];
 const players=box.flatMap((team:any)=> (team.statistics||[]).flatMap((stat:any)=>(stat.athletes||[]).map((a:any)=>({id:a.athlete?.id,name:a.athlete?.displayName,team:team.team?.abbreviation,labels:stat.labels||[],stats:a.stats||[]}))));
 return NextResponse.json({source:"ESPN",gameId,players,header:data.header?.competitions?.[0]?.status||null,updatedAt:new Date().toISOString()});
 }
 const games=(data.events||[]).map((e:any)=>{
 const comp=e.competitions?.[0];const home=comp?.competitors?.find((t:any)=>t.homeAway==="home");const away=comp?.competitors?.find((t:any)=>t.homeAway==="away");
 const team=(t:any)=>({name:scalar(t?.team?.displayName)||"",abbr:t?.team?.abbreviation||"",logo:t?.team?.logo||null,score:scalar(t?.score)});
 return {id:String(e.id),date:e.date,status:e.status?.type?.name||"",statusText:scalar(e.status?.type?.shortDetail)||"",period:e.status?.period||0,clock:e.status?.displayClock||"",home:team(home),away:team(away)};
 }).filter((g:any)=>g.home.abbr&&g.away.abbr);
 return NextResponse.json({source:"ESPN",updatedAt:new Date().toISOString(),games});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"ESPN unavailable"},{status:502})}
}
