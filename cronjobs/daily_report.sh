#!/usr/bin/env bash
# Daily Climate Report: Export receipts and insights for public transparency
# Runs every day via cron

set -e

dir="$(dirname "$0")"
cd "$dir/.." || exit 1

# Export API key for Tavily access (if needed)
export TAVILY_API_KEY=$(grep "TAVILY_API_KEY=" .dev.vars | cut -d'=' -f2- | tr -d '"')

# Log start
echo "[$(date)] Starting daily report generation" > logs/daily_report.log

# Get receipts (committed + refused)
echo "Fetching receipts..." >> logs/daily_report.log

if curl -sS -H "Content-Type: application/json" \
   -X POST https://climatico.dalrae-jin-work.workers.dev/v1/receipts \
   -d '{"limit": 50}' > receipts.json; then
  echo "Success: retrieved receipts" >> logs/daily_report.log
else
  echo "Error: failed to fetch receipts" >> logs/daily_report.log
  exit 1
fi

# Get insights (assessment, inbox)
echo "Fetching insights..." >> logs/daily_report.log

if curl -sS -H "Content-Type: application/json" \
   -X GET https://climatico.dalrae-jin-work.workers.dev/v1/workspace > workspace.json; then
  echo "Success: retrieved workspace" >> logs/daily_report.log
else
  echo "Error: failed to fetch workspace" >> logs/daily_report.log
  exit 1
fi

# Generate CSV report
echo "Generating CSV..." >> logs/daily_report.log

echo "date,action,intent,location,kgCO2e,status,refusal_code,evidence_count" > reports/daily_$(date +'%Y%m%d').csv

# Add receipts
jq -r '.receipts[] | ["$(date +"%Y-%m-%d")", .intent, .location, .kgCO2e, .status, .refusalCode, (.evidence | length)] | @csv' receipts.json >> reports/daily_$(date +'%Y%m%d').csv

# Add inbox items
jq -r '.inbox[] | ["$(date +"%Y-%m-%d")", "inbox", .from, .location, "-", .tone, "-", (if .evidence then (.evidence | length) else 0 end)] | @csv' workspace.json >> reports/daily_$(date +'%Y%m%d').csv

# Clean up old reports (keep last 7)
find reports -name "daily_*.csv" -mtime +7 -delete

# Log success
echo "[$(date)] Daily report generated: reports/daily_$(date +'%Y%m%d').csv" >> logs/daily_report.log

# Optional: Notify GitHub or Slack
# curl -X POST -H "Content-Type: application/json" -d '{"text": "Daily climate report generated!"}' https://hooks.slack.com/services/YOUR_WEBHOOK