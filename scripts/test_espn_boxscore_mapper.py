import unittest
from espn_boxscore_mapper import map_boxscore
class MappingTests(unittest.TestCase):
 def sample(self,kind,labels,values,team='BUF'):
  return {'boxscore':{'players':[{'team':{'abbreviation':team},'statistics':[{'name':kind,'labels':labels,'athletes':[{'athlete':{'displayName':'Test Player'},'stats':values}]}]}]}}
 def runmap(self,data,names=None):
  return map_boxscore(data,'g',{'BUF','NYJ'},names if names is not None else {'test player':['p']})
 def test_passing(self):
  rows,_=self.runmap(self.sample('passing',['YDS','ATT'],['250','32']))
  self.assertEqual(rows[0]['metrics']['passing_yards'],250)
 def test_kicking_pair(self):
  rows,_=self.runmap(self.sample('kicking',['FG','XP'],['2/3','3/3']))
  self.assertEqual(rows[0]['metrics']['field_goals_attempted'],3)
  self.assertEqual(rows[0]['metrics']['extra_points_made'],3)
 def test_ambiguous(self):
  rows,issues=self.runmap(self.sample('rushing',['YDS'],['41']),{'test player':['a','b']})
  self.assertEqual(rows,[]);self.assertEqual(issues[0][0],'ambiguous_player')
 def test_wrong_team(self):
  rows,issues=self.runmap(self.sample('rushing',['YDS'],['41'],team='MIA'))
  self.assertEqual(rows,[]);self.assertEqual(issues[0][0],'team_mismatch')
 def test_nonfinite(self):
  rows,_=self.runmap(self.sample('rushing',['YDS'],['NaN']))
  self.assertEqual(rows,[])
 def test_unknown_section(self):
  rows,_=self.runmap(self.sample('punting',['YDS'],['55']))
  self.assertEqual(rows,[])
 def test_invalid_fraction(self):
  rows,_=self.runmap(self.sample('kicking',['FG'],['4/3']))
  self.assertEqual(rows,[])
if __name__=='__main__':unittest.main()
