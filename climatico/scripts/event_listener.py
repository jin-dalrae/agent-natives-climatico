from climatico.src.mcp import mcp_handler
from climatico.src.ledger import getLedger
import asyncio
import json
from datetime import datetime

async def handle_cloud_purchase(event):
    """
    Handle real-time cloud purchase events for carbon impact analysis.
    """
    # 1. Extract event data
    region = event.get("region", "SJC")
    spend_usd = event.get("spend_usd", 0)
    source = event.get("source", "cloud")
    
    # 2. Initialize ledger
    ledger = await getLedger({})
    
    # 3. Perform research
    # a) Query carbon intensity
    carbon_intensities = {
        "SJC": 43.25,  # kgCO2e per $1
        "SF": 41.10,
        "NYC": 15.60,
        "LAX": 44.80
    }
    
    # b) Get real-time grid data
    try:
        response = await mcp_handler({"event": "tavily"}, {"subject": "hermes", "scopes": ["climatico:research"]})
        grid_data = json.loads(response["content"])
        current_rate = grid_data.get("carbon_intensity_kg_per_dollar", 43.25)
    except Exception as e:
        print(f"Research failed: {e}")
        current_rate = carbon_intensities.get(region, 43.25)
    
    # 4. Calculate impact
    impact_kg = spend_usd * current_rate
    print(f"Estimated impact: {impact_kg:.1f} kgCO2e")
    
    # 5. Research alternatives
    alternatives = {
        "air_freight": {
            "kgCO2e": 31000,
            "cost_usd": 12000,
            "suggestion": "Use air freight for urgent shipments only"
        },
        "truck_freight": {
            "kgCO2e": 14000,
            "cost_usd": 8500,
            "suggestion": "Use truck for domestic freight under 500 miles"
        },
        "rail_intermodal": {
            "kgCO2e": 8000,
            "cost_usd": 9200,
            "suggestion": "Recommended: rail intermodal (50% less emissions than air)"
        }
    }
    
    # 6. Generate comparison graph
    from climatico.scripts.generate_comparative_graph import generate_comparative_graph
    freight_options = [
        {"type": k, "kgCO2e": v["kgCO2e"], "cost_usd": v["cost_usd"]} 
        for k, v in alternatives.items()
    ]
    
    graph_file, metadata = generate_comparative_graph(freight_options)
    
    # 7. Decision
    best_option = min(alternatives.values(), key=lambda x: x["kgCO2e"])
    
    # 8. Prepare evidence
    evidence = {
        "carbon_intensity_kg_per_dollar": current_rate,
        "impact_kgCO2e": impact_kg,
        "alternatives": alternatives,
        "graph_url": graph_file,
        "comparison": metadata["comparison"],
        "source": "carbon_calculator"
    }
    
    # 9. Decision logic
    max_budget = 10000  # kgCO2e
    if impact_kg > max_budget:
        # Refusal with AI suggestions
        refusal_reason = f"Exceeds carbon budget ({impact_kg:.1f} > {max_budget})."
        suggestion = best_option["suggestion"]
        return {
            "ok": False,
            "refused": True,
            "reason": refusal_reason,
            "suggestion": suggestion,
            "evidence": evidence
        }
    else:
        # Commit action
        response = await ledger.runAction(
            {
                "intent": "brief",
                "location": region,
                "amountCents": int(spend_usd * 100),
                "note": f"Cloud purchase: ${spend_usd:,.2f} in {region}",
                "idempotencyKey": f"cloud_{datetime.now().timestamp()}"
            },
            {"subject": "hermes", "scopes": ["climatico:transact"]}
        )
        
        return {
            "ok": True,
            "refused": False,
            "receipt": response["receipt"],
            "evidence": evidence
        }

# Example usage
if __name__ == "__main__":
    example_event = {
        "region": "SJC",
        "spend_usd": 420,
        "source": "cloud"
    }
    
    result = asyncio.run(handle_cloud_purchase(example_event))
    print(json.dumps(result, indent=2))
