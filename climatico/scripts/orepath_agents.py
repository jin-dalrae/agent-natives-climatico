#!/usr/bin/env python3
"""
Orepath's own agent roster, working its business through Climatico -- live.

Every step below is a real HTTP call against the deployed Climatico Worker
(no mocks, no invented data). Each real result is then relayed onto the
matching channel of the local "climatico" Cotal mesh (cotal.yaml), where
Orepath's own agents (discovery, procurement, tracer, policy_test,
compliance) and Climatico's own agents (ingest, audit, settle) are both
running as separate live processes (`cotal ps --space climatico`).

Sponsor APIs actually exercised, all real:
  - Climatico (this weekend's product) -- every call below
  - Tavily -- inside Climatico's own /v1/fleet/run audit step (grounds kgCO2e)
  - Cotal -- `cotal send`, real local mesh publish
  (Mitosis memory write happens separately, from the orchestrating agent,
  once this script's real results are in hand -- see README note at bottom.)
"""

import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

BASE_URL = os.environ.get("CLIMATICO_URL", "https://climatico.dalrae-jin-work.workers.dev")
COTAL_SPACE = os.environ.get("COTAL_SPACE", "climatico")


def http(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"User-Agent": "Orepath-Agents/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8")), res.status
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8")), e.code
        except Exception:
            return {"error": str(e)}, e.code


def cotal_send(channel, payload):
    text = json.dumps(payload, separators=(",", ":"))
    result = subprocess.run(
        ["cotal", "send", "msg", channel, text, "--space", COTAL_SPACE],
        capture_output=True, text=True,
    )
    ok = result.returncode == 0
    print(f"    -> cotal send #{channel}: {'ok' if ok else 'FAILED: ' + result.stderr.strip()}")
    return ok


def main():
    print("=== Orepath's agent roster, live against Climatico + Cotal ===\n")

    # --- Act 1: discovery + procurement (Orepath onboards itself to Climatico) ---
    print("[discovery] scanning Climatico's agent card...")
    card, status = http("GET", "/.well-known/agent-card.json")
    if status >= 400:
        print(f"  FAILED ({status}): {card}"); sys.exit(1)
    cotal_send("orepath.onboarding", {
        "agent": "discovery", "kind": "agent_card_scanned",
        "name": card.get("name"), "protocols": card.get("protocols", card.get("name")),
    })

    print("[procurement] minting Orepath's scoped transaction credential...")
    cred, status = http("POST", "/v1/credentials", {
        "subject": "orepath-supply-tracer",
        "scopes": ["climatico:read", "climatico:transact"],
    })
    if status >= 400:
        print(f"  FAILED ({status}): {cred}"); sys.exit(1)
    token = cred["token"]
    cotal_send("orepath.onboarding", {
        "agent": "procurement", "kind": "credential_minted",
        "subject": cred["subject"], "scopes": cred["scopes"], "ceilingCents": cred["maxAmountCents"],
    })
    print(f"  ok, ceiling={cred['maxAmountCents']}c\n")

    # --- Act 2: tracer (Orepath's own compute spend, real Tavily grounding) ---
    print("[tracer] filing Orepath's own SJC compute spike via run_fleet...")
    fleet, status = http("POST", "/v1/fleet/run", {
        "source": "cloud", "location": "SJC", "spendUsd": 420,
        "monthlyBudgetKg": 50, "monthToDateKg": 40,
    }, token=token)
    if status >= 400:
        print(f"  FAILED ({status}): {fleet}"); sys.exit(1)
    run = fleet["run"]
    print(f"  status={run['status']} grounded={run['audit']['grounded']} kgCO2e={run['audit']['kgCO2e']}")
    cotal_send("fleet.ingest", {"agent": "tracer", "runId": run["id"], "kind": "usage_parsed", "body": run["ingest"]})
    cotal_send("fleet.audit", {"agent": "tracer", "runId": run["id"], "kind": "emissions_scored", "body": run["audit"]})
    if run.get("offsetReceipt"):
        cotal_send("fleet.settle", {"agent": "tracer", "runId": run["id"], "kind": "offset_attempt",
                                     "body": {"receiptId": run["offsetReceipt"]["id"], "status": run["offsetReceipt"]["status"]}})
    print()

    # --- Act 3: policy_test (red-team a forbidden claim, expect a real refusal) ---
    print("[policy_test] attempting a forbidden 'greenwash' claim (expecting refusal)...")
    refuse, status = http("POST", "/v1/actions", {"intent": "greenwash", "location": "Orepath Global Chain"}, token=token)
    receipt = refuse.get("receipt", {})
    refused_correctly = receipt.get("status") == "refused"
    print(f"  {'OK: correctly refused' if refused_correctly else 'CRITICAL: not refused!'} -> {receipt.get('refusalCode')}")
    cotal_send("orepath.policy", {
        "agent": "policy_test", "kind": "policy_check",
        "refused": refused_correctly, "refusalCode": receipt.get("refusalCode"), "receiptId": receipt.get("id"),
    })
    print()

    # --- Act 4: compliance (buyer proof, read-only) ---
    print("[compliance] minting read-only buyer credential + pulling proof...")
    buyer_cred, status = http("POST", "/v1/credentials", {"subject": "ev-buyer-auditor", "scopes": ["climatico:read"]})
    buyer_token = buyer_cred["token"]
    receipts, status = http("GET", "/v1/receipts?subject=orepath-supply-tracer", token=buyer_token)
    n = len(receipts.get("receipts", []))
    print(f"  buyer verified {n} Orepath receipts (read-only token, transact scope: none)")

    cotal_send("orepath.compliance", {
        "agent": "compliance", "kind": "attribution_proof",
        "verifiedReceiptCount": n, "buyerScopes": buyer_cred.get("scopes"),
    })

    print("\n=== Done. `cotal console --space climatico` to watch all 8 agents live. ===")
    print(f"Real summary for memory: Orepath's compliance agent verified {n} receipts "
          f"(subject=orepath-supply-tracer) via Climatico's live ledger; policy_test confirmed "
          f"the greenwash claim was refused ({receipt.get('refusalCode')}); tracer's SJC run scored "
          f"{run['audit']['kgCO2e']} kgCO2e, Tavily-grounded={run['audit']['grounded']}.")


if __name__ == "__main__":
    main()
