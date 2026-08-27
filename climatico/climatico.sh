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
#   freight <lane> <mode> <kg> <km>  File a real PO/freight leg (sea|air|road|rail)
#   switch <loc> <newSolution> <priorReceiptId> <priorCents> <newCents>  Log a solution switch
#   refund <loc> <priorReceiptId> <priorCents> <newCents>  Claim back the delta after a switch
#   flag <loc>      Test a forbidden claim (greenwash)
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
print('Flag:', r.get('flagReason','—'))
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
if r.get('status')=='flagged': print('Why:', r.get('flagReason','?'))
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
  refuse|flag)
    loc="${1:-Orepath Global Chain}"
    echo "Testing forbidden claim (greenwash) at '$loc'..."
    api POST /v1/actions "{\"intent\":\"greenwash\",\"location\":\"$loc\"}" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Code:', r.get('flagCode','?'))
print('Why:', r.get('flagReason','?'))
print('Receipt ID:', r.get('id','?')[:8], '(flag stored permanently)')
"
    ;;
  freight)
    loc="${1:-Shenzhen -> Oakland}"
    mode="${2:-sea}"
    kg="${3:-8000}"
    km="${4:-11000}"
    [ -z "$TOKEN" ] && { echo "No token. Run 'mint' first."; exit 1; }
    echo "Filing freight leg '$loc' ($mode, ${kg}kg x ${km}km)..."
    body="{\"intent\":\"freight\",\"location\":\"$loc\",\"freightMode\":\"$mode\",\"weightKg\":$kg,\"distanceKm\":$km}"
    api POST /v1/actions "$body" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Receipt:', r.get('id','?')[:8])
print('Note:', r.get('note','?'))
if r.get('status') == 'flagged':
    print('Flagged:', r.get('flagReason','?'))
"
    ;;
  switch)
    loc="${1:-SJC}"
    new_sol="${2:-move compute to FRA region}"
    prior_id="${3:-placeholder-receipt-id}"
    prior_cents="${4:-3580}"
    new_cents="${5:-500}"
    note_arg=""
    [ -n "${6:-}" ] && note_arg=",\"note\":\"$6\""
    [ -z "$TOKEN" ] && { echo "No token. Run 'mint' first."; exit 1; }
    echo "Switching solution at '$loc'..."
    echo "  Prior: $prior_cents¢ (receipt $prior_id)"
    echo "  New:   $new_cents¢ ($new_sol)"
    body="{\"intent\":\"switch\",\"location\":\"$loc\",\"newSolution\":\"$new_sol\",\"priorReceiptId\":\"$prior_id\",\"priorAmountCents\":$prior_cents,\"amountCents\":$new_cents${note_arg}}"
    api POST /v1/actions "$body" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
print('Receipt:', r.get('id','?')[:8])
delta = $prior_cents - $new_cents
print(f'Net reduction: {delta}¢ ({(delta/100):.2f} USD) — claimable via ./climatico.sh refund')
"
    ;;
  refund)
    loc="${1:-SJC}"
    prior_id="${2:-placeholder-receipt-id}"
    prior_cents="${3:-3580}"
    new_cents="${4:-500}"
    [ -z "$TOKEN" ] && { echo "No token. Run 'mint' first."; exit 1; }
    echo "Claiming refund at '$loc'..."
    body="{\"intent\":\"refund\",\"location\":\"$loc\",\"priorReceiptId\":\"$prior_id\",\"priorAmountCents\":$prior_cents,\"amountCents\":$new_cents}"
    api POST /v1/actions "$body" | python3 -c "
import json,sys
r=json.load(sys.stdin).get('receipt',{})
print('Status:', r.get('status','?'))
refund = ($prior_cents) - ($new_cents)
print(f'Refund: {refund}¢ ({(refund/100):.2f} USD)')
print('Receipt:', r.get('id','?')[:8])
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
print(f\"Committed: {d.get('committed',0)}  Flagged: {d.get('flagged',0)}  Watches: {d.get('watches',0)}\")
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
  help)
    cat <<'EOF'
Climatico — CLI for the climate action desk
Base URL: $BASE

Usage: $0 <command> [args]

Onboarding:
  connect <folder>    Scan a folder, ingest signals, auto-assess your footprint
  status              Show connected folders and their assessments

