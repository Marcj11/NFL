import {NextResponse} from 'next/server';

export const dynamic = 'force-dynamic';
const SOURCE = 'EXPERT NFL';
const DEFAULT_ORIGIN = 'https://expert-nfl-maj.protection-i-1817.chatgpt.site';

// The original EXPERT NFL project is private. Only server-side credentials may access it.
// Never expose the access token or fall back to fabricated model probabilities.
export async function GET() {
  const accessToken = process.env.EXPERT_NFL_SERVICE_TOKEN;
  const configuredOrigin = process.env.EXPERT_NFL_ORIGIN || DEFAULT_ORIGIN;
  let origin: URL;
  try {
    origin = new URL(configuredOrigin);
    if (origin.protocol !== 'https:' || origin.origin !== DEFAULT_ORIGIN || origin.pathname !== '/') {
      throw new Error('untrusted_origin');
    }
  } catch {
    return NextResponse.json({source:SOURCE,connected:false,reason:'invalid_engine_origin'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
  if (!accessToken) {
    return NextResponse.json({source:SOURCE,connected:false,reason:'authorized_server_bridge_required'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
  try {
    const response = await fetch(new URL('/api/cycle',origin), {
      method:'GET',
      headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},
      cache:'no-store',
      signal:AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json({source:SOURCE,connected:false,reason:response.status===401||response.status===403?'engine_authorization_denied':'engine_unavailable'}, {status:502,headers:{'Cache-Control':'no-store'}});
    }
    const payload:unknown = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid_payload');
    const data = payload as Record<string,unknown>;
    const report = data.weekly_report && typeof data.weekly_report==='object' && !Array.isArray(data.weekly_report) ? data.weekly_report as Record<string,unknown> : null;
    if (!report || typeof report.id!=='string' || !Array.isArray(report.rows)) throw new Error('invalid_report');
    return NextResponse.json({source:SOURCE,connected:true,report:{id:report.id,cycle_id:report.cycle_id??null,created_at:report.created_at??null,requested_week:report.requested_week??null,model_version:report.model_version??null,rows:report.rows}}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({source:SOURCE,connected:false,reason:'engine_response_unavailable'}, {status:502,headers:{'Cache-Control':'no-store'}});
  }
}
