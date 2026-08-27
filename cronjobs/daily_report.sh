#!/usr/bin/env bash
# Daily Climate Report: Export receipts and insights for public transparency
# Runs every day via cron

set -e

dir="$(dirname "$0")"
cd "$dir/.." || exit 1

# Log start
echo "[$(date)] Starting daily report generation" > logs/daily_report.log

# Mint a read-only credential, then use it to list receipts.
# GET /v1/receipts requires a bearer token; there is no unauthenticated path.
echo "Minting read-only credential..." >> logs/daily_report.log
mint_response=$(curl -sS -H "Content-Type: application/json" \
  -X POST https://climatico.dalrae-jin-work.workers.dev/v1/credentials \
  -d '{"subject": "daily-report-cron", "scopes": ["climatico:read"]}')
token=$(echo "$mint_response" | jq -r '.token')
if [ -z "$token" ] || [ "$token" = "null" ]; then
  echo "Error: failed to mint credential" >> logs/daily_report.log
  exit 1
fi

echo "Fetching receipts..." >> logs/daily_report.log
if curl -sS -f -H "Authorization: Bearer $token" \
   https://climatico.dalrae-jin-work.workers.dev/v1/receipts > receipts.json; then
  echo "Success: retrieved receipts" >> logs/daily_report.log
else
  echo "Error: failed to fetch receipts" >> logs/daily_report.log
  exit 1
fi

# Get insights (assessment, inbox)
echo "Fetching insights..." >> logs/daily_report.log

if curl -sS -f https://climatico.dalrae-jin-work.workers.dev/v1/workspace > workspace.json; then
  echo "Success: retrieved workspace" >> logs/daily_report.log
else
  echo "Error: failed to fetch workspace" >> logs/daily_report.log
  exit 1
fi

# Generate CSV report
echo "Generating CSV..." >> logs/daily_report.log

today=$(date +'%Y-%m-%d')
out="reports/daily_$(date +'%Y%m%d').csv"
echo "date,action,intent,location,kgCO2e,status,refusal_code,evidence_count" > "$out"

# Add receipts
jq -r --arg today "$today" \
  '.receipts[] | [$today, .intent, .location, .kgCO2e, .status, .refusalCode, (.evidence | length)] | @csv' \
  receipts.json >> "$out"

# Add inbox items
jq -r --arg today "$today" \
  '.inbox[] | [$today, "inbox", .from, .location, "-", .tone, "-", (if .evidence then (.evidence | length) else 0 end)] | @csv' \
  workspace.json >> "$out"

# Clean up old reports (keep last 7)
find reports -name "daily_*.csv" -mtime +7 -delete

# Log success
echo "[$(date)] Daily report generated: reports/daily_$(date +'%Y%m%d').csv" >> logs/daily_report.log

# Optional: Notify GitHub or Slack
# curl -X POST -H "Content-Type: application/json" -d '{"text": "Daily climate report generated!"}' https://hooks.slack.com/services/YOUR_WEBHOOK