import unittest
from espn_boxscore_mapper import map_boxscore

class ESPNMappingTests(unittest.TestCase):
    def test_merges_categories_for_same_player(self):
        sample={"boxscore":{"players":[{"team":{"abbreviation":"BUF"},"statistics":[
          {"name":"passing","labels":["YDS","ATT"],"athletes":[{"athlete":{"displayName":"Test QB"},"stats":["250","32"]}]},
          {"name":"rushing","labels":["YDS","CAR"],"athletes":[{"athlete":{"displayName":"Test QB"},"stats":["35","5"]}]}
        ]}]}}
        rows,rejected=map_boxscore(sample,"game1",{"BUF","NYJ"},{"test qb":["uuid1"]})
        self.assertEqual(len(rows),1)
        self.assertFalse(rejected)
        self.assertEqual(rows[0]["metrics"]["passing_yards"],250)
        self.assertEqual(rows[0]["metrics"]["rushing_yards"],35)
    def test_rejects_ambiguous_player(self):
        sample={"boxscore":{"players":[{"team":{"abbreviation":"BUF"},"statistics":[
          {"name":"receiving","labels":["YDS"],"athletes":[{"athlete":{"displayName":"Same Name"},"stats":["80"]}]}
        ]}]}}
        rows,rejected=map_boxscore(sample,"game1",{"BUF","NYJ"},{"same name":["id1","id2"]})
        self.assertEqual(rows,[])
        self.assertEqual(rejected[0][0],"ambiguous_player")
    def test_rejects_wrong_team(self):
        sample={"boxscore":{"players":[{"team":{"abbreviation":"MIA"},"statistics":[
          {"name":"rushing","labels":["YDS"],"athletes":[{"athlete":{"displayName":"Test RB"},"stats":["60"]}]}
        ]}]}}
        rows,rejected=map_boxscore(sample,"game1",{"BUF","NYJ"},{"test rb":["id1"]})
        self.assertEqual(rows,[])
        self.assertEqual(rejected[0][0],"team_mismatch")
if __name__=="__main__":unittest.main()
