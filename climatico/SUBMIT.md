# Submit early (BUILD phase — overwrite until Thursday 15:00)

Event id: `anb-hack-01`  
MCP: `https://www.immersivecommons.com/api/mcp`  
Token first: `npx -y @immersivecommons/cli auth --scopes hack:read,hack:register,hack:team,hack:submit,keys:request`

`ic_hack_submit` — the field that scores the 30-point band is **agent_surface**, not the climate pitch.

```json
{
  "eid": "anb-hack-01",
  "title": "Climatico",
  "blurb": "A climate emissions tracker that AI agents can submit data to directly. An unfamiliar agent finds /ai-agent.json, gets an authentication token, and submits a write. Internally, cloud spend is ingested, audited, and settled, leaving a permanent record at each step (Cotal-compatible). Rejected submissions are recorded too.",
  "repo_url": "https://github.com/jin-dalrae/agent-natives-climatico",
  "demo_url": "https://climatico.dalrae-jin-work.workers.dev",
  "agent_surface": "ai-agent.json, MCP /mcp, A2A /.well-known/agent-card.json, machine auth POST /v1/credentials (scopes freeze at mint), fleet handoffs /v1/handoffs. Internal: ingest→audit→settle across Tavily evidence + Durable Object ledger."
}
```

Track to declare in the build plan: **Internal** (coordination + work across Tavily). Cold-start files still exist so a probe of the domain finds MCP/A2A.

Do not describe carbon accounting in `agent_surface`. Name the files.

Cotal $300 = best **use of Cotal**, not first place. After submit: `cotal up -f cotal.yaml` or join https://hack.cotal.ai (David + Sven). Optional `COTAL_WEBHOOK_URL` mirrors each handoff onto the mesh.

Runtype $500 = build **on Runtype**, not a mention in the README. Skip unless you actually deploy a Runtype flow.
