import { NextRequest, NextResponse } from "next/server";
import { analyzeGame, evaluateMarkets, rankTopFive } from "../../../../lib/nhl/engine";
import type { Match, Market } from "../../../../lib/nhl/engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const matches = body?.matches as Match[];
    const markets = body?.markets as Market[];
    if (!Array.isArray(matches) || !Array.isArray(markets) || matches.length > 20 || markets.length > 500)
      return NextResponse.json({ error: "Expected matches (max 20) and markets (max 500) arrays" }, { status: 400 });
    if (!matches.every(m => m && typeof m.id === "string" && m.home && m.away) ||
        !markets.every(m => m && typeof m.matchId === "string" && typeof m.id === "string"))
      return NextResponse.json({ error: "Invalid match/market objects" }, { status: 400 });
    const analysis = matches.map(match => {
      const summary = analyzeGame(match);
      const {joint, ...safeSummary} = summary;
      return {...safeSummary, picks: evaluateMarkets(match, markets)};
    });
    return NextResponse.json({ engine: "nhl-xg-poisson-v1", status: "uncalibrated",
      analysis, topFive: rankTopFive(matches, markets),
      note: "Requires real, timestamped input data and actual market odds. Not a live data feed." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
