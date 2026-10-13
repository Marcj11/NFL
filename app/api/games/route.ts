import {NextResponse} from 'next/server';
export const revalidate=300;
type Team={abbreviation?:string;displayName?:string;logo?:string};
type Competitor={homeAway?:string;team?:Team;score?:string};
type Event={id?:string;date?:string;competitions?:Array<{competitors?:Competitor[]}>;status?:{type?:{name?:string;description?:string;completed?:boolean}}};
export async function GET(request:Request){
 const week=Number(new URL(request.url).searchParams.get('week')||6);
 if(!Number.isInteger(week)||week<1||week>18)return NextResponse.json({error:'Semaine invalide'},{status:400});
 const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week='+week+'&limit=25';
 try{
 const res=await fetch(url,{next:{revalidate:300}});
 if(!res.ok)throw new Error('ESPN HTTP '+res.status);
 const data=await res.json();
 const games=((data.events||[]) as Event[]).map(event=>{
 const competitors=event.competitions?.[0]?.competitors||[];
 const home=competitors.find(t=>t.homeAway==='home'),away=competitors.find(t=>t.homeAway==='away');
 if(!home?.team||!away?.team)return null;
 const team=(t:Competitor)=>({name:t.team?.displayName||'',abbr:t.team?.abbreviation||'',logo:t.team?.logo||'',score:t.score??null});
 return {id:event.id,date:event.date,status:event.status?.type?.name||'',statusText:event.status?.type?.description||'',completed:event.status?.type?.completed||false,home:team(home),away:team(away)};
 }).filter(Boolean);
 return NextResponse.json({season:2026,week,source:'ESPN',updatedAt:new Date().toISOString(),games});
 }catch(e){return NextResponse.json({error:'Calendrier temporairement indisponible',details:e instanceof Error?e.message:'Erreur',games:[]},{status:502});}
}
