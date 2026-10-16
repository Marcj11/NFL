#!/usr/bin/env python3
"""MoneyPuck -> dedicated NHL staging table. Idempotent, bounded and isolated."""
import csv, io, json, os, sys, time, urllib.request
from urllib.error import URLError
from supabase import create_client

SEASONS=("2023","2024","2025")
DATASETS=("skaters","goalies","teams")
MAX_ROWS=max(1,int(os.environ.get("NHL_MAX_ROWS_PER_FILE","30")))
BATCH_SIZE=25
def download(season,dataset):
    url=f"https://moneypuck.com/moneypuck/playerData/seasonSummary/{season}/regular/{dataset}.csv"
    request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"text/csv"})
    with urllib.request.urlopen(request,timeout=90) as response:
        text=io.TextIOWrapper(response,encoding="utf-8-sig",newline="")
        reader=csv.DictReader(text)
        if not reader.fieldnames or len(reader.fieldnames)<8: raise ValueError("Invalid CSV header")
        for idx,row in enumerate(reader):
            if idx>=MAX_ROWS:break
            if None in row:continue
            yield row

def key_for(row,dataset):
    fields=("playerId","team","situation") if dataset!="teams" else ("team","situation")
    pieces=[str(row.get(k) or "").strip() for k in fields]
    if any(not p for p in pieces):
        raise ValueError("Missing unique-key field: "+str(fields))
    return "|".join(pieces)

def main():
    url=os.environ.get("SUPABASE_URL","")
    key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY","")
    if not url or not key:raise RuntimeError("Supabase credentials unavailable")
    client=create_client(url,key)
    total=0
    errors=[]
    for season in SEASONS:
        for dataset in DATASETS:
            try:
                batch=[]
                count=0
                for row in download(season,dataset):
                    batch.append({"source":"MoneyPuck","season":season,"dataset":dataset,
                                  "row_key":key_for(row,dataset),"payload":row})
                    if len(batch)>=BATCH_SIZE:
                        client.table("nhl_historical_staging").upsert(batch,on_conflict="source,season,dataset,row_key").execute()
                        count+=len(batch);batch=[]
                if batch:
                    client.table("nhl_historical_staging").upsert(batch,on_conflict="source,season,dataset,row_key").execute()
                    count+=len(batch)
                total+=count
                print(json.dumps({"season":season,"dataset":dataset,"rows_upserted":count}),flush=True)
            except Exception as e:
                errors.append({"season":season,"dataset":dataset,"error":str(e)[:250]})
                print(json.dumps({"season":season,"dataset":dataset,"error":str(e)[:250]}),flush=True)
    print(json.dumps({"rows_processed":total,"files_failed":len(errors),"errors":errors}),flush=True)
    if errors:sys.exit(1)
if __name__=="__main__":main()
