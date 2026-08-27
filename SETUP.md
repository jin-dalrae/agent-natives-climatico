# SETUP — use Climatico as a CLI from your laptop, as Orepath

This is the 5-minute setup for an Orepath developer who wants to file
climate writes from the terminal — `orepath brief Houston`, `orepath
fleet SJC 420`, `orepath flag` — without hand-rolling `curl` every time.

The whole thing is a thin wrapper around `climatico/climatico.sh`. Two
new pieces sit in this repo:

- `orepath-work/` — your local config (subject prefix, scopes, base URL, connect target)
- `bin/orepath` — the wrapper that reads `orepath-work/` and forwards to `climatico.sh`

Nothing here requires a custom server, a Cloudflare account, or any new
secrets. The bearer token is the only thing you mint, and you can throw
it away at any time.

---

## 1. Clone the repo

```bash
git clone https://github.com/jin-dalrae/agent-natives-climatico.git
cd agent-natives-climatico
```

`orepath-work/` and `bin/orepath` are already in the repo. You don't
need to author anything.

## 2. Add `bin/` to your PATH (optional)

Without this step, you call `./bin/orepath ...` from the repo root. With
it, you call `orepath ...` from anywhere.

```bash
# pick one
echo 'export PATH="$HOME/agent-natives-climatico/bin:$PATH"' >> ~/.zshrc
# or, per-repo, just run from the repo root
```

## 3. Look at your config

```bash
orepath where
```

This prints the resolved config: repo root, work dir, token status,
base URL, subject prefix, scopes, connect target. Confirm the values
match the example below:

```
Repo root:    /Users/you/agent-natives-climatico
Work dir:     /Users/you/agent-natives-climatico/orepath-work
Config:       /Users/you/agent-natives-climatico/orepath-work/config.yaml
Token file:   /Users/you/agent-natives-climatico/orepath-work/.token (missing — run: orepath mint)
Base URL:     https://climatico.dalrae-jin-work.workers.dev
Climatico:    /Users/you/agent-natives-climatico/climatico/climatico.sh
Subject:      orepath-supply-tracer
Scopes:       ['climatico:read', 'climatico:transact']
Connect dir:  ..
```

## 4. Mint a token

```bash
orepath mint
```

You'll see something like:

```
Minting token for 'orepath-supply-tracer' with scopes ["climatico:read", "climatico:transact"]...
Token saved to /Users/you/.../orepath-work/.token (chmod 600).
Scopes: ['climatico:read', 'climatico:transact']
Ceiling: $50.0

Try: orepath whoami
     orepath fleet SJC 420
     orepath flag
```

The token is saved to `orepath-work/.token` (gitignored, `chmod 600`).
The wrapper exports it as `$CLIMATICO_TOKEN` for every subcommand, so
you never have to copy-paste it again.

To mint a token for a different agent (e.g. a read-only buyer auditor):

```bash
orepath mint orepath-buyer-auditor      # uses subject arg, but scopes still come from config.yaml
# To change scopes too, edit orepath-work/config.yaml and mint again.
```

## 5. Try the loop

```bash
orepath whoami                          # confirms your token is alive
orepath brief "Houston, TX"             # files a grounded brief, or flags with a reason
orepath fleet SJC 420                   # ingest → audit → settle, one call
orepath offset "Oakland port" 2500      # commit a $25 offset
orepath flag                          # test the policy engine: greenwash gets flagged + stored
orepath receipts 5                      # show last 5 receipts (yours + others)
orepath report                          # progress report from the scheduler
orepath handoffs                        # the agent-to-agent handoff log
orepath dashboard                       # one-line summary
orepath memory fleet-runs               # read Cortex memory
orepath orepath                         # status of the on-Worker Orepath employee agent
```

Every command is a real HTTP call against
`https://climatico.dalrae-jin-work.workers.dev`. No mocks. Every write
returns a receipt, every flag is stored.

## 6. Auto-assess your work folder (the privacy-respecting bit)

```bash
orepath connect .. --dry-run
```

This scans the folder for derived signals only:

- `package.json` deps → `kind: cloud, evidence: "wrangler"` etc.
- `wrangler.jsonc` / `wrangler.toml` → `kind: cloud, evidence: "Cloudflare Workers"`
- `README.md` → `kind: logistics, evidence: "README mentions shipping"` etc.
- any other config files for known vendor names (stripe, twilio, ...)

**File contents are never read, never sent.** `--dry-run` shows the
exact JSON payload that would be POSTed to `/v1/connect`. Look at it,
confirm it, then run without `--dry-run` to commit.

Example dry-run output (against this repo):

```
→ 4 files scanned

  ┌─ EXACT PAYLOAD TO BE SENT ─────────────────────────────────┐
  │  Path:    /Users/you/agent-natives-climatico
  │  Signals: 5 derived item(s)
  │  Bytes:   412
  │  ─────
  │  {
  │    "path": "/Users/you/agent-natives-climatico",
  │    "signals": [
  │      { "kind": "cloud", "class": "compute", "evidence": "wrangler", "confidence": 0.8 },
  │      { "kind": "cloud", "class": "compute", "evidence": "Cloudflare Workers", "confidence": 0.9 },
  │      { "kind": "vendor", "class": "saas", "evidence": "stripe", "confidence": 0.75 },
  │      ...
  │    ]
  │  }
  └─────────────────────────────────────────────────────────────┘

(--dry-run: nothing sent. Run without --dry-run to send this payload.)
```

The full `/v1/connect` flow is in `climatico.sh connect` (lines 282-433)
and the privacy disclosure it prints before scanning is in lines 301-328
of that file.

## 7. Where things live

```
orepath-work/                       ← your local config
  config.yaml                       ← subject prefix, scopes, base URL
  .token                            ← minted bearer (chmod 600, gitignored)
  .token.example                    ← template (committed)

bin/orepath                         ← the wrapper (added to $PATH, or run from repo root)
climatico/climatico.sh              ← the actual CLI (all the real logic lives here)
.gitignore                          ← already covers orepath-work/.token
```

## 8. What to do when something breaks

| Symptom | Fix |
|---|---|
| `orepath mint` returns 429 | Too many credential mints. Wait 5 min. |
| `orepath brief` returns `flagged` with `ungrounded` | Climatico couldn't find a Tavily source for that location. Try a more specific location (`"Houston, TX"` beats `"Houston"`). |
| `orepath fleet` returns `over_budget` and commits an offset | Expected — that's the product. The offset is capped at the token's `maxAmountCents` ($50 default). |
| `orepath orepath` says `STOPPED` | The on-Worker Orepath employee agent is paused. Run `orepath agents-start`. |
| Token looks wrong | Delete `orepath-work/.token`, run `orepath mint` again. |

## 9. Honest limits

- This is a real CLI, not a packaged tool. No `brew install`, no `npm i -g`. Just clone and run.
- The token you mint is the only secret. The wrapper does not handle token rotation, refresh, or multi-tenant flows. If you need those, file an issue.
- The connect scan is heuristic. It catches obvious signals (deps, configs, README keywords) but won't replace a real LCA. It's a starting point, not a measurement.
- "Orepath" here is a convention. Nothing ties this folder to a real Orepath account or environment. If you want that, edit `config.yaml` to point `base_url` at your own Worker.
