import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Outcome={name:string;price:number;point?:number};
type Market={key:string;outcomes:Outcome[]};
type Book={title:string;markets:Market[]};
type Event={id:string;commence_time:string;home_team:string;away_team:string;bookmakers:Book[]};
const decimal=(n:number)=>n>0?1+n/100:1+100/Math.abs(n);
export async function GET(){
 const key=process.env.THE_ODDS_API_KEY;
 if(!key)return NextResponse.json({status:'not_configured',games:[],message:'Clé des cotes non configurée'});
 try{
  const url='https://api.the-odds-api.com/v4/sports/icehockey_nhl/odds/?'+new URLSearchParams({apiKey:key,regions:'us',markets:'h2h,spreads,totals',oddsFormat:'decimal',dateFormat:'iso'});
  const response=await fetch(url,{next:{revalidate:3600},signal:AbortSignal.timeout(12000)});
  if(!response.ok)return NextResponse.json({status:'provider_error',games:[],error:'Fournisseur HTTP '+response.status},{status:502});
  const data=await response.json() as Event[];
  if(!Array.isArray(data))throw Error('Réponse inattendue');
  const games=data.map(e=>({id:e.id,date:e.commence_time,home:e.home_team,away:e.away_team,markets:['h2h','spreads','totals'].flatMap(key=>{
   const rows=e.bookmakers.flatMap(b=>(b.markets||[]).filter(m=>m.key===key).flatMap(m=>m.outcomes.map(o=>({book:b.title,selection:o.name,line:o.point??null,odds:Math.round(Number(o.price)*100)/100}))));
   return rows.filter(x=>Number.isFinite(x.odds)&&x.odds>1).map(x=>({...x,market:key}));
  })}));
  return NextResponse.json({status:games.length?'available':'no_games',provider:'The Odds API',oddsFormat:'decimal',probabilityModel:'unavailable',games},{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=300'}});
 }catch(e){return NextResponse.json({status:'provider_error',games:[],error:String(e)},{status:502})}
}
