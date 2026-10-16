import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type ESPNArticle={id?:string|number;headline?:string;description?:string;published?:string;links?:{web?:{href?:string}};images?:Array<{url?:string}>};
const excerpt=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,15).join(' ');
export async function GET(){
 try{
  const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=12',{next:{revalidate:900},signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('espn_'+r.status);
  const body=await r.json() as {articles?:ESPNArticle[]};
  const articles=(body.articles||[]).flatMap(a=>{
   const href=a.links?.web?.href||'';
   let url:URL;try{url=new URL(href)}catch{return []}
   if(url.protocol!=='https:'||!(url.hostname==='espn.com'||url.hostname.endsWith('.espn.com')))return [];
   if(!a.headline||!a.published||!Number.isFinite(Date.parse(a.published)))return [];
   if(Date.parse(a.published)>Date.now()+3600000)return [];
   const image=a.images?.find(i=>typeof i.url==='string'&&i.url.startsWith('https://'))?.url||null;
   return [{id:String(a.id||href),headline:a.headline,excerpt:excerpt(a.description||''),url:href,published:a.published,source:'ESPN',image}];
  }).slice(0,8);
  return NextResponse.json({status:'ok',articles},{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=1800'}});
 }catch{return NextResponse.json({status:'unavailable',articles:[]},{headers:{'Cache-Control':'public, s-maxage=120'}})}
}
