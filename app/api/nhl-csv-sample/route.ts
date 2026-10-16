import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const allowed=new Set(['skaters','goalies','teams','lines']);
function parseLine(line:string):string[]{
 const out:string[]=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){const c=line[i];
  if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){out.push(value);value=''}else value+=c;
 }out.push(value);return out;
}
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const season=params.get('season')||'2024',type=params.get('type')||'skaters';
 if(!['2023','2024','2025'].includes(season)||!allowed.has(type))
  return NextResponse.json({error:'Invalid season or file type'},{status:400});
 const url='https://moneypuck.com/moneypuck/playerData/seasonSummary/'+season+'/regular/'+type+'.csv';
 const controller=new AbortController();const stop=setTimeout(()=>controller.abort(),18000);
 try{
  const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{'Range':'bytes=0-16383','Accept':'text/csv'}});
  if(!response.ok||!response.body)return NextResponse.json({status:'unavailable',http_status:response.status,season,type},{status:502});
  const reader=response.body.getReader();let raw='',bytes=0;
  try{while(bytes<16384){const part=await reader.read();if(part.done)break;bytes+=part.value.length;raw+=new TextDecoder().decode(part.value);if(raw.split('\n').length>=7)break}}finally{await reader.cancel().catch(()=>{});}
  const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const columns=parseLine(lines[0]||'');
  const examples=lines.slice(1,4).filter(x=>parseLine(x).length===columns.length).map(x=>parseLine(x).slice(0,7));
  return NextResponse.json({status:'sampled',source:'MoneyPuck.com',season,type,http_status:response.status,
   columns_count:columns.length,columns,example_values_first_seven_columns:examples,
   sample_bytes:bytes,imported_rows:0,writes_to_database:false,attribution:'MoneyPuck.com',
   warning:'Read-only schema sample. Columns and licensing must be reviewed before historic imports.'},
   {headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({status:'error',season,type,message:String(e)},{status:502})}
 finally{clearTimeout(stop)}
}
