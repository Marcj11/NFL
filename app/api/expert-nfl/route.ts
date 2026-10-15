import {NextResponse} from 'next/server';
export function GET(){return NextResponse.json({source:'EXPERT NFL',connected:false,reason:'authorized_server_bridge_required'},{headers:{'Cache-Control':'no-store'}})}
