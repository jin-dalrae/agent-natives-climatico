#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:8787}"

echo "== health =="
curl -sS "$BASE/health"
echo

echo "== agent card (cold start) =="
curl -sS "$BASE/.well-known/agent-card.json" | head -c 400
echo
echo "== ai-agent.json (IC probe) =="
curl -sS "$BASE/ai-agent.json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["name"], d["mcp"], d["a2a"], d["auth"]["type"])'
echo "== mcp.json =="
curl -sS "$BASE/.well-known/mcp.json"
echo

echo "== mint credential =="
CREDS=$(curl -sS -X POST "$BASE/v1/credentials" \
  -H 'content-type: application/json' \
  -d '{"subject":"judge-agent","scopes":["climatico:read","climatico:transact"]}')
echo "$CREDS"
TOKEN=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["token"])' "$CREDS")

echo
echo "== unauthenticated write should 401 =="
curl -sS -o /tmp/climatico-401.json -w "HTTP %{http_code}\n" \
  -X POST "$BASE/v1/actions" -H 'content-type: application/json' \
  -d '{"intent":"brief","location":"Houston, TX"}'

echo
echo "== grounded brief =="
curl -sS -X POST "$BASE/v1/actions" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"intent":"brief","location":"Houston, TX"}'

echo
echo "== offset write =="
curl -sS -X POST "$BASE/v1/actions" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"intent":"offset","location":"Oakland port","amountCents":2500,"note":"judge demo"}'

echo
echo "== refusal (greenwash) =="
curl -sS -o /tmp/climatico-refuse.json -w "HTTP %{http_code}\n" \
  -X POST "$BASE/v1/actions" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"intent":"greenwash","location":"everywhere"}'
python3 -c 'import json; print(json.load(open("/tmp/climatico-refuse.json"))["receipt"]["refusalReason"])'

echo
echo "== receipts =="
curl -sS "$BASE/v1/receipts" -H "authorization: Bearer $TOKEN"
echo

echo
echo "== fleet in-budget =="
curl -sS -X POST "$BASE/v1/fleet/run" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"source":"cloud","location":"SJC","spendUsd":12,"monthlyBudgetKg":50,"monthToDateKg":40}' \
  | python3 -c 'import json,sys; r=json.load(sys.stdin)["run"]; print(r["status"], r["settlement"], len(r["handoffs"]), "handoffs")'

echo
echo "== fleet spend spike =="
curl -sS -X POST "$BASE/v1/fleet/run" \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"source":"cloud","location":"SJC","spendUsd":420,"monthlyBudgetKg":50,"monthToDateKg":40}' \
  | python3 -c 'import json,sys; r=json.load(sys.stdin)["run"]; print(r["status"], r.get("settlement"), r.get("offsetReceipt",{}) and r["offsetReceipt"].get("id"), "kg", r.get("audit",{}).get("kgCO2e"))'

echo
echo "== handoffs =="
curl -sS "$BASE/v1/handoffs" -H "authorization: Bearer $TOKEN" \
  | python3 -c 'import json,sys; hs=json.load(sys.stdin)["handoffs"];
[print(h["from"], "→", h["to"], h["channel"], h["kind"]) for h in hs[:8]]'
echo
