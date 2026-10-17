import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{abbr:string}>}){
 const {abbr}=await params;const code=abbr.toLowerCase();
 if(!/^[a-z]{2,3}$/.test(code))return NextResponse.json({error:'Équipe invalide'},{status:400});
 const base='https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/'+code;
 const get=async(path:string)=>{try{const r=await fetch(base+path,{next:{revalidate:900}});return r.ok?await r.json():null}catch{return null}};
 const [schedule,injury]=await Promise.all([get('/schedule?season=2027'),get('/injuries')]);
 const events=(schedule?.events||[]).map((e:any)=>{const competitors=e.competitions?.[0]?.competitors||[];
 const team=(side:string)=>{const c=competitors.find((x:any)=>x.homeAway===side);return {abbr:c?.team?.abbreviation||'',name:c?.team?.displayName||'',score:c?.score?.displayValue??c?.score??null}};
 return {id:e.id,date:e.date,statusText:e.status?.type?.description||'',completed:!!e.status?.type?.completed,home:team('home'),away:team('away')};
 }).filter((e:any)=>e.home.abbr||e.away.abbr);
 const injuries=Array.isArray(injury?.injuries)?injury.injuries:Array.isArray(injury?.items)?injury.items:[];
 return NextResponse.json({events,injuries,injuriesAvailable:!!injury,scheduleAvailable:!!schedule,source:'ESPN'});
}