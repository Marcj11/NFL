"""Pure ESPN NFL boxscore mapper. Does not read or write databases."""
import math
TEAM_ALIASES={'LAR':'LA','JAC':'JAX','WSH':'WAS'}
FIELDS={
'passing':{'YDS':'passing_yards','ATT':'passing_attempts','TD':'passing_tds','INT':'passing_interceptions','CMP':'completions'},
'rushing':{'YDS':'rushing_yards','CAR':'carries','TD':'rushing_tds'},
'receiving':{'YDS':'receiving_yards','REC':'receptions','TGTS':'targets','TD':'receiving_tds'},
'defensive':{'TOT':'def_tackles','SOLO':'def_solo_tackles','AST':'def_assisted_tackles','SACKS':'def_sacks','INT':'def_interceptions'},
'kicking':{'FGM':'field_goals_made','FGA':'field_goals_attempted','XPM':'extra_points_made','XPA':'extra_points_attempted'}}
PAIRS={'FG':('field_goals_made','field_goals_attempted'),'FGM/FGA':('field_goals_made','field_goals_attempted'),'XP':('extra_points_made','extra_points_attempted'),'XPM/XPA':('extra_points_made','extra_points_attempted'),'C/ATT':('completions','passing_attempts')}
def norm_team(t):return TEAM_ALIASES.get(t,t)
def num(v):
 try:
  x=float(v)
  return x if math.isfinite(x) and -1000<x<100000 else None
 except (ValueError,TypeError):return None
def map_boxscore(summary,game_id,teams,players_by_name,verified_espn_ids=None,strict_identity=False):
 rows={};rejected=[]
 for group in summary.get('boxscore',{}).get('players',[]):
  team=norm_team(group.get('team',{}).get('abbreviation',''))
  if team not in teams:
   rejected.append(('team_mismatch',team));continue
  for section in group.get('statistics',[]):
   kind=str(section.get('name','')).lower();fields=FIELDS.get(kind,{})
   if not fields:continue
   for a in section.get('athletes',[]):
    name=str(a.get('athlete',{}).get('displayName',''))
    matches=players_by_name.get(name.casefold().strip(),[])
    espn_id=str(a.get('athlete',{}).get('id') or '')
    linked=(verified_espn_ids or {}).get(espn_id) if espn_id else None
    if strict_identity and not linked:
     rejected.append(('unverified_espn_id',name));continue
    if linked:
     if matches and linked not in matches:
      rejected.append(('identity_conflict',name));continue
     matches=[linked]
    if len(matches)!=1:
     rejected.append(('ambiguous_player',name));continue
    metrics={}
    for label,value in zip(section.get('labels',[]),a.get('stats',[])):
     key=fields.get(label)
     if key:
      value=num(value)
      if value is not None:metrics[key]=value
     elif kind in ('kicking','passing') and label in PAIRS and isinstance(value,str) and '/' in value:
      bits=value.split('/')
      if len(bits)==2:
       x,y=(num(v) for v in bits)
       if x is not None and y is not None and 0<=x<=y:
        metrics[PAIRS[label][0]]=x;metrics[PAIRS[label][1]]=y
    if not metrics:continue
    rowkey=(game_id,matches[0])
    if rowkey in rows and rows[rowkey]['team_id']!=team:raise ValueError('conflicting player team')
    row=rows.setdefault(rowkey,{'game_id':game_id,'player_id':matches[0],'team_id':team,'metrics':{}})
    row['metrics'].update(metrics)
 return list(rows.values()),rejected
