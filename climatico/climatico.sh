#!/usr/bin/env bash
# Climatico CLI — talk to the climate action desk from your terminal.
# Usage: ./climatico.sh <command> [args]
#
# Commands:
#   discover          Show agent discovery files
#   mint [subject]    Mint a bearer token (default: cli-user)
#   whoami <token>    Show what a token can do
#   fleet <loc> <$>   Run fleet: ingest → audit → settle
#   offset <loc> <¢>  Commit an offset
#   brief <loc>       File an evidence-backed brief
#   watch <loc>       Start watching a location
#   refuse <loc>      Test a forbidden claim (greenwash)
#   report            Show progress report from the scheduler
#   receipts [n]      Show recent receipts (default: 5)
#   handoffs [n]      Show recent handoffs (default: 5)
#   orepath           Show Orepath employee agent status
#   provider          Show 3rd-party provider agent status
#   memory <ns>       Read Cortex memory for a namespace (general, fleet-runs, provider)
#   dashboard         Show the dashboard summary

set -euo pipefail
BASE="${CLIMATICO_URL:-https://climatico.dalrae-jin-work.workers.dev}"
TOKEN="${CLIMATICO_TOKEN:-}"

cmd="${1:-help}"
shift 2>/dev/null || true

api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$BASE$path" -H 'content-type: application/json')
  if [ -n "$TOKEN" ]; then
    args+=(-H "authorization: Bearer $TOKEN")
  fi
  if [ -n "$body" ]; then
    args+=(-d "$body")
  fi
  curl "${args[@]}"
}

case "$cmd" in
  discover)
    echo "=== ai-agent.json ==="
    curl -sS "$BASE/ai-agent.json" | python3 -m json.tool
    echo
    echo "=== Agent Card ==="
    curl -sS "$BASE/.well-known/agent-card.json" | python3 -m json.tool 2>/dev/null | head -30
    echo
    echo "=== MCP Card ==="
    curl -sS "$BASE/.well-known/mcp.json" | python3 -m json.tool
    ;;
  mint)
    subject="${1:-cli-user}"
    echo "Minting token for '$subject'..."
    res=$(curl -sS -X POST "$BASE/v1/credentials" \
      -H 'content-type: application/json' \
      -d "{\"subject\":\"$subject\",\"scopes\":[\"climatico:read\",\"climatico:transact\"]}")
    token=$(echo "$res" | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")
    echo "Token: $token"
    echo "Scopes: $(echo "$res" | python3 -c "import json,sys; print(json.load(sys.stdin)['scopes'])")"
    echo "Max: \$$(echo "$res" | python3 -c "import json,sys; print(json.load(sys.stdin)['maxAmountCents']/100)")"
    echo "Export: export CLIMATICO_TOKEN=\"$token\""
    ;;
  whoami)
    [ -z "$TOKEN" ] && { echo "No token set. Run 'mint' first or export CLIMATICO_TOKEN"; exit 1; }
    api POST /v1/actions '{"intent":"brief","location":"whoami","note":"whoami check"}' | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Subject:', r.get('subject','?'))
print('Intent:', r.get('intent','?'))
print('Status:', r.get('status','?'))
print('Refusal:', r.get('refusalReason','—'))
" 2>/dev/null || echo "Token valid"
    ;;
  fleet)
    loc="${1:-SJC}"
    spend="${2:-420}"
    budget="${3:-50}"
    mtd="${4:-40}"
    echo "Running fleet: \$$spend @ $loc (budget: ${budget}kg, MTD: ${mtd}kg)..."
    api POST /v1/fleet/run "{\"source\":\"cloud\",\"location\":\"$loc\",\"spendUsd\":$spend,\"monthlyBudgetKg\":$budget,\"monthToDateKg\":$mtd}" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('run',{})
print('Status:', r.get('status','?'))
audit=r.get('audit')
if audit: print('Score:', audit.get('kgCO2e','?'), 'kg · Over budget:', audit.get('overBudgetKg','?'), 'kg · Grounded:', audit.get('grounded'))
offset=r.get('offsetReceipt')
if offset: print('Offset:', offset.get('amountCents',0)/100, 'USD · Receipt:', offset.get('id','?')[:8])
print('Handoffs:', len(r.get('handoffs',[])))
"
    ;;
  offset)
    loc="${1:-Oakland port}"
    cents="${2:-2500}"
    echo "Committing offset of \$$(echo "scale=2; $cents/100" | bc) at '$loc'..."
    api POST /v1/actions "{\"intent\":\"offset\",\"location\":\"$loc\",\"amountCents\":$cents}" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Amount:', r.get('amountCents',0)/100, 'USD')
print('Receipt:', r.get('id','?')[:8])
"
    ;;
  brief)
    loc="${1:-Houston, TX}"
    echo "Filing climate brief for '$loc'..."
    api POST /v1/actions "{\"intent\":\"brief\",\"location\":\"$loc\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Sources:', len(r.get('evidence',[])))
if r.get('status')=='refused': print('Why:', r.get('refusalReason','?'))
"
    ;;
  watch)
    loc="${1:-Oakland port}"
    echo "Starting watch on '$loc'..."
    api POST /v1/actions "{\"intent\":\"watch\",\"location\":\"$loc\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Receipt:', r.get('id','?')[:8])
print('Evidence sources:', len(r.get('evidence',[])))
"
    ;;
  refuse)
    loc="${1:-Orepath Global Chain}"
    echo "Testing forbidden claim (greenwash) at '$loc'..."
    api POST /v1/actions "{\"intent\":\"greenwash\",\"location\":\"$loc\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Code:', r.get('refusalCode','?'))
