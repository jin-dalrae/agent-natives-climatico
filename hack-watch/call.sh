#!/bin/bash
# call.sh <tool> <json-args>  — one MCP tool call with the stored token
cd "$(dirname "$0")" || exit 1
TOKEN=$(cat .ic_token)
curl -s -X POST https://www.immersivecommons.com/api/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":${2:-\{\}}}}" \
| sed -n 's/^data: //p' \
| python3 -c "
import sys,json
for line in sys.stdin:
    line=line.strip()
    if not line.startswith('{'): continue
    d=json.loads(line)
    if 'error' in d: print(json.dumps(d['error'],indent=1)); break
    for c in d.get('result',{}).get('content',[]):
        t=c.get('text','')
        try: print(json.dumps(json.loads(t),indent=1))
        except Exception: print(t)
"
