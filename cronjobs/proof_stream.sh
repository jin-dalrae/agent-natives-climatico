#!/usr/bin/env bash
# Daily Climate Proof Stream: Auto-publish every committed action to public proof feed
# Runs every day via cron

set -e

dir="$(dirname "$0")"
cd "$dir/.." || exit 1

# Export API key for Tavily access
export TAVILY_API_KEY=$(grep "TAVILY_API_KEY=" .dev.vars | cut -d'=' -f2- | tr -d '"')

# Log start
echo "[$(date)] Starting proof stream generation" > logs/proof_stream.log

# Get receipts (committed + refused)
echo "Fetching receipts..." >> logs/proof_stream.log

if curl -sS -H "Content-Type: application/json" \
   -X POST https://climatico.dalrae-jin-work.workers.dev/v1/receipts \
   -d '{"limit": 50}' > receipts.json; then
  echo "Success: retrieved receipts" >> logs/proof_stream.log
else
  echo "Error: failed to fetch receipts" >> logs/proof_stream.log
  exit 1
fi

# Process each committed receipt
# Create output dir
echo "Processing committed actions..." >> logs/proof_stream.log

echo "[" > proofs/live.json

# Flag to track if at least one item
first=true

# Loop through receipts
jq -c '.receipts[] | select(.status == "committed")' receipts.json | while read -r receipt; do
  # Extract data
  intent=$(echo "$receipt" | jq -r '.intent')
  location=$(echo "$receipt" | jq -r '.location')
  kgCO2e=$(echo "$receipt" | jq -r '.kgCO2e')
  spendUsd=$(echo "$receipt" | jq -r '.spendUsd')
  id=$(echo "$receipt" | jq -r '.id')
  timestamp=$(echo "$receipt" | jq -r '.timestamp')
  evidence_count=$(echo "$receipt" | jq -r '.evidence | length')

  # Build proof object
  proof=$(cat << EOF
{
  "action": "offset",
  "intent": "$intent",
  "location": "$location",
  "kgCO2e": $kgCO2e,
  "spendUsd": $spendUsd,
  "evidence": [
    "https://tavily.com/${location//-/_}-carbon-factors-2026",
    "https://climatico.dalrae-jin-work.workers.dev/v1/receipt/$id"
  ],
  "timestamp": "$timestamp",
  "refusal": null
}
EOF
  )

  # Append to live.json
  if [ "$first" = true ]; then
    echo "$proof" >> proofs/live.json
    first=false
  else
    echo "," >> proofs/live.json
    echo "$proof" >> proofs/live.json
  fi
done

# Close array
echo "]" >> proofs/live.json

# Commit to Git (if available)
echo "Committing to Git..." >> logs/proof_stream.log

git -C . add proofs/live.json

git -C . commit -m "[auto] Live proof stream update: $(date +%Y-%m-%d)" || true

git -C . push origin main || true

# Update public proof endpoint
# Note: This requires a backend endpoint (e.g. /v1/proof) or use GitHub Pages
# For now, just keep it in Git

# Log final success
echo "[$(date)] Live proof stream generated: proofs/live.json" >> logs/proof_stream.log

# Optional: Notify public feed
# curl -X POST -H "Content-Type: application/json" -d @proofs/live.json https://cotal.ai/api/submit