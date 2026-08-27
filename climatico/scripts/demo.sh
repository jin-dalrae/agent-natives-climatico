#!/usr/bin/env bash
# Judge-facing demo. Story order matches the submission blurb:
# Climatico's own agents investigate a company and follow up — on their own,
# before any judge touches anything. The writes below are what an outside
# agent CAN also do; they are not the point of the demo.
set -euo pipefail
BASE="${1:-http://localhost:8787}"

echo "== cold start: any stranger agent can find this =="
curl -sS "$BASE/ai-agent.json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["name"], d["mcp"], d["a2a"], d["auth"]["type"])'

echo
echo "== connect a viewing identity (scoped, frozen at mint) =="
CREDS=$(curl -sS -X POST "$BASE/v1/credentials" \
  -H 'content-type: application/json' \
  -d '{"subject":"judge-agent","scopes":["climatico:read","climatico:transact"]}')
TOKEN=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["token"])' "$CREDS")
echo "  token minted"

echo
echo "== 1. Climatico already investigated — nobody asked it to =="
echo "   (Orepath compute-watcher polls cloud spend every 15 min on its own;"
echo "    the scheduler runs the fleet pipeline + abatement research every 30 min)"
curl -sS "$BASE/v1/agents/orepath" | python3 -c '
import json,sys
d=json.load(sys.stdin)
active=d["active"]; runs=d["runsFiled"]
print("  orepath compute-watcher: active=" + str(active) + ", runs filed autonomously=" + str(runs))
'

echo
echo "== 2. What it found, and what it did about it (the follow-up) =="
curl -sS "$BASE/v1/report" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print(" ", d["summary"])
print("  Suggestions (the follow-up):")
for s in d["suggestions"]:
    print("   -", s)
'

echo
echo "== 3. The audit trail of that autonomous work — real handoffs, filed without a judge =="
curl -sS "$BASE/v1/handoffs" -H "authorization: Bearer $TOKEN" | python3 -c '
import json,sys
hs=json.load(sys.stdin)["handoffs"]
for h in hs[:6]:
    print("  ", h["from"], "->", h["to"], " ", h["channel"], " ", h["kind"])
'

echo
echo "== Now: what an outside agent CAN also do (the write surface underneath) =="

echo
echo "== unauthenticated write is refused (401), not silently ignored =="
curl -sS -o /tmp/climatico-401.json -w "  HTTP %{http_code}\n" \
  -X POST "$BASE/v1/actions" -H 'content-type: application/json' \
  -d '{"intent":"brief","location":"Houston, TX"}'

echo
echo "== a real freight leg gets filed and scored — a fact, not a request for approval =="
curl -sS -X POST "$BASE/v1/actions" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"intent":"freight","location":"Shenzhen -> Oakland","freightMode":"sea","weightKg":8000,"distanceKm":11000}' \
  | python3 -c 'import json,sys; r=json.load(sys.stdin)["receipt"]; print(" ", r["status"], "-", r["note"])'

echo
echo "== a dishonest claim, by contrast, IS refused and the refusal is stored =="
curl -sS -o /tmp/climatico-refuse.json \
  -X POST "$BASE/v1/actions" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"intent":"greenwash","location":"everywhere"}'
python3 -c 'import json; r=json.load(open("/tmp/climatico-refuse.json"))["receipt"]; print(" ", r["status"], "-", r["refusalReason"])'

echo
echo "== every receipt, committed or refused, lives in the same permanent ledger =="
curl -sS "$BASE/v1/receipts" -H "authorization: Bearer $TOKEN" \
  | python3 -c 'import json,sys; rs=json.load(sys.stdin)["receipts"]; print("  " + str(len(rs)) + " receipts on file")'
