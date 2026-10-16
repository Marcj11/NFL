import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const sport="icehockey_nhl";
export async function GET(){
 const key=process.env.THE_ODDS_API_KEY;
 if(!key)return NextResponse.json({provider:"The Odds API",configured:false,status:"not_configured",games:[]});
 try{
  const params=new URLSearchParams({apiKey:key,regions:"us",markets:"h2h,spreads,totals",oddsFormat:"decimal",dateFormat:"iso"});
  const r=await fetch("https://api.the-odds-api.com/v4/sports/"+sport+"/odds?"+params,{next:{revalidate:21600},signal:AbortSignal.timeout(14000)});
  if(!r.ok)throw Error("Odds provider HTTP "+r.status);
  const data=await r.json();
  if(!Array.isArray(data))throw Error("Unexpected odds payload");
  const games=data.map((g:any)=>({id:String(g.id),date:g.commence_time,home:g.home_team,away:g.away_team,
   bookmakers:(g.bookmakers||[]).map((b:any)=>({name:b.title,key:b.key,markets:(b.markets||[]).map((m:any)=>({key:m.key,outcomes:(m.outcomes||[]).map((o:any)=>({name:o.name,price:o.price,point:o.point??null}))}))}))}));
  return NextResponse.json({provider:"The Odds API",configured:true,status:games.length?"available":"no_games",format:"decimal",refresh_hours:6,games});
 }catch(e){return NextResponse.json({provider:"The Odds API",configured:true,status:"unavailable",message:e instanceof Error?e.message:"Connection failed",games:[]},{status:502})}
}