Discovery:
  discover            Show agent discovery files

Auth:
  mint [subject]      Mint a token (default: cli-user)
  whoami <token>      Check what a token can do

Actions:
  fleet <loc> <$>     Ingest → audit → settle a spend spike
  offset <loc> <¢>    Commit an offset payment
  brief <loc>         File a climate brief with real sources
  watch <loc>         Watch a location (survives restart)
  flag <loc>        Test a forbidden claim (gets flagged + stored)

Reports:
  report              Progress report from the scheduler
  receipts [n]        Recent receipts (default: 5)
  handoffs [n]        Recent handoff log entries
  dashboard           Dashboard summary

Agents:
  orepath             Orepath employee agent status
  provider            3rd-party provider agent status
  agents-start        Start the Orepath agent (auto-runs every 15min)
  agents-stop         Stop the Orepath agent
  memory [ns]         Read Cortex memory

Environment:
  CLIMATICO_URL       API base (default: $BASE)
  CLIMATICO_TOKEN     Bearer token (set after 'mint')

Quick demo:
  ./climatico.sh discover
  ./climatico.sh mint judge
  export CLIMATICO_TOKEN="<token>"
  ./climatico.sh fleet SJC 420
  ./climatico.sh report
  ./climatico.sh flag
  ./climatico.sh receipts
  ./climatico.sh agents-start

Onboarding flow:
  ./climatico.sh connect ~/my-startup
  ./climatico.sh status
EOF
    ;;

  connect)
    folder="${1:-.}"
    dry_run=0
    [ "${2:-}" = "--dry-run" ] && dry_run=1
    if [ ! -d "$folder" ]; then
      echo "Folder not found: $folder"
      exit 1
    fi

    if [ $dry_run -eq 0 ]; then
      [ -z "$TOKEN" ] && { echo "No token. Run 'mint' first."; exit 1; }
    fi

    cat <<'PRIVACY'
  ┌────────────────────────────────────────────────────────────────┐
  │  PRIVACY — what stays on YOUR machine vs. what leaves it         │
  ├────────────────────────────────────────────────────────────────┤
  │                                                                │
  │  STAYS LOCAL (never read, never sent):                          │
  │    • File contents of package.json, wrangler config, README    │
  │    • Your source code, your .env files, your data               │
  │    • Anything else in the folder                               │
  │                                                                │
  │  SENT TO CLIMATICO (derived signals only):                      │
  │    • "Cloudflare Workers"  (extracted from wrangler config)     │
  │    • "stripe"              (extracted from package.json deps)   │
  │    • "README mentions shipping"  (keyword match only)          │
  │    • kind, class, confidence                                  │
  │    • NO file text, NO code snippets, NO values                 │
  │                                                                │
  │  LIKE: Salesforce reads your org's metadata, not your records. │
  │        Google reads your ad counts, not your emails.            │
  │        Workday reads your headcount, not your salary data.     │
  │        Climatico reads your signals, not your source.           │
  │                                                                │
  │  We do not store your files. We do not train on them.           │
  │  We do not send them to third parties. The server only sees     │
  │  the small JSON payload below — and that payload is yours to     │
  │  inspect with --dry-run before anything is sent.                │
  └────────────────────────────────────────────────────────────────┘
