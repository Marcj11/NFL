import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({connected:false,reason:'integration_not_configured'},{status:503});
}
