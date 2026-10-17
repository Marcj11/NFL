import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Obj=Record<string,any>;
const key=(v:unknown)=>String(v||'').toLowerCase();
export async function GET(_req:Request,{params}:{params:Promise<{abbr:string}>}){
 const {abbr}=await params;const code=abbr.toLowerCase();
 if(!/^[a-z]{2,3}$/.test(code))return NextResponse.json({error:'Équipe invalide'},{status:400});
 const root='https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';
 const get=async(path:string):Promise<Obj|null>=>{try{const r=await fetch(root+path,{next:{revalidate:600},signal:AbortSignal.timeout(9000)});return r.ok?await r.json():null}catch{return null}};
 const [schedule,globalInjuries,teamInfo]=await Promise.all([get('/teams/'+code+'/schedule?season=2027'),get('/injuries'),get('/teams/'+code)]);
 const events=(schedule?.events||[]).map((e:Obj)=>{const c=e.competitions?.[0]?.competitors||[];const side=(x:string)=>{const a=c.find((v:Obj)=>v.homeAway===x);return {abbr:a?.team?.abbreviation||'',name:a?.team?.displayName||'',score:a?.score?.displayValue??a?.score??null}};return {id:e.id,date:e.date,statusText:e.status?.type?.description||'',completed:!!e.status?.type?.completed,home:side('home'),away:side('away')}}).filter((e:Obj)=>e.home.abbr||e.away.abbr);
 const teamId=String(teamInfo?.team?.id||'');
 const aliases=new Set([code,key(teamInfo?.team?.abbreviation),key(teamInfo?.team?.displayName),teamId]);
 const groups=Array.isArray(globalInjuries?.injuries)?globalInjuries.injuries:Array.isArray(globalInjuries?.items)?globalInjuries.items:[];
 const injuries:Obj[]=[];
 for(const group of groups){const team=group?.team||group;const values=[team?.id,team?.abbreviation,team?.displayName,group?.teamId].map(key);if(!values.some(v=>v&&aliases.has(v)))continue;const items=group?.injuries||group?.items||(group?.athlete?[group]:[]);if(Array.isArray(items))injuries.push(...items)}
 return NextResponse.json({events,injuries,injuriesAvailable:globalInjuries!==null,injuriesSource:globalInjuries?'ESPN league-wide injuries':'unavailable',scheduleAvailable:schedule!==null,source:'ESPN',teamId});
}
