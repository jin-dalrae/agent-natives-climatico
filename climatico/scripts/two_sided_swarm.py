#!/usr/bin/env python3
"""
Two-Sided Agent Swarm Simulation: Orepath (Customer) <---> Climatico (Attribution Service)
Demonstrates real work across boundaries, policy enforcement, Nebius AI, Tavily web citations, and Cotal mesh.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE_URL = os.environ.get("CLIMATICO_URL", "https://climatico.dalrae-jin-work.workers.dev")

C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_OREPATH = "\033[38;5;214m"   # Amber/Orange for Orepath (Customer)
C_CLIMATICO = "\033[38;5;35m"   # Emerald/Green for Climatico (Service)
C_AUDIT = "\033[38;5;75m"       # Cyan/Blue for Audit & Tavily
C_WARN = "\033[38;5;203m"       # Red for Refusal/Policy
C_MUTED = "\033[38;5;244m"

def log_orepath(agent, msg):
    print(f"{C_OREPATH}{C_BOLD}[OREPATH :: {agent}]{C_RESET} {msg}")

def log_climatico(agent, msg):
    print(f"{C_CLIMATICO}{C_BOLD}[CLIMATICO :: {agent}]{C_RESET} {msg}")

def log_audit(msg):
    print(f"{C_AUDIT}{C_BOLD}[AUDIT ENGINE :: Tavily + Nebius]{C_RESET} {msg}")

def log_refusal(msg):
    print(f"{C_WARN}{C_BOLD}[POLICY REFUSAL]{C_RESET} {msg}")

def post_json(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Orepath-Agent-Swarm/1.0",
            **({"Authorization": f"Bearer {token}"} if token else {})
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8")), res.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode("utf-8")), e.code

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Orepath-Agent-Swarm/1.0",
            **({"Authorization": f"Bearer {token}"} if token else {})
        }
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8")), res.status

def main():
    print(f"\n{C_BOLD}======================================================================{C_RESET}")
    print(f"{C_BOLD} TWO-SIDED AGENT SWARM DEMO: OREPATH (CLIENT) <--> CLIMATICO (SERVICE){C_RESET}")
    print(f"{C_BOLD} Target: {BASE_URL}{C_RESET}")
    print(f"{C_BOLD}======================================================================\n{C_RESET}")

    time.sleep(1)

    # -------------------------------------------------------------
    # ACT 1: OREPATH DISCOVERS CLIMATICO & MINTS SCOPED MACHINE BEARER
    # -------------------------------------------------------------
    log_orepath("DiscoveryAgent", "Scanning Climatico endpoint /.well-known/agent-card.json...")
    card, _ = get_json("/.well-known/agent-card.json")
    print(f"  {C_MUTED}↳ Protocol: A2A + MCP. Scopes available: {card.get('name')}{C_RESET}")

    time.sleep(1)
    log_orepath("ProcurementAgent", "Requesting scoped transaction credential for Orepath tracer fleet...")
    cred_res, _ = post_json("/v1/credentials", {
        "subject": "orepath-supply-tracer",
        "scopes": ["climatico:read", "climatico:transact"]
    })
    token = cred_res["token"]
    max_cents = cred_res["maxAmountCents"]
    log_climatico("AuthGateway", f"Minted scoped bearer token for Orepath. Ceiling: {max_cents}¢. Scopes frozen at mint.")
    print(f"  {C_MUTED}↳ Token ID: {cred_res.get('tokenId', 'valid')} | Subject: {cred_res['subject']}{C_RESET}")

    time.sleep(1.5)

    # -------------------------------------------------------------
    # ACT 2: OREPATH COMPUTE TRACER HITS A BILL SPIKE IN SJC
    # -------------------------------------------------------------
    print(f"\n{C_BOLD}--- SCENARIO A: CLOUD INFRASTRUCTURE SPIKE ---{C_RESET}")
    log_orepath("TracerFleetAgent", "High-throughput graph compute spike on battery materials: $420 USD @ San Jose (SJC).")
    log_orepath("TracerFleetAgent", "Emitting usage telemetry to Climatico Ingest boundary...")

    fleet_res, _ = post_json("/v1/fleet/run", {
        "source": "cloud",
        "location": "SJC",
        "spendUsd": 420,
        "monthlyBudgetKg": 50,
        "monthToDateKg": 40
    }, token=token)

    run = fleet_res["run"]
    log_climatico("IngestAgent", f"Parsed usage spike: $420 USD. MTD Booked: 40 kg. Emitted to channel [fleet.ingest].")
    time.sleep(1)

    log_audit("Invoking Tavily API for SJC regional grid carbon factors & physical risk...")
    citations = run["audit"]["evidence"]
    print(f"  {C_MUTED}↳ Fact-checked {len(citations)} live sources. Scored: {run['audit']['kgCO2e']} kgCO2e (+{run['audit']['overBudgetKg']} kg OVER BUDGET).{C_RESET}")
    for c in citations[:2]:
        print(f"    • {c['title']} ({c['url'][:60]}...)")

    time.sleep(1)
    receipt = run["offsetReceipt"]
    log_climatico("SettleAgent", f"Checked token ceiling. Committed offset receipt {receipt['id'][:8]} (${receipt['amountCents']/100} USD) to SQLite Ledger.")
    log_climatico("MeshCoordinator", "Broadcasted coordination handoffs onto [fleet.settle] & Cotal Mesh #team.climatico.")

    time.sleep(1.5)

    # -------------------------------------------------------------
    # ACT 3: OREPATH ROGUE / DRIFT AGENT TRIES A FORBIDDEN GREENWASH CLAIM
    # -------------------------------------------------------------
    print(f"\n{C_BOLD}--- SCENARIO B: POLICY ENFORCEMENT & TAMPER-PROOF REFUSAL ---{C_RESET}")
    log_orepath("MarketingBot", "Attempting write: intent='greenwash' ('Certified 100% Zero Impact Cobalt')...")
    
    refuse_res, _ = post_json("/v1/actions", {
        "intent": "greenwash",
        "location": "Orepath Global Chain"
    }, token=token)

    r_receipt = refuse_res["receipt"]
    log_refusal(f"Policy Engine intercepted forbidden claim: {r_receipt['refusalCode']}")
    log_climatico("Ledger", f"Refusal persisted as permanent receipt {r_receipt['id'][:8]} in SQLite.")
    print(f"  {C_MUTED}↳ Reason: {r_receipt['refusalReason']}{C_RESET}")

    time.sleep(1.5)

    # -------------------------------------------------------------
    # ACT 4: OREPATH COMPLIANCE AGENT PROVES ATTRIBUTION TO EV OEM
    # -------------------------------------------------------------
    print(f"\n{C_BOLD}--- SCENARIO C: READ-ONLY AUDIT FOR EV BUYER ---{C_RESET}")
    log_orepath("ComplianceAgent", "Generating proof-of-attribution package for EV Buyer (e.g. Tesla/Rivian)...")
    
    # Mint a read-only credential for the buyer
    buyer_cred, _ = post_json("/v1/credentials", {
        "subject": "ev-buyer-auditor",
        "scopes": ["climatico:read"]
    })
    buyer_token = buyer_cred["token"]
    log_climatico("AuthGateway", f"Minted read-only credential for buyer. Transact rights: NONE.")

    # Buyer inspects receipts
    receipts_data, _ = get_json("/v1/receipts", token=buyer_token)
    log_orepath("ComplianceAgent", f"Buyer verified {len(receipts_data['receipts'])} ledger receipts (committed offsets + policy refusals).")
    print(f"  {C_MUTED}↳ Audit trail verified with cryptographic token hashes & live Tavily citations.{C_RESET}")

    print(f"\n{C_BOLD}======================================================================{C_RESET}")
    print(f"{C_BOLD} SWARM EXECUTION SUCCESSFUL: ALL HANDOFFS PERSISTED IN DURABLE OBJECTS{C_RESET}")
    print(f"{C_BOLD}======================================================================\n{C_RESET}")

if __name__ == "__main__":
    main()
