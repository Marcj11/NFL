import {NextResponse} from 'next/server';
import {resolve4} from 'node:dns/promises';

export const dynamic = 'force-dynamic';
const host = 'expert-nfl-maj.protection-i-1817.chatgpt.site';
const url = 'https://' + host + '/api/cycle';

export async function GET() {
  const result: {dns:string;fetch:string;status:number|null;error:string|null;response_headers?:Record<string,string>} = {
    dns:'unknown',fetch:'not_attempted',status:null,error:null,
  };
  try {
    const addresses = await Promise.race([
      resolve4(host),
      new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('dns_timeout')),5000)),
    ]);
    result.dns = addresses.length ? 'ok' : 'no_ipv4_address';
  } catch(error) {
    result.dns='fail';
    result.error=error instanceof Error ? error.message.slice(0,160) : 'dns_error';
  }
  try {
    const response=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
    result.fetch='response_received';
    result.status=response.status;
    result.response_headers={
      'content-type':response.headers.get('content-type')||'',
      'www-authenticate':response.headers.get('www-authenticate')||'',
      'location':response.headers.get('location')||'',
    };
  } catch(error) {
    result.fetch='failed';
    result.error=error instanceof Error ? error.message.slice(0,160) : 'fetch_error';
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}
