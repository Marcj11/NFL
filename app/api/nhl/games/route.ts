import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type EspnEvent={id:string;date:string;status?:{type?:{description?:string;completed?:boolean;state?:string}};competitions?:Array<{competitors?:Array<{homeAway?:string;score?:string;team?:{displayName?:string;abbreviation?:string;logo?:string}}>}>};
export async function GET(request:Request){
 const date=new URL(request.url).searchParams.get('date')||new Date().toISOString().slice(0,10);
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return NextResponse.json({error:'Date invalide'},{status:400});
 const dateKey=date.replaceAll('-','');
 try{
  const res=await fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates='+dateKey,{next:{revalidate:120}});
  if(!res.ok)throw new Error('ESPN HTTP '+res.status);
  const raw=await res.json();
  const games=((raw.events||[]) as EspnEvent[]).map(e=>{
   const competitors=e.competitions?.[0]?.competitors||[];
   const t=(side:string)=>{const c=competitors.find(x=>x.homeAway===side);return {name:c?.team?.displayName||'Équipe inconnue',abbr:c?.team?.abbreviation||'',logo:c?.team?.logo||'',score:c?.score??null}};
   return {id:e.id,date:e.date,status:e.status?.type?.state||'',statusText:e.status?.type?.description||'',completed:!!e.status?.type?.completed,away:t('away'),home:t('home')};
  });
  return NextResponse.json({date,games,source:'ESPN'},{headers:{'Cache-Control':'public, s-maxage=120, stale-while-revalidate=60'}});
 }catch(e){return NextResponse.json({error:'Calendrier NHL temporairement indisponible',detail:String(e)},{status:502})}
}
