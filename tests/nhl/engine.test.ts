import assert from "node:assert/strict";
import { analyzeGame, evaluateMarkets, rankTopFive } from "../../lib/nhl/engine";

const team = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, games: 55, xgf60: 3.0, xga60: 3.0, goalieSavePct: .910,
  goalieConfirmed: true, restDays: 1, powerPlayPct: .21,
  penaltyKillPct: .79, ...overrides
});
const match = {id: "m1", home: team("H"), away: team("A")};
const near = (a: number, b: number, eps = 1e-8) => assert.ok(Math.abs(a-b)<eps, a+" != "+b);
let count = 0;
const test = (label: string, cb: () => void) => {cb(); count++; console.log("PASS "+label)};
test("probabilities sum to one", () => {
  const p = analyzeGame(match).probabilities;
  near(p.homeReg+p.awayReg+p.drawReg, 1);
  near(p.homeMoneyline+p.awayMoneyline,1);
});
test("distribution sums to one", () => near(analyzeGame(match).joint.reduce((s,v)=>s+v.p,0),1));
test("home advantage on equal-strength teams",()=>assert.ok(analyzeGame(match).probabilities.homeMoneyline>.5));
test("stronger home attack increases win chance",()=> {
  const strong = { ...match, home:team("H",{xgf60:4.2})};
  assert.ok(analyzeGame(strong).probabilities.homeMoneyline>analyzeGame(match).probabilities.homeMoneyline);
});
test("decimal odds expected value formula",()=> {
  const m={id:"ml",matchId:"m1",kind:"moneyline" as const,selection:"home" as const,decimalOdds:2.5};
  const pick=evaluateMarkets(match,[m])[0];
  near(pick.ev,pick.probability*2.5-1);
});
test("integer total handles pushes",()=> {
  const m={id:"total",matchId:"m1",kind:"total" as const,selection:"over" as const,line:6,decimalOdds:2.0};
  const pick=evaluateMarkets(match,[m])[0];
  const probs=analyzeGame(match).joint;
  const win=probs.filter(v=>v.h+v.a>6).reduce((s,v)=>s+v.p,0);
  const loss=probs.filter(v=>v.h+v.a<6).reduce((s,v)=>s+v.p,0);
  near(pick.ev,win-loss);
});
test("top five globally sorted and capped",()=> {
  const markets=Array.from({length:8},(_,i)=>({
    id:"m"+i,matchId:"m1",kind:"moneyline" as const,
    selection:"home" as const,decimalOdds:2+i*.2
  }));
  const picks=rankTopFive([match],markets);
  assert.equal(picks.length,5);
  assert.ok(picks.every((p,i)=>!i||p.ev<=picks[i-1].ev));
});
test("invalid odds rejected",()=>assert.throws(()=>evaluateMarkets(match,[{
  id:"bad",matchId:"m1",kind:"moneyline",selection:"home",decimalOdds:1
}])));
test("missing goalie creates PASS warning",()=> {
  const m2={...match,home:team("H",{goalieConfirmed:false})};
  const picks=evaluateMarkets(m2,[{id:"ml",matchId:"m1",kind:"moneyline",selection:"home",decimalOdds:10}]);
  assert.equal(picks[0].recommendation,"PASS");
});
test("invalid market selection rejected",()=>assert.throws(()=>evaluateMarkets(match,[{
  id:"invalid",matchId:"m1",kind:"total",selection:"home",line:5.5,decimalOdds:2
}])));
test("duplicate match ids rejected",()=>assert.throws(()=>rankTopFive([match,match],[])));
console.log("TOTAL "+count+" tests passed");
