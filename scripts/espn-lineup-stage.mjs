// NFL Studio: ESPN depth-chart staging importer (NOT a confirmed starting lineup).
// Run server-side only: ESPN_TEAM=kc GAME_ID=2026_06_KC_BUF TEAM_ID=KC node scripts/espn-lineup-stage.mjs
// Optional DB insert: COMMIT_TO_SUPABASE=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// Test against the current ESPN payload before trusting any mappings. No automatic source verification.
const { ESPN_TEAM, GAME_ID, TEAM_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!/^[a-z0-9]{2,4}$/i.test(ESPN_TEAM || '') || !/^20\d\d_\d\d_[A-Z]{2,3}_[A-Z]{2,3}$/.test(GAME_ID || '') || !/^[A-Z]{2,3}$/.test(TEAM_ID || '')) throw new Error('team and game identifiers required');
const sourceUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${encodeURIComponent(ESPN_TEAM)}/depthcharts`;
const response = await fetch(sourceUrl, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
if (!response.ok) throw new Error(`ESPN depthchart HTTP ${response.status}`);
const payload = await response.json();
const capturedAt = new Date().toISOString();
// ESPN depth charts can evolve; fail closed on unknown structures.
const root = payload.depthCharts ?? payload.depthcharts ?? payload.depthchart;
const charts = Array.isArray(root) ? root : root && typeof root === 'object' ? Object.values(root) : [];
const rows = [];
const seen = new Set();
for (const chart of charts) {
  const positions = Array.isArray(chart?.positions) ? chart.positions : chart?.positions && typeof chart.positions === 'object' ? Object.values(chart.positions) : [];
  for (const position of positions) {
    const abbreviation = position?.position?.abbreviation ?? position?.abbreviation;
    const entries = Array.isArray(position?.athletes) ? position.athletes : [];
    for (const entry of entries) {
      const athlete = entry?.athlete ?? entry;
      const name = athlete?.displayName ?? athlete?.fullName;
      if (!name || !abbreviation) continue;
      const gsis = null; // ESPN ID != GSIS ID. Never conflate them.
      const key = `${abbreviation}:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const defense = /^(DE|DT|NT|DL|LB|ILB|OLB|MLB|CB|S|SS|FS)$/i.test(abbreviation);
      const special = /^(K|P|LS|KR|PR)$/i.test(abbreviation);
      rows.push({
        game_id:GAME_ID,team_id:TEAM_ID,player_gsis_id:gsis,player_name:name,
        position:abbreviation,unit:special?'special_teams':defense?'defense':'offense',
        availability:'unknown',starter_status:'projected',
        source_name:'ESPN depth chart',source_url:sourceUrl,
        source_published_at:null,observed_at:capturedAt,source_verified:false
      });
    }
  }
}
if (!rows.length) {
  console.log(JSON.stringify({status:'schema_not_recognized',top_level_keys:Object.keys(payload),captured_at:capturedAt}));
  process.exitCode=2;
} else {
  console.log(JSON.stringify({status:'staged_unverified',game_id:GAME_ID,team_id:TEAM_ID,players:rows.length,offense:rows.filter(x=>x.unit==='offense').length,defense:rows.filter(x=>x.unit==='defense').length,sample:rows.slice(0,3)},null,2));
  if (process.env.COMMIT_TO_SUPABASE==='1') {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server-side Supabase credentials required');
    const result = await fetch(SUPABASE_URL+'/rest/v1/nfl_studio_lineup_observations',{
      method:'POST',headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(rows),signal:AbortSignal.timeout(12000)});
    if (!result.ok) throw new Error(`Supabase insert failed: ${result.status}`);
    console.log(JSON.stringify({status:'staged_in_database',rows:rows.length,verified:false}));
  }
}