PRIVACY
    echo ""
    echo "Scanning $folder (file contents never leave this machine)..."
    signals_json="["
    first=1
    file_count=0

    if [ -f "$folder/package.json" ]; then
      file_count=$((file_count+1))
      cloud=$(python3 -c "import json; p=json.load(open('$folder/package.json')); d={**p.get('dependencies',{}), **p.get('devDependencies',{})}; cl=[k for k in ['@aws-sdk','aws-sdk','@google-cloud','@azure','wrangler','firebase','@supabase'] if any(k==i or i.startswith(k) for i in d)]; print((cl[0] if cl else 'node'), ('cloud' if cl else 'unknown'))" 2>/dev/null)
      provider=$(echo "$cloud" | awk '{print $1}')
      is_cloud=$(echo "$cloud" | awk '{print $2}')
      [ "$is_cloud" = "cloud" ] && {
        if [ $first -eq 0 ]; then signals_json+=","; fi
        first=0
        signals_json+="{\"kind\":\"cloud\",\"class\":\"compute\",\"evidence\":\"$provider\",\"confidence\":0.8}"
        echo "  + compute · $provider (package.json)"
      }
    fi

    if [ -f "$folder/wrangler.toml" ] || [ -f "$folder/wrangler.jsonc" ]; then
      file_count=$((file_count+1))
      if [ $first -eq 0 ]; then signals_json+=","; fi
      first=0
      signals_json+="{\"kind\":\"cloud\",\"class\":\"compute\",\"evidence\":\"Cloudflare Workers\",\"confidence\":0.9}"
      echo "  + compute · Cloudflare Workers (wrangler config)"
    fi

    if [ -f "$folder/package.json" ]; then
      for vendor in $(python3 -c "import json; p=json.load(open('$folder/package.json')); d={**p.get('dependencies',{}), **p.get('devDependencies',{})}; print(' '.join([k for k in ['stripe','twilio','sendgrid','datadog','sentry','slack','notion','linear','vercel','netlify','planetscale','mongodb','snowflake','databricks','algolia','segment','amplitude','mixpanel','hubspot','intercom','zendesk','mailgun','postmark'] if any(k==i or i.startswith(k+'/') for i in d)]))" 2>/dev/null); do
        if [ $first -eq 0 ]; then signals_json+=","; fi
        first=0
        signals_json+="{\"kind\":\"vendor\",\"class\":\"saas\",\"evidence\":\"$vendor\",\"confidence\":0.75}"
        echo "  + saas · $vendor (package.json)"
      done
    fi

    if [ -f "$folder/README.md" ]; then
      for kw in "shipping" "freight" "logistics" "warehouse" "fulfillment" "port" "ocean" "trucking"; do
        if grep -qi "$kw" "$folder/README.md" 2>/dev/null; then
          if [ $first -eq 0 ]; then signals_json+=","; fi
          first=0
          signals_json+="{\"kind\":\"logistics\",\"class\":\"logistics\",\"evidence\":\"README mentions $kw\",\"confidence\":0.5}"
          echo "  + logistics · README mentions $kw"
          break
        fi
      done
    fi

    [ $first -eq 1 ] && signals_json+="{\"kind\":\"office\",\"class\":\"direct\",\"evidence\":\"no infra signals detected\",\"confidence\":0.3}"
    signals_json+="]"

    abs_path=$(cd "$folder" 2>/dev/null && pwd || echo "$folder")
    echo ""
    echo "→ $file_count files scanned"
    echo ""

    body="{\"path\":\"$abs_path\",\"signals\":$signals_json}"
    sig_count=$(echo "$signals_json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    echo "  ┌─ EXACT PAYLOAD TO BE SENT ─────────────────────────────────┐"
    echo "  │  Path:    $abs_path"
    echo "  │  Signals: $sig_count derived item(s)"
    echo "  │  Bytes:   $(echo -n "$body" | wc -c | tr -d ' ')"
    echo "  │  ─────"
    echo "$body" | python3 -c "
import json,sys
d=json.loads(sys.stdin.read())
print('  │  ' + json.dumps(d, indent=2).replace('\n', '\n  │  '))
" 2>/dev/null || echo "  │  $body"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""

    if [ $dry_run -eq 1 ]; then
      echo "(--dry-run: nothing sent. Run without --dry-run to send this payload.)"
      exit 0
    fi

    echo "→ Sending to Climatico for auto-assessment..."
    res=$(curl -sS -X POST "$BASE/v1/connect" \
      -H 'content-type: application/json' \
      -H "authorization: Bearer $TOKEN" \
      -d "$body")
    echo ""
    echo "=== Auto-assessment ==="
    echo "$res" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'error' in d:
    print('Error:', d['error'])
    sys.exit(1)
print(f'Connection: {d[\"id\"][:8]} · {d[\"signals\"]} signals · {d[\"path\"]}')
print()
for a in d.get('assessments',[]):
    status_icon = '🟢' if a['status']=='live' else '⚪' if a['status']=='modeled' else '🔴'
    note = a.get('liveNote','')
    print(f'  {status_icon} {a[\"classId\"]:12s} [{a[\"status\"]:8s}] {a[\"evidence\"]} source(s) · {note[:80]}')
print()
print('Background agents now watching:')
print('  • Scheduler — runs fleet + research every 30 min')
print('  • Orepath agent — autonomous compute-spend monitoring')
print('  • Inbox analyst — pushes suggestions as they emerge')
print('  • Provider — can fulfill any committed offset')
"
    echo ""
    echo "Next: ./climatico.sh status | ./climatico.sh fleet SJC 420 | ./climatico.sh report"
    ;;
  observe)
    echo "=== Watching Orepath · refresh: ctrl+c to stop ==="
    echo ""
    while true; do
      clear
      res=$(curl -sS "$BASE/v1/observe")
      echo "$res" | python3 -c "