print('Why:', r.get('refusalReason','?'))
print('Receipt ID:', r.get('id','?')[:8], '(refusal stored permanently)')
"
    ;;
  report)
    echo "=== Progress Report ==="
    api GET /v1/report | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Summary:', d.get('summary',''))
print('Modeled total:', d.get('totalModeledTons'), 't')
print('Hotspot:', d.get('hotspotClass'), d.get('hotspotTons'), 't')
print('Over budget:', d.get('overBudgetLocations',[]))
print()
print('Suggestions:')
for s in d.get('suggestions',[]): print(' •', s)
"
    ;;
  receipts)
    n="${1:-5}"
    echo "=== Last $n receipts ==="
    api GET /v1/receipts | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('receipts',[])[:$n]:
    s=r['status']
    print(f\"  [{s:>8}] {r['intent']:8s} @ {r.get('location','—'):15s} {r['id'][:8]} — {len(r.get('evidence',[]))} sources\")
"
    ;;
  handoffs)
    n="${1:-5}"
    echo "=== Last $n handoffs ==="
    api GET /v1/handoffs | python3 -c "
import json,sys
d=json.load(sys.stdin)
for h in d.get('handoffs',[])[:$n]:
    print(f\"  {h['from']:>7} → {h['to']:<7} {h['channel']:15s} {h['kind']}\")
"
    ;;
  orepath)
    echo "=== Orepath Employee Agent ==="
    curl -sS "$BASE/v1/agents/orepath" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Status:', 'ACTIVE' if d.get('active') else 'STOPPED')
print('Runs filed:', d.get('runsFiled',0))
print('Last spend:', d.get('lastSpend',0))
"
    echo
    echo "Start it: POST /v1/agents/orepath/start"
    echo "Stop it:  POST /v1/agents/orepath/stop"
    ;;
  provider)
    echo "=== 3rd-Party Provider ==="
    curl -sS "$BASE/v1/agents/provider" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Name:', d.get('name','?'))
print('Services:', ', '.join(d.get('services',[])))
"
    curl -sS "$BASE/v1/agents/provider/status" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('Contracts:', d.get('contracts',0))
print('Revenue:', d.get('revenueCents',0)/100, 'USD')
"
    ;;
  memory)
    ns="${1:-fleet-runs}"
    echo "=== Cortex Memory: $ns ==="
    api GET "/v1/memory?namespace=$ns" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for m in d.get('memories',[]):
    print(' •', m.get('content','')[:120])
    print('   at', m.get('timestamp',''))
"
    ;;
  dashboard)
    echo "=== Dashboard ==="
    api GET /v1/dashboard | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f\"Committed: {d.get('committed',0)}  Refused: {d.get('refused',0)}  Watches: {d.get('watches',0)}\")
print(f\"Fleet runs: {d.get('fleetRuns',0)}  Last receipt: {d.get('lastReceiptId','—')[:12]}\")
"
    ;;
  agents-start)
    echo "Starting Orepath employee agent..."
    curl -sS -X POST "$BASE/v1/agents/orepath/start" | python3 -m json.tool
    echo "Agent will run calculations every 15 min during working hours."
    ;;
  agents-stop)
    echo "Stopping Orepath employee agent..."
    curl -sS -X POST "$BASE/v1/agents/orepath/stop" | python3 -m json.tool
    ;;
  help|*)
    echo "Climatico — CLI for the climate action desk"
    echo "Base URL: $BASE"
    echo
    echo "Usage: $0 <command> [args]"
    echo
    echo "Discovery:"
    echo "  discover              Show agent discovery files"
    echo
    echo "Auth:"
    echo "  mint [subject]        Mint a token (default: cli-user)"
    echo "  whoami <token>        Check what a token can do"
    echo
    echo "Actions:"
    echo "  fleet <loc> <$>       Ingest → audit → settle a spend spike"
    echo "  offset <loc> <¢>      Commit an offset payment"
    echo "  brief <loc>           File a climate brief with real sources"
    echo "  watch <loc>           Watch a location (survives restart)"
    echo "  refuse <loc>          Test a forbidden claim (gets refused + stored)"
    echo
    echo "Reports:"
    echo "  report                Progress report from the scheduler"
    echo "  receipts [n]          Recent receipts (default: 5)"
    echo "  handoffs [n]          Recent handoff log entries"
    echo "  dashboard             Dashboard summary"
    echo
    echo "Agents:"
    echo "  orepath               Orepath employee agent status"
    echo "  provider              3rd-party provider agent status"
    echo "  agents-start          Start the Orepath agent (auto-runs every 15min)"
    echo "  agents-stop           Stop the Orepath agent"
    echo "  memory [ns]           Read Cortex memory"
    echo
    echo "Environment:"
    echo "  CLIMATICO_URL         API base (default: $BASE)"
    echo "  CLIMATICO_TOKEN       Bearer token (set after 'mint')"
    echo
    echo "Quick demo:"
    echo "  ./climatico.sh discover"
    echo "  ./climatico.sh mint judge"
    echo "  export CLIMATICO_TOKEN=\"<token>\""
    echo "  ./climatico.sh fleet SJC 420"
    echo "  ./climatico.sh report"
    echo "  ./climatico.sh refuse"
    echo "  ./climatico.sh receipts"
    echo "  ./climatico.sh agents-start"
    ;;
esac