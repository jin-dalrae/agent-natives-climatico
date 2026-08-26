export function agentCard(origin: string) {
  return {
    name: "Climatico",
    description:
      "Agent-native climate action desk. A stranger agent discovers this card, mints a scoped credential, and commits a real climate action (brief, watch, offset, or assess) against a place. Refusals are first-class receipts.",
    url: `${origin}/a2a`,
    version: "0.1.0",
    protocolVersion: "0.3.0",
    provider: {
      organization: "Climatico",
      url: origin,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: "complete_action",
        name: "Complete a climate action",
        description:
          "Commit brief | watch | offset | assess for a location. Requires a bearer token with climatico:transact. Returns a durable receipt, including refusals.",
        tags: ["climate", "transact", "receipt"],
        examples: [
          "File a climate brief for Houston",
          "Open a heat watch on Lahaina",
          "Commit a $25 offset for Oakland port",
        ],
      },
      {
        id: "run_fleet",
        name: "Run the carbon fleet",
        description:
          "Internal orchestration: ingest a usage spike, audit kgCO2e against a monthly budget, settle an offset if over. Durable handoffs on fleet.ingest / fleet.audit / fleet.settle. POST /v1/fleet/run or MCP run_fleet.",
        tags: ["climate", "coordination", "fleet"],
        examples: [
          "Cloud spend in SJC jumped $420 — ingest, audit, offset if over budget",
        ],
      },
      {
        id: "mint_credential",
        name: "Mint a scoped credential",
        description: `POST ${origin}/v1/credentials with { subject, scopes }. Scopes freeze at mint.`,
        tags: ["auth"],
        examples: ["Mint climatico:transact for a cold-start agent"],
      },
    ],
    authentication: { schemes: ["bearer"] },
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer", bearerFormat: "Climatico" },
    },
    security: [{ bearer: [] }],
    mcp: `${origin}/mcp`,
    credentials: `${origin}/v1/credentials`,
    policy: `${origin}/v1/policy`,
    fleet: `${origin}/v1/fleet/run`,
    handoffs: `${origin}/v1/handoffs`,
  };
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["climatico:read", "climatico:transact", "climatico:admin"],
    resource_documentation: `${origin}/.well-known/agent-card.json`,
  };
}

/** Immersive Commons product probe looks for this filename. */
export function aiAgentJson(origin: string) {
  return {
    name: "Climatico",
    description:
      "Climate action desk. Discover, mint a scoped bearer, complete a write. Fleet: ingest → audit → settle with durable handoffs.",
    version: "0.1.0",
    url: origin,
    mcp: `${origin}/mcp`,
    a2a: `${origin}/a2a`,
    agentCard: `${origin}/.well-known/agent-card.json`,
    credentials: `${origin}/v1/credentials`,
    auth: {
      type: "http",
      scheme: "bearer",
      mint: `${origin}/v1/credentials`,
      scopes_freeze_at_mint: true,
      scopes: ["climatico:read", "climatico:transact", "climatico:admin"],
    },
    payments: {
      kind: "machine_ledger",
      note: "Offsets settle on the Durable Object ledger. AIsa is optional if credits are applied.",
      endpoint: `${origin}/v1/actions`,
    },
    tools: [
      "discover_climatico",
      "complete_action",
      "run_fleet",
      "get_receipt",
      "list_receipts",
      "list_handoffs",
      "whoami",
      "get_policy",
    ],
  };
}

export function mcpServerCard(origin: string) {
  return {
    name: "climatico",
    description: "Authenticated write MCP for climate actions and the ingest-audit-settle fleet.",
    version: "0.1.0",
    endpoint: `${origin}/mcp`,
    transport: "streamable-http",
    authentication: { type: "bearer" },
  };
}

export function robotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    `Agentmap: ${origin}/.well-known/ai-catalog.json`,
    `Sitemap: ${origin}/ai-agent.json`,
    "",
  ].join("\n");
}

export function aiCatalog(origin: string) {
  return {
    specVersion: "1.0",
    host: {
      displayName: "Climatico",
      identifier: origin.replace(/^https?:\/\//, ""),
      documentationUrl: `${origin}/ai-agent.json`,
    },
    entries: [
      {
        identifier: `urn:ai:climatico:mcp`,
        displayName: "Climatico MCP",
        type: "application/mcp-server+json",
        url: `${origin}/.well-known/mcp.json`,
        description: "Write tools: complete_action, run_fleet.",
        tags: ["climate", "mcp", "transact"],
      },
      {
        identifier: `urn:ai:climatico:a2a`,
        displayName: "Climatico A2A",
        type: "application/a2a+json",
        url: `${origin}/.well-known/agent-card.json`,
        description: "Agent Card and SendMessage.",
        tags: ["climate", "a2a"],
      },
    ],
  };
}
