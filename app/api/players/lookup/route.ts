import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const clean=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
export async function GET(req:Request){
 const params=new URL(req.url).searchParams,name=params.get('name')||'';
 const teams=(params.get('teams')||'').split(',').map(x=>x.toLowerCase()==='la'?'lar':x.toLowerCase()==='was'?'wsh':x.toLowerCase()).filter(x=>/^[a-z]{2,3}$/.test(x)).slice(0,2);
 if(name.length<3||name.length>90)return NextResponse.json({error:'invalid_name'},{status:400});
 try{
  for(const team of teams){
   const res=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+team+'/roster',{next:{revalidate:900},signal:AbortSignal.timeout(8000)});
   if(!res.ok)continue;
   const data=await res.json(),players=(data.athletes||[]).flatMap((g:any)=>Array.isArray(g.items)?g.items:Array.isArray(g.athletes)?g.athletes:[g]);
   const found=players.find((p:any)=>clean(String(p.displayName||p.fullName||''))===clean(name));
   if(found?.id)return NextResponse.json({player:{id:String(found.id),name:found.displayName||found.fullName,team,headshot:found.headshot?.href||null},source:'ESPN roster'});
  }
  return NextResponse.json({player:null,status:'not_found'});
 }catch{return NextResponse.json({player:null,status:'unavailable'})}
}
