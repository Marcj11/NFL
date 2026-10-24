import {NextResponse} from 'next/server';
export const revalidate=21600;
const code:Record<string,string>={LA:'lar',WAS:'wsh'};
export async function GET(req:Request){
 const q=new URL(req.url).searchParams;const team=(q.get('team')||'').toUpperCase();
 if(!/^[A-Z]{2,3}$/.test(team))return NextResponse.json({photos:{}},{status:400});
 try{
 const slug=code[team]||team.toLowerCase();
 const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+slug+'/roster',{next:{revalidate:21600},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('roster');
 const json=await r.json();
 const photos:Record<string,string>={};
 const add=(a:any)=>{const name=String(a.fullName||a.displayName||'').trim().toLowerCase();const link=a.headshot?.href;if(name&&typeof link==='string'&&link.startsWith('https://'))photos[name]=link;};
 if(Array.isArray(json.athletes))for(const group of json.athletes){if(Array.isArray(group.items))group.items.forEach(add);else add(group)}
 return NextResponse.json({photos,source:'ESPN team roster',verified:true},{headers:{'Cache-Control':'public, s-maxage=21600'}});
 }catch{return NextResponse.json({photos:{},source:'unavailable',verified:false})}
}
