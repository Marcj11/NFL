/** Strict, team-wide pregame availability gate for engine C V5.
 * Historical weekly injury and roster data cannot be presented as a verified
 * pre-kickoff report unless a source publication AND first-observed time exist.
 */
export type PregameAvailability={
 game_id:string;team_id:string;kickoff_utc:string;
 source_published_at:string|null;first_observed_at:string|null;
 source_name:string|null;
 players:Array<{player_id:string;position:string;status:'active'|'out'|'doubtful'|'questionable'|'limited'|'unknown';verified_at:string|null}>;
};
export type AvailabilityDecision={verified:boolean;status:'verified'|'pending_confirmation';reason:string;players_reviewed:number;unverified_players:number};
export function assessPregameAvailability(report:PregameAvailability|null,expected:{game_id:string;team_id:string;kickoff_utc:string}):AvailabilityDecision{
 const invalid=(reason:string,players_reviewed=0,unverified_players=0):AvailabilityDecision=>({verified:false,status:'pending_confirmation',reason,players_reviewed,unverified_players});
 if(!report)return invalid('missing_team_pregame_report');
 if(report.game_id!==expected.game_id||report.team_id!==expected.team_id||report.kickoff_utc!==expected.kickoff_utc)return invalid('report_game_or_team_mismatch');
 const kickoff=Date.parse(expected.kickoff_utc),published=Date.parse(report.source_published_at||''),seen=Date.parse(report.first_observed_at||'');
 if(!Number.isFinite(kickoff)||!Number.isFinite(published)||!Number.isFinite(seen)||published>=kickoff||seen>=kickoff||seen<published)return invalid('source_not_verified_before_kickoff',report.players.length);
 if(!report.source_name||!report.players.length)return invalid('empty_report_or_source',report.players.length);
 const distinct=new Set<string>();
 let invalidPlayers=0;
 for(const player of report.players){
  const ts=Date.parse(player.verified_at||'');
  if(!player.player_id||!player.position||!['active','out','doubtful','questionable','limited'].includes(player.status)||distinct.has(player.player_id)||!Number.isFinite(ts)||ts>=kickoff||ts<published)invalidPlayers++;
  distinct.add(player.player_id);
 }
 if(invalidPlayers)return invalid('missing_or_unverified_player_status',report.players.length,invalidPlayers);
 return {verified:true,status:'verified',reason:'source_and_player_status_verified_pregame',players_reviewed:report.players.length,unverified_players:0};
}
export function assessBothTeams(home:PregameAvailability|null,away:PregameAvailability|null,game:{game_id:string;home_team_id:string;away_team_id:string;kickoff_utc:string}){
 const h=assessPregameAvailability(home,{game_id:game.game_id,team_id:game.home_team_id,kickoff_utc:game.kickoff_utc});
 const a=assessPregameAvailability(away,{game_id:game.game_id,team_id:game.away_team_id,kickoff_utc:game.kickoff_utc});
 return {verified:h.verified&&a.verified,home:h,away:a};
}
