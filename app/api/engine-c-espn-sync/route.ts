import {NextResponse} from 'next/server';
import {espnTeamId} from '../../../lib/expert-nfl/espn-team-ids';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Game={game_id:string;home_team_id:string;away_team_id:string;kickoff_utc:string};
async function getJson(url:string,timeout=9000){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
export async function GET(req:Request){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,base=process.env.SUPABASE_URL;
 if(!key||!base)return NextResponse.json({status:'missing_database_config'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 const url=new URL(req.url),selected=url.searchParams.get('game_id');
 const filter=selected?'game_id=eq.'+encodeURIComponent(selected):'kickoff_utc=gte.'+encodeURIComponent(new Date().toISOString())+'&order=kickoff_utc.asc&limit=16';
 try{
  const games=await getJson(base+'/rest/v1/games?select=game_id,home_team_id,away_team_id,kickoff_utc&'+filter) as Game[];
  const teams=[...new Set(games.flatMap(g=>[g.home_team_id,g.away_team_id]))];
  const snapshots=await Promise.all(teams.map(async team=>{
   const id=espnTeamId(team);
   if(!id)return {team,status:'unmapped',players:[] as any[],roster:[] as any[]};
   try{
    const [injuries,roster]=await Promise.allSettled([
      getJson('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/injuries',6500),
      getJson('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/'+id+'/roster',6500)
    ]);
    const inj=injuries.status==='fulfilled'?injuries.value:null;
    const ro=roster.status==='fulfilled'?roster.value:null;
    const raw=Array.isArray(inj?.injuries)?inj.injuries:[];
    const players=raw.map((x:any)=>({espn_id:String(x.athlete?.id||''),name:String(x.athlete?.displayName||x.displayName||''),position:String(x.athlete?.position?.abbreviation||''),status:String(x.status||x.type?.description||'unknown'),detail:x.details||null}));
    const entries=Array.isArray(ro?.athletes)?ro.athletes.flatMap((x:any)=>Array.isArray(x.items)?x.items:[x]):[];
    const rosterPlayers=entries.filter((x:any)=>x?.id).map((x:any)=>({espn_id:String(x.id),name:String(x.displayName||''),position:String(x.position?.abbreviation||''),status:String(x.status?.name||'unknown')}));
    return {team,status:inj?'fetched':'injury_endpoint_unavailable',players,roster:rosterPlayers,roster_fetched:Boolean(ro),observed_at:new Date().toISOString()};
   }catch{return {team,status:'espn_error',players:[],roster:[],roster_fetched:false,observed_at:new Date().toISOString()}}
  }));
  const indexed=new Map(snapshots.map(x=>[x.team,x]));
  const rows=games.flatMap(g=>[g.home_team_id,g.away_team_id].map(team=>{
   const s=indexed.get(team)!;
   return {game_id:g.game_id,team_id:team,kickoff_utc:g.kickoff_utc,observed_at:s.observed_at||new Date().toISOString(),source:'ESPN live team injuries and roster',endpoint_status:s.status,players:s.players,roster:s.roster,source_quality:s.status==='fetched'?'live_snapshot_not_official_inactives':'unavailable'};
  }));
  if(!rows.length)return NextResponse.json({status:'no_games',games:0,saved:0});
  const saved=await fetch(base+'/rest/v1/engine_c_espn_injury_snapshots',{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(rows),signal:AbortSignal.timeout(12000)});
  if(!saved.ok)return NextResponse.json({status:'database_write_failed',code:saved.status,error:(await saved.text()).slice(0,300)},{status:502});
  return NextResponse.json({status:'saved',games:games.length,saved:rows.length,teams:snapshots.map(x=>({team:x.team,status:x.status,injuries:x.players.length,roster:x.roster.length})),note:'Current ESPN snapshots; not retrospectively available before previous kickoffs.'});
 }catch(e){return NextResponse.json({status:'fetch_failed',reason:String(e)},{status:502})}
}
