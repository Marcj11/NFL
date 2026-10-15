import {NextResponse} from 'next/server';
import {espnTeamId} from '../../../lib/expert-nfl/espn-team-ids';
export const dynamic='force-dynamic';
type R=Record<string,unknown>;
const record=(x:unknown):R|null=>x&&typeof x==='object'&&!Array.isArray(x)?x as R:null;
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function locate(node:unknown,needle:string,depth=0):{url:string;team:string}|null{
 if(depth>8||!node)return null;
 if(Array.isArray(node)){for(const v of node){const got=locate(v,needle,depth+1);if(got)return got}return null}
 const obj=record(node);if(!obj)return null;
 const name=String(obj.displayName||obj.fullName||obj.name||'');
 const headshot=record(obj.headshot);
 const href=String(headshot?.href||'');
 if(clean(name)===needle&&/^https:\/\//.test(href)&&/(espncdn\.com|espn\.com)/.test(new URL(href).hostname))return {url:href,team:String(obj.team||'')};
 for(const [k,v] of Object.entries(obj)){if(['statistics','stats','links','events','notes'].includes(k))continue;if(v&&typeof v==='object'){const got=locate(v,needle,depth+1);if(got)return got}}
 return null;
}
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,player=p.get('player')||'',home=p.get('home')||'',away=p.get('away')||'';
 if(!player||player.length>90||!espnTeamId(home)||!espnTeamId(away))return NextResponse.json({found:false,reason:'invalid_query'},{status:400});
 const target=clean(player);
 const teams=[home,away];
 const attempts=await Promise.all(teams.map(async team=>{
  try{const id=espnTeamId(team)!;
   const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/roster';
   const response=await fetch(url,{next:{revalidate:21600},signal:AbortSignal.timeout(5500)});
   if(!response.ok)return null;
   const found=locate(await response.json(),target);
   return found?{url:found.url,team}:null;
  }catch{return null}
 }));
 const best=attempts.find(Boolean);
 return NextResponse.json(best?{found:true,...best,source:'ESPN team roster'}:{found:false,reason:'no_verified_headshot'}, {headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=21600'}});
}