import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const date=request.nextUrl.searchParams.get("date")||new Date().toISOString().slice(0,10);
 if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))return NextResponse.json({error:"Invalid date"},{status:400});
 try{
  const response=await fetch("https://api-web.nhle.com/v1/score/"+date,{next:{revalidate:120}});
  if(!response.ok)throw Error("NHL API "+response.status);
  const data=await response.json();
  const games=(data.games||[]).map((g:any)=>({
   id:g.id,date:g.startTimeUTC||g.gameDate,state:g.gameState,
   home:{abbr:g.homeTeam?.abbrev||"",name:g.homeTeam?.placeName?.default||g.homeTeam?.abbrev||"",score:g.homeTeam?.score},
   away:{abbr:g.awayTeam?.abbrev||"",name:g.awayTeam?.placeName?.default||g.awayTeam?.abbrev||"",score:g.awayTeam?.score}
  }));
  return NextResponse.json({date,games,source:"NHL API"});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Schedule unavailable"},{status:502})}
}