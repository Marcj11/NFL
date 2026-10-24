
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !key) {
    return NextResponse.json(
      { connected: false, reason: 'supabase_not_configured' },
      { status: 503 }
    );
  }

  try {
    const query = new URLSearchParams({
      select: 'report_id,cycle_id,generated_at,model_version,payload_json',
      order: 'generated_at.desc',
      limit: '1'
    });

    const response = await fetch(
      base + '/rest/v1/expert_reports?' + query.toString(),
      {
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, reason: 'database_read_failed' },
        { status: 502 }
      );
    }

    const records = await response.json();
    const item = Array.isArray(records) ? records[0] : null;
    const report = item?.payload_json;

    if (!item || !report || !Array.isArray(report.rows)) {
      return NextResponse.json({
        connected: false,
        reason: 'no_official_report'
      });
    }

    return NextResponse.json(
      {
        source: 'EXPERT NFL',
        connected: true,
        archived: true,
        report: {
          id: item.report_id,
          cycle_id: item.cycle_id,
          created_at: item.generated_at,
          model_version: item.model_version,
          requested_week: report.requested_week,
          rows: report.rows
        }
      },
      {
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch {
    return NextResponse.json(
      { connected: false, reason: 'database_unavailable' },
      { status: 502 }
    );
  }
}
