// NHL Studio quantitative engine v1. Independent from NFL. No live-data assumptions.
export type Team = {
  id: string; games: number; xgf60: number; xga60: number;
  shotsFor60?: number; shotsAgainst60?: number;
  powerPlayPct?: number; penaltyKillPct?: number;
  goalieSavePct?: number; goalieConfirmed?: boolean;
  restDays?: number; injuriesImpact?: number;
};
export type Match = { id: string; home: Team; away: Team };
export type Market = {
  id: string; matchId: string; kind: "moneyline" | "regulation" | "total" | "spread";
  selection: "home" | "away" | "draw" | "over" | "under";
  line?: number; decimalOdds: number;
};
export type Pick = {
  marketId: string; kind: Market["kind"]; selection: Market["selection"];
  probability: number; fairOdds: number; decimalOdds: number;
  ev: number; edge: number; recommendation: "BET" | "PASS";
  reasons: string[]; modelVersion: string;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finite = (v: number, field: string) => {
  if (!Number.isFinite(v)) throw new Error("Invalid " + field);
  return v;
};
function validate(t: Team) {
  if (!t.id || !Number.isInteger(t.games) || t.games < 1) throw new Error("Invalid team id/games");
  for (const k of ["xgf60", "xga60"] as const) {
    if (finite(t[k], k) < 0 || t[k] > 12) throw new Error("Invalid " + k);
  }
  for (const k of ["powerPlayPct", "penaltyKillPct", "goalieSavePct"] as const) {
    const value = t[k];
    if (value !== undefined && (finite(value, k) < 0 || value > 1)) throw new Error("Invalid " + k + " (use 0..1)");
  }
  if (t.injuriesImpact !== undefined && Math.abs(finite(t.injuriesImpact, "injuriesImpact")) > 1)
    throw new Error("injuriesImpact must be -1..1");
}
// Return a distribution including a conservative last tail bucket.
function poisson(lambda: number, maximum = 15): number[] {
  const p = [Math.exp(-lambda)];
  for (let i = 1; i < maximum; i++) p.push((p[i - 1] * lambda) / i);
  p.push(Math.max(0, 1 - p.reduce((a, b) => a + b, 0)));
  return p;
}
function means(match: Match) {
  validate(match.home); validate(match.away);
  const h = match.home, a = match.away;
  // xG-based baseline with regularization for small samples.
  const weightH = h.games / (h.games + 15);
  const weightA = a.games / (a.games + 15);
  const hFor = weightH * h.xgf60 + (1 - weightH) * 2.9;
  const hAgainst = weightH * h.xga60 + (1 - weightH) * 2.9;
  const aFor = weightA * a.xgf60 + (1 - weightA) * 2.9;
  const aAgainst = weightA * a.xga60 + (1 - weightA) * 2.9;
  const pp = (t: Team, opponent: Team) => t.powerPlayPct === undefined || opponent.penaltyKillPct === undefined
    ? 0 : clamp((t.powerPlayPct - .21) * 1.5 + (.79 - opponent.penaltyKillPct) * .8, -.3, .3);
  const goalie = (t: Team) => t.goalieSavePct === undefined ? 0 : clamp((.905 - t.goalieSavePct) * 12, -.35, .35);
  const rest = (t: Team) => t.restDays === undefined ? 0 : (t.restDays === 0 ? -.16 : t.restDays >= 2 ? .06 : 0);
  const injury = (t: Team) => clamp(t.injuriesImpact ?? 0, -.5, .5);
  const home = clamp((hFor + aAgainst) / 2 + .12 + pp(h, a) + goalie(a) + rest(h) - rest(a) + injury(h) - injury(a), .25, 7);
  const away = clamp((aFor + hAgainst) / 2 - .12 + pp(a, h) + goalie(h) + rest(a) - rest(h) + injury(a) - injury(h), .25, 7);
  const warnings = [
    ...(!h.goalieConfirmed || !a.goalieConfirmed ? ["One or both starting goalies unconfirmed"] : []),
    ...(h.games < 10 || a.games < 10 ? ["Small sample, shrinkage applied"] : []),
    ...([h, a].some(t => t.goalieSavePct === undefined) ? ["Goalie save data missing; league-neutral assumption"] : []),
  ];
  return {home, away, warnings};
}
export function analyzeGame(match: Match) {
  const m = means(match), hp = poisson(m.home), ap = poisson(m.away);
  let homeReg = 0, awayReg = 0, drawReg = 0;
  const joint: {h: number; a: number; p: number}[] = [];
  for (let h = 0; h < hp.length; h++) for (let a = 0; a < ap.length; a++) {
    const p = hp[h] * ap[a];
    joint.push({h, a, p});
    if (h > a) homeReg += p; else if (h < a) awayReg += p; else drawReg += p;
  }
  // Overtime tie allocation: logistic strength proxy; not an observed calibrated parameter.
  const otHome = clamp(1 / (1 + Math.exp(-.38 * (m.home - m.away))), .3, .7);
  return {
    matchId: match.id, expectedGoals: {home: m.home, away: m.away},
    probabilities: {homeReg, awayReg, drawReg,
      homeMoneyline: homeReg + drawReg * otHome, awayMoneyline: awayReg + drawReg * (1 - otHome)},
    warnings: m.warnings, joint, version: "nhl-xg-poisson-v1"
  };
}
export function evaluateMarkets(match: Match, markets: Market[], minEv = .03): Pick[] {
  const analysis = analyzeGame(match);
  return markets.filter(x => x.matchId === match.id).map(m => {
    if (!m.id || !Number.isFinite(m.decimalOdds) || m.decimalOdds <= 1 || m.decimalOdds > 1000)
      throw new Error("Invalid decimal odds");
    if ((m.kind === "total" || m.kind === "spread") && !Number.isFinite(m.line))
      throw new Error("Total/spread requires a numeric line");
    if (m.kind === "total" && m.selection !== "over" && m.selection !== "under") throw new Error("Invalid total selection");
    if (m.kind === "spread" && m.selection !== "home" && m.selection !== "away") throw new Error("Invalid spread selection");
    if (m.kind === "regulation" && !["home", "away", "draw"].includes(m.selection)) throw new Error("Invalid regulation selection");
    const v = analysis.probabilities;
    let wins = 0, pushes = 0;
    if (m.kind === "moneyline") {
      if (m.selection !== "home" && m.selection !== "away") throw new Error("Invalid moneyline selection");
      wins = m.selection === "home" ? v.homeMoneyline : v.awayMoneyline;
    } else if (m.kind === "regulation") {
      wins = m.selection === "home" ? v.homeReg : m.selection === "away" ? v.awayReg : m.selection === "draw" ? v.drawReg : NaN;
    } else {
      for (const o of analysis.joint) {
        const score = m.kind === "total" ? o.h + o.a : m.selection === "home" ? o.h - o.a : o.a - o.h;
        const result = m.kind === "total"
          ? (m.selection === "over" ? score - m.line! : m.line! - score)
          : score + m.line!;
        if (result > 1e-9) wins += o.p;
        if (Math.abs(result) <= 1e-9) pushes += o.p;
      }
    }
    if (!Number.isFinite(wins) || wins < 0 || wins > 1 || pushes > 1)
      throw new Error("Invalid market selection/probability");
    const loss = Math.max(0, 1 - wins - pushes);
    const ev = wins * (m.decimalOdds - 1) - loss;
    const fairOdds = wins ? (1 - pushes) / wins : Infinity;
    const edge = wins - (1 - pushes) / m.decimalOdds;
    const reasons = [...analysis.warnings,
      "Model: xG matchup, home ice, special teams, rest, goalie and reported injuries",
      "Probabilities are uncalibrated; verify lineups, market rules and source timestamps"];
    return {marketId: m.id, kind: m.kind, selection: m.selection, probability: wins,
      fairOdds, decimalOdds: m.decimalOdds, ev, edge,
      recommendation: ev >= minEv && analysis.warnings.length === 0 ? "BET" : "PASS",
      reasons, modelVersion: analysis.version};
  }).sort((a, b) => b.ev - a.ev);
}
export function rankTopFive(matches: Match[], markets: Market[], minEv = .03): Pick[] {
  const ids = new Set<string>();
  for (const match of matches) {
    if (ids.has(match.id)) throw new Error("Duplicate match id");
    ids.add(match.id);
  }
  return matches.flatMap(match => evaluateMarkets(match, markets, minEv))
    .filter(x => x.recommendation === "BET")
    .sort((a, b) => b.ev - a.ev).slice(0, 5);
}
