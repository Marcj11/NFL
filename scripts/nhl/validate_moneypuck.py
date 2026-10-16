#!/usr/bin/env python3
"""Validate a publicly listed MoneyPuck CSV without modifying databases."""
import csv
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE = "https://moneypuck.com/moneypuck/playerData/seasonSummary/2025/regular/teams.csv"
OUT = Path("artifacts/nhl-moneypuck")
OUT.mkdir(parents=True, exist_ok=True)
req = Request(SOURCE, headers={"User-Agent": "Mozilla/5.0 NHLStudioDataValidation/1.0"})
with urlopen(req, timeout=45) as response:
    data = response.read(2000001)
if len(data) > 2000000:
    raise RuntimeError("File exceeded 2 MB sanity limit")
if data[:100].lstrip().lower().startswith(b"<html"):
    raise RuntimeError("Source returned HTML, not CSV")
rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
if not rows or len(rows[0]) < 3:
    raise RuntimeError("Unexpected empty or invalid CSV")
columns = list(rows[0])
report = {"source": SOURCE, "rows": len(rows), "columns": columns,
          "sample": [{k: r[k] for k in columns[:8]} for r in rows[:2]],
          "scope": "Validation only; no Supabase writes; no NFL modifications"}
(OUT / "schema.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({"rows": len(rows), "column_count": len(columns)}))
