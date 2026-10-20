"""Pure ESPN NFL boxscore mapping; no I/O or database writes."""
TEAM_ALIASES={'LAR':'LA','JAC':'JAX','WSH':'WAS'}
FIELDS={'passing':{'YDS':'passing_yards','ATT':'passing_attempts','TD':'passing_tds','INT':'passing_interceptions'},'rushing':{'YDS':'rushing_yards','CAR':'carries','TD':'rushing_tds'},'receiving':{'YDS':'receiving_yards','REC':'receptions','TGTS':'targets','TD':'receiving_tds'}}
def norm_team(team):return TEAM_ALIASES.get(team,team)
def map_boxscore(summary,game_id,teams,players_by_name):
 rows={};rejected=[]
 for group in summary.get('boxscore',{}).get('players',[]):
  team=norm_team(group.get('team',{}).get('abbreviation',''))
  if team not in teams:
   rejected.append(('team_mismatch',team));continue
  for category in group.get('statistics',[]):
   fields=FIELDS.get(category.get('name','').lower(),{})
   for athlete in category.get('athletes',[]):
    raw=athlete.get('athlete',{}).get('displayName','')
    matches=players_by_name.get(raw.casefold().strip(),[])
    if len(matches)!=1:
     rejected.append(('ambiguous_player',raw));continue
    pid=matches[0];key=(game_id,pid)
    row=rows.setdefault(key,{'game_id':game_id,'player_id':pid,'team_id':team,'metrics':{}})
    if row['team_id']!=team:raise ValueError('conflicting player team')
    for label,val in zip(category.get('labels',[]),athlete.get('stats',[])):
     if label not in fields:continue
     try:v=float(val)
     except (TypeError,ValueError):continue
     if -1000<v<100000:row['metrics'][fields[label]]=v
 return [r for r in rows.values() if r['metrics']],rejected
