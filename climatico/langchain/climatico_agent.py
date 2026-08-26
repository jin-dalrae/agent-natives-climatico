"""LangChain caller for Climatico. The graph lives on the Worker; this is the peer.

  pip install langchain-core langgraph httpx
  export CLIMATICO_URL=http://127.0.0.1:5173
  python climatico_agent.py
"""

from __future__ import annotations

import json
import os

import httpx
from langchain_core.tools import tool

BASE = os.environ.get("CLIMATICO_URL", "http://127.0.0.1:8787").rstrip("/")


def _client() -> httpx.Client:
    return httpx.Client(timeout=30.0)


def mint_token(subject: str = "langchain-peer") -> str:
    with _client() as client:
        res = client.post(
            f"{BASE}/v1/credentials",
            json={"subject": subject, "scopes": ["climatico:read", "climatico:transact"]},
        )
        res.raise_for_status()
        return res.json()["token"]


TOKEN = os.environ.get("CLIMATICO_TOKEN") or mint_token()


@tool
def complete_action(intent: str, location: str, amount_cents: int | None = None, note: str = "") -> str:
    """Commit a Climatico climate action. intent is brief|watch|offset|assess."""
    payload: dict = {"intent": intent, "location": location, "note": note or None}
    if amount_cents is not None:
        payload["amountCents"] = amount_cents
    with _client() as client:
        res = client.post(
            f"{BASE}/v1/actions",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json=payload,
        )
        return json.dumps(res.json(), indent=2)


@tool
def list_receipts() -> str:
    """List recent Climatico receipts, including refusals."""
    with _client() as client:
        res = client.get(
            f"{BASE}/v1/receipts",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        return json.dumps(res.json(), indent=2)


if __name__ == "__main__":
    print(complete_action.invoke({"intent": "brief", "location": "Houston, TX"}))
    print(complete_action.invoke({"intent": "greenwash", "location": "everywhere"}))
    print(list_receipts.invoke({}))
