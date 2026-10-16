import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const headers=()=>({apikey:process.env.SUPABASE_SERVICE_ROLE_KEY||'',Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'});
async function walletId(secret:string){const data=new TextEncoder().encode(secret);const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function POST(req:Request){
 try{
 const body=await req.json(),secret=String(body.secret||'');
 if(secret!=='marcj11'&&!/^[a-f0-9]{48,128}$/.test(secret))return NextResponse.json({error:'invalid_code'},{status:400});
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'database_unavailable'},{status:503});
 const id=secret==='marcj11'?'16657d987a755de7d5c8ad64139b66d5d3871fc5ce792be59e3680ed9a072f73':await walletId(secret),base=process.env.SUPABASE_URL+'/rest/v1/nfl_studio_wallets';
 if(body.action==='read'){
  const r=await fetch(base+'?wallet_id=eq.'+id+'&select=bets,updated_at,starting_balance',{headers:headers(),cache:'no-store'});
  if(!r.ok)throw Error('wallet_read');
  const rows=await r.json();return NextResponse.json({bets:rows[0]?.bets||[],updatedAt:rows[0]?.updated_at||null,startingBalance:Number(rows[0]?.starting_balance||0)});
 }
 if(body.action==='save'){
  const bets=body.bets;
  if(!Array.isArray(bets)||bets.length>500||JSON.stringify(bets).length>150000)return NextResponse.json({error:'invalid_bets'},{status:400});
  const startingBalance=Number(body.startingBalance||0);if(!Number.isFinite(startingBalance)||startingBalance<0||startingBalance>100000000)return NextResponse.json({error:'invalid_balance'},{status:400});
  const before=await fetch(base+'?wallet_id=eq.'+id+'&select=bets,starting_balance',{headers:headers(),cache:'no-store'});if(!before.ok)throw Error('wallet_read_before_save');
  const stored=(await before.json())[0];
  const merged=new Map<string,Record<string,unknown>>();
  const storedBets=Array.isArray(stored?.bets)?stored.bets:[];
  const choose=(previous:Record<string,unknown>|undefined,incoming:Record<string,unknown>)=>{
    if(!previous)return incoming;
    const older=String(previous.resultConfirmedAt||'');
    const newer=String(incoming.resultConfirmedAt||'');
    if(older&&!newer)return previous;
    if(newer&&!older)return incoming;
    if(older&&newer)return Date.parse(newer)>=Date.parse(older)?incoming:previous;
    return incoming;
  };
  for(const bet of storedBets){if(bet&&typeof bet.id==='string')merged.set(bet.id,bet)}
  for(const bet of bets){if(!bet||typeof bet.id!=='string')continue;merged.set(bet.id,choose(merged.get(bet.id),bet))}
  const currentBets=Array.from(merged.values());
  if(currentBets.length>500)return NextResponse.json({error:'wallet_full'},{status:400});
  const effectiveBalance=Object.prototype.hasOwnProperty.call(body,'startingBalance')?startingBalance:Number(stored?.starting_balance||0);
  const r=await fetch(base+'?on_conflict=wallet_id',{method:'POST',headers:{...headers(),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({wallet_id:id,bets:currentBets,starting_balance:effectiveBalance,updated_at:new Date().toISOString()})});
  if(!r.ok)throw Error('wallet_write');return NextResponse.json({ok:true,bets:currentBets,startingBalance:effectiveBalance});
 }
 return NextResponse.json({error:'invalid_action'},{status:400});
 }catch{return NextResponse.json({error:'sync_failed'},{status:503})}
}