import json,sys,datetime
try:
  d=json.loads(sys.stdin.read())
except Exception as e:
  print('Error:', e)
  sys.exit(1)

now = datetime.datetime.fromtimestamp(d.get('refreshedAt', 0)/1000).strftime('%H:%M:%S')
print(f'  refreshed: {now}')
print()

# Orepath
o = d.get('orepath', {})
print('  ╔═══ OREPATH AGENT (compute-watcher) ═══╗')
print(f'  ║  active: {o.get(\"active\")}  ·  runs filed: {o.get(\"runsFiled\",0)}  ·  committed: {o.get(\"totalCommitted\",0)}  ·  flagged: {o.get(\"totalFlagged\",0)}')
print(f'  ║  last spend: \${o.get(\"lastSpend\",0)}  ·  total offsets: \${o.get(\"totalOffsetCents\",0)/100:.2f}')
hist = o.get('history', [])
if hist:
    print('  ║  recent runs:')
    for h in hist[:5]:
        at = datetime.datetime.fromtimestamp(h['at']/1000).strftime('%H:%M')
        icon = '✓' if h['status']=='committed' else '✗'
        print(f'  ║    {at} {h[\"location\"]:5s} \${h[\"spend\"]:>4} → {h[\"kgCO2e\"]:>5.1f} kg · {h[\"status\"]} {icon} \${h[\"offsetCents\"]/100:.2f}')
print('  ╚' + '═'*47 + '╝')
print()

# Provider
p = d.get('provider', {})
print('  Provider (green-offset-co):')
print(f'    services: {\", \".join(p.get(\"services\", []))}')
print(f'    contracts: {p.get(\"contracts\",0)} · revenue: \${p.get(\"revenueCents\",0)/100:.2f}')
print()

# Summary
s = d.get('summary', {})
print('  Ledger:')
print(f'    {s.get(\"committed\",0)} commits · {s.get(\"flagged\",0)} flags · {s.get(\"fleetRuns\",0)} fleet runs · {s.get(\"watches\",0)} watches')
print()

# Inbox alerts
alerts = d.get('inboxAlerts', [])
if alerts:
    print('  Inbox alerts:')
    for a in alerts[:3]:
        print(f'    [{a[\"tone\"]:>3}] {a[\"title\"][:80]}')
    print()

# Memory
mem = d.get('memory', [])
if mem:
    print('  Cortex memory (last 3):')
    for m in mem[:3]:
        at = datetime.datetime.fromtimestamp(m['at']/1000).strftime('%H:%M')
        print(f'    {at}  {m[\"content\"][:100]}')
    print()
"
      echo "  (refreshing in 10s... ctrl+c to stop)"
      sleep 10
    done
    ;;
  status)
    [ -z "$TOKEN" ] && { echo "No token. Run 'mint' first."; exit 1; }
    echo "=== Connected folders ==="
    api GET /v1/connections | python3 -c "
import json,sys
d=json.load(sys.stdin)
for c in d.get('connections',[]):
    print(f'  {c[\"id\"][:8]}  {c[\"path\"]}')
    print(f'    status: {c[\"status\"]} · {len(c.get(\"signals\",[]))} signals')
    for a in c.get('assessments',[]) or []:
        status_icon = '🟢' if a['status']=='live' else '⚪' if a['status']=='modeled' else '🔴'
        print(f'    {status_icon} {a[\"classId\"]:12s} [{a[\"status\"]}] {a[\"evidence\"]} src')
    print()
if not d.get('connections'):
    print('  (none) — run: ./climatico.sh connect ~/my-startup')
"
    ;;
esac
