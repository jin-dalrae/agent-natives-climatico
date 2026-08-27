#!/usr/bin/env bash
# Daily Climate Proof Stream: Auto-publish every committed action to public proof feed
# Runs every day via cron

set -e

dir="$(dirname "$0")"
cd "$dir/.." || exit 1

# Log start
echo "[$(date)] Starting proof stream generation" > logs/proof_stream.log

# Mint a read-only credential, then use it to list receipts.
# GET /v1/receipts requires a bearer token; there is no unauthenticated path.
echo "Minting read-only credential..." >> logs/proof_stream.log
mint_response=$(curl -sS -H "Content-Type: application/json" \
  -X POST https://climatico.dalrae-jin-work.workers.dev/v1/credentials \
  -d '{"subject": "proof-stream-cron", "scopes": ["climatico:read"]}')
token=$(echo "$mint_response" | jq -r '.token')
if [ -z "$token" ] || [ "$token" = "null" ]; then
  echo "Error: failed to mint credential" >> logs/proof_stream.log
  exit 1
fi

echo "Fetching receipts..." >> logs/proof_stream.log
if curl -sS -f -H "Authorization: Bearer $token" \
   https://climatico.dalrae-jin-work.workers.dev/v1/receipts > receipts.json; then
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

# Loop through committed receipts, building one proof object per line (jq -c),
# using only fields the API actually returns. Evidence links are the real
# Tavily source URLs already stored on the receipt, plus our own receipt link
# so the record can be independently checked — never an invented citation.
jq -c '.receipts[] | select(.status == "committed")' receipts.json | while read -r receipt; do
  proof=$(echo "$receipt" | jq \
    --arg selflink "https://climatico.dalrae-jin-work.workers.dev/v1/receipts/" \
    '{
      action: .intent,
      intent: .intent,
      location: .location,
      amountCents: .amountCents,
      evidence: ([.evidence[].url] + [$selflink + .id]),
      createdAt: .createdAt,
      refusal: null
    }')

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

# Writes proofs/live.json locally. Does not commit or push automatically —
# review the diff and commit by hand so nothing reaches origin unreviewed.

# Log final success
echo "[$(date)] Live proof stream generated: proofs/live.json" >> logs/proof_stream.log

# Optional: Notify public feed
# curl -X POST -H "Content-Type: application/json" -d @proofs/live.json https://cotal.ai/api/submit