import sys
import nflreadpy as nfl

failures = []
for season in (2023, 2024, 2025, 2026):
    try:
        table = nfl.load_injuries([season])
        print(season, table.height, table.columns)
        if table.height == 0:
            failures.append(f"{season}: empty injury dataset")
    except Exception as error:
        message = f"{season}: {type(error).__name__}: {str(error)[:200]}"
        print(message, file=sys.stderr)
        failures.append(message)

if failures:
    print("Injury source audit FAILED:", "; ".join(failures), file=sys.stderr)
    sys.exit(1)

print("Injury source audit PASSED")
