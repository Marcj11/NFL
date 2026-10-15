import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_ROLE_KEY||'',Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'});
async function walletId(secret:string){const data=new TextEncoder().encode(secret);const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function POST(req:Request){
 try{
 const body=await req.json(),secret=String(body.secret||'');
 if(!/^[a-f0-9]{48,128}$/.test(secret))return NextResponse.json({error:'invalid_code'},{status:400});
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'database_unavailable'},{status:503});
 const id=await walletId(secret),base=process.env.SUPABASE_URL+'/rest/v1/nfl_studio_wallets';
 if(body.action==='read'){
  const r=await fetch(base+'?wallet_id=eq.'+id+'&select=bets,updated_at,starting_balance',{headers:headers(),cache:'no-store'});
  if(!r.ok)throw Error('wallet_read');
  const rows=await r.json();return NextResponse.json({bets:rows[0]?.bets||[],updatedAt:rows[0]?.updated_at||null,startingBalance:Number(rows[0]?.starting_balance||0)});
 }
 if(body.action==='save'){
  const bets=body.bets;
  if(!Array.isArray(bets)||bets.length>500||JSON.stringify(bets).length>150000)return NextResponse.json({error:'invalid_bets'},{status:400});
  const startingBalance=Number(body.startingBalance||0);if(!Number.isFinite(startingBalance)||startingBalance<0||startingBalance>100000000)return NextResponse.json({error:'invalid_balance'},{status:400});
  const r=await fetch(base+'?on_conflict=wallet_id',{method:'POST',headers:{...headers(),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({wallet_id:id,bets,starting_balance:startingBalance,updated_at:new Date().toISOString()})});
  if(!r.ok)throw Error('wallet_write');return NextResponse.json({ok:true});
 }
 return NextResponse.json({error:'invalid_action'},{status:400});
 }catch{return NextResponse.json({error:'sync_failed'},{status:503})}
}
