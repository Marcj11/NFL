import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const markets = new Set(['spread','total','passing_yards','rushing_yards','receiving_yards','receptions']);
const idPattern = /^20[0-9]{2}_[0-9]{2}_[A-Z]{2,3}_[A-Z]{2,3}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Candidate = {
  game_id: string; market: string; player_id?: string | null;
  selection: string; line: number; american_odds?: number | null;
  bookmaker?: string | null; market_observed_at?: string | null;
  probability: number; model_version: string; model_inputs_cutoff: string;
};

export async function POST(request: Request) {
  const token = process.env.NFL_BRIDGE_TOKEN;
  const db = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !db || !key) return NextResponse.json({error:'not_configured'},{status:503});
  if (request.headers.get('authorization') !== 'Bearer '+token)
    return NextResponse.json({error:'unauthorized'},{status:401});
  let body: Candidate;
  try { body = await request.json() as Candidate; }
  catch { return NextResponse.json({error:'invalid_json'},{status:400}); }
  const now = new Date();
  if (!body || !idPattern.test(body.game_id || '') || !markets.has(body.market) ||
      !Number.isFinite(body.line) || !Number.isFinite(body.probability) ||
      body.probability<0 || body.probability>1 ||
      !body.model_version || body.model_version.length>120 ||
      !body.selection || body.selection.length>40 ||
      !Number.isFinite(Date.parse(body.model_inputs_cutoff)) ||
      Date.parse(body.model_inputs_cutoff)>now.getTime() ||
      (body.player_id != null && !uuidPattern.test(body.player_id)) ||
      (body.american_odds != null && (!Number.isInteger(body.american_odds) || Math.abs(body.american_odds)<100 || Math.abs(body.american_odds)>100000)) ||
      (body.market_observed_at != null && (!Number.isFinite(Date.parse(body.market_observed_at)) || Date.parse(body.market_observed_at)>now.getTime()))) {
    return NextResponse.json({error:'invalid_candidate'},{status:422});
  }
  if (['passing_yards','rushing_yards','receiving_yards','receptions'].includes(body.market) && !body.player_id)
    return NextResponse.json({error:'player_required'},{status:422});
  const headers = {apikey:key,authorization:'Bearer '+key};
  const gameQuery = new URLSearchParams({select:'game_id,kickoff_utc,home_team_id,away_team_id',game_id:'eq.'+body.game_id});
  try {
    const gameResponse=await fetch(db+'/rest/v1/games?'+gameQuery,{headers,cache:'no-store'});
    if(!gameResponse.ok) throw new Error('game_read_failed');
    const gameRows=await gameResponse.json();
    const game=gameRows[0];
    if(!game) return NextResponse.json({error:'game_not_found'},{status:404});
    if(now.getTime() >= Date.parse(game.kickoff_utc))
      return NextResponse.json({error:'not_pregame'},{status:422});
    if(body.market==='spread' && ![game.home_team_id,game.away_team_id].includes(body.selection.toUpperCase()))
      return NextResponse.json({error:'invalid_team_selection'},{status:422});
    if(body.market!=='spread' && !['over','under'].includes(body.selection.toLowerCase()))
      return NextResponse.json({error:'invalid_side_selection'},{status:422});
    // Incoming market fields remain unverified until independently reconciled
    // against a trusted vendor observation. No client can award itself verified status.
    const row={
      game_id:body.game_id, player_id:body.player_id ?? null,
      market:body.market,selection:body.selection,line:body.line,
      american_odds:body.american_odds ?? null,
      bookmaker:body.bookmaker ?? null,
      market_observed_at:body.market_observed_at ?? null,
      probability:body.probability,model_version:body.model_version,
      model_inputs_cutoff:new Date(body.model_inputs_cutoff).toISOString(),
      predicted_at:now.toISOString(),data_quality:'unverified',
      notes:'Server recorded candidate. Market and model inputs require independent verification.'
    };
    const saved=await fetch(db+'/rest/v1/nfl_studio_prediction_journal',{
      method:'POST',
      headers:{...headers,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(row),cache:'no-store'
    });
    if(!saved.ok) throw new Error('journal_write_failed');
    const inserted=await saved.json();
    return NextResponse.json({saved:true,id:inserted[0]?.id,verification:'unverified',bet_placed:false},
      {status:201,headers:{'Cache-Control':'no-store'}});
  }catch {
    return NextResponse.json({error:'database_unavailable'},{status:502});
  }
}
