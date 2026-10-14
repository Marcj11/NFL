import unittest
from probability_core import *
class TestNFLMath(unittest.TestCase):
 def test_implied(self): self.assertAlmostEqual(implied_probability(2),.5)
 def test_devig(self): self.assertAlmostEqual(sum(devig({'a':1.8,'b':2.05}).values()),1)
 def test_ev(self): self.assertAlmostEqual(ev(.6,0,.4,1.85),.11)
 def test_push(self): self.assertAlmostEqual(ev(.52,.08,.40,1.91),.0732)
 def test_spread(self): self.assertEqual(tuple(round(p,2) for p in spread({-3:.2,0:.1,3:.45,7:.25},-3)),(.25,.45,.30))
 def test_half(self): self.assertEqual(spread({2:.3,3:.7},-2.5),(.7,0,.3))
 def test_invalid(self):
  with self.assertRaises(ValueError): ev(.6,.4,.2,1.8)
  with self.assertRaises(ValueError): implied_probability(1)
 def test_brier(self): self.assertAlmostEqual(brier([.8,.3],[1,0]),.065)
if __name__=='__main__': unittest.main()
