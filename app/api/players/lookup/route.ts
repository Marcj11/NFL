import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const name=new URL(req.url).searchParams.get('name')||'';
 if(name.length<3||name.length>90)return NextResponse.json({error:'invalid_name'},{status:400});
 try{
  const r=await fetch('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes?limit=500&search='+encodeURIComponent(name),{next:{revalidate:1800},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('espn');
  const data=await r.json(),items=Array.isArray(data.items)?data.items:Array.isArray(data.athletes)?data.athletes:[];
  const n=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
  const player=items.find((x:any)=>n(x.displayName||x.fullName||'')===n(name));
  return NextResponse.json({player:player?{id:String(player.id),name:player.displayName||player.fullName,team:player.team?.abbreviation||'',position:player.position?.abbreviation||'',headshot:player.headshot?.href||null}:null});
 }catch{return NextResponse.json({player:null,status:'unavailable'})}
}
