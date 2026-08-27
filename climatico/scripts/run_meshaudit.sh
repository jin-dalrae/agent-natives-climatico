#!/usr/bin/env bash
# Launch the meshaudit resident agent on the Cotal mesh with Nebius env wired.
# Reads NEBIUS_API_KEY from climatico/.dev.vars without printing it.
set -e
cd "$(dirname "$0")/.."

if [ -f .dev.vars ]; then
  export NEBIUS_API_KEY=$(sed -n 's/^NEBIUS_API_KEY=//p' .dev.vars | tr -d '"' | tr -d "'")
fi
: "${NEBIUS_BASE_URL:=https://api.tokenfactory.nebius.com/v1}"
export NEBIUS_BASE_URL
export HERMES_MODEL="${HERMES_MODEL:-custom:nebius:deepseek-ai/DeepSeek-V4-Flash}"

echo "[runner] launching cotal spawn meshaudit (model=$HERMES_MODEL)"
exec cotal spawn meshaudit --agent hermes --allow-publish team.climatico
