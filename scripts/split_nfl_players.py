"""Create commit-friendly fragments of pre-staged player data."""
import json
from pathlib import Path
source=Path('diagnostics/staged-nfl-players.json')
data=json.loads(source.read_text())
dst=Path('diagnostics/player-chunks');dst.mkdir(parents=True,exist_ok=True)
size=250
for i in range(0,len(data),size):
 p=dst/f'players-{i//size:04d}.json'
 p.write_text(json.dumps(data[i:i+size],ensure_ascii=False,separators=(',',':')))
print(json.dumps({'players':len(data),'chunks':(len(data)+size-1)//size}))
