#!/usr/bin/env python3
"""Check the MoneyPuck team-season CSV; no database writes."""
import csv
import io
import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SOURCE = "https://moneypuck.com/moneypuck/playerData/seasonSummary/2025/regular/teams.csv"
OUT = Path("artifacts/nhl-moneypuck")
OUT.mkdir(parents=True, exist_ok=True)
MAX_BYTES = 25_000_000

def download():
    for attempt in range(1, 4):
        try:
            request = Request(SOURCE, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/csv,*/*"})
            with urlopen(request, timeout=60) as response:
                payload = response.read(MAX_BYTES + 1)
            if len(payload) > MAX_BYTES:
                raise ValueError("CSV exceeds 25 MB limit")
            return payload
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 3:
                raise
            print(f"Attempt {attempt} failed: {error}; retrying", flush=True)
            time.sleep(3 * attempt)

try:
    data = download()
    if data[:100].lstrip().lower().startswith(b"<html"):
        raise ValueError("Received HTML instead of CSV")
    rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
    if not rows or len(rows[0]) < 3:
        raise ValueError("Missing data rows or invalid CSV header")
    columns = list(rows[0].keys())
    if any(not col for col in columns):
        raise ValueError("CSV has blank column names")
    report = {"ok": True, "source": SOURCE, "rows": len(rows),
              "columns": columns, "preview": rows[:2],
              "scope": "read-only validation; no Supabase writes"}
    print(f"VALID CSV: {len(rows)} rows, {len(columns)} columns", flush=True)
except Exception as error:
    report = {"ok": False, "source": SOURCE, "error": repr(error)}
    raise
finally:
    (OUT / "schema.json").write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                       encoding="utf-8")
