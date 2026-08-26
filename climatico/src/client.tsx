import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "./styles.css";

type Receipt = {
  id: string;
  intent: string;
  location: string | null;
  amountCents: number | null;
  status: "committed" | "refused";
  refusalCode: string | null;
  refusalReason: string | null;
  evidence: Array<{ title: string; url: string; snippet: string }>;
};

type Dashboard = {
  committed: number;
  refused: number;
  watches: number;
  lastReceiptId: string | null;
  fleetRuns?: number;
  lastFleetRunId?: string | null;
};

function App() {
  const [card, setCard] = useState<unknown>(null);
  const [token, setToken] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [intent, setIntent] = useState("brief");
  const [location, setLocation] = useState("Houston, TX");
  const [amountCents, setAmountCents] = useState(2500);
  const [log, setLog] = useState("Cold-start path:\n1. GET /.well-known/agent-card.json\n2. POST /v1/credentials\n3. POST /v1/actions with the bearer token\n");

  async function load() {
    const [c, d] = await Promise.all([
      fetch("/.well-known/agent-card.json").then((r) => r.json() as Promise<unknown>),
      fetch("/v1/dashboard").then((r) => r.json() as Promise<Dashboard>),
    ]);
    setCard(c);
    setDashboard(d);
  }

  useEffect(() => {
    void load();
  }, []);

  async function mint() {
    const res = await fetch("/v1/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "demo-agent",
        scopes: ["climatico:read", "climatico:transact"],
      }),
    });
    const body = (await res.json()) as { token?: string };
    setToken(body.token ?? "");
    setLog(JSON.stringify(body, null, 2));
  }

  async function act(nextIntent = intent, extra: Record<string, unknown> = {}) {
    const res = await fetch("/v1/actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: nextIntent,
        location,
        amountCents: nextIntent === "offset" ? amountCents : undefined,
        ...extra,
      }),
    });
    const body = (await res.json()) as { receipt?: Receipt; error?: string; error_description?: string };
    setLog(JSON.stringify(body, null, 2));
    await load();
  }

  async function fleet(spike: boolean) {
    const res = await fetch("/v1/fleet/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        source: "cloud",
        location,
        spendUsd: spike ? 420 : 12,
        monthlyBudgetKg: 50,
        monthToDateKg: 40,
      }),
    });
    const body: unknown = await res.json();
    setLog(JSON.stringify(body, null, 2));
    await load();
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="eyebrow">Agent Natives · Internal track · fleet</div>
          <h1>Climatico</h1>
          <p className="lede">
            Ingest → audit → settle. Usage spikes become durable handoffs and, if the
            monthly carbon budget breaks, a real offset receipt. Cold-start writes still
            work for a stranger agent.
          </p>
        </div>
        <div className="stats">
          <div>
            <b>{dashboard?.committed ?? 0}</b>
            committed
          </div>
          <div>
            <b>{dashboard?.refused ?? 0}</b>
            refused
          </div>
          <div>
            <b>{dashboard?.watches ?? 0}</b>
            watches
          </div>
          <div>
            <b>{dashboard?.fleetRuns ?? 0}</b>
            fleet runs
          </div>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <h2>File an action</h2>
          <label>Intent</label>
          <select value={intent} onChange={(e) => setIntent(e.target.value)}>
            <option value="brief">brief — grounded climate note</option>
            <option value="watch">watch — persist a place</option>
            <option value="offset">offset — commit cents</option>
            <option value="assess">assess — site risk file</option>
          </select>
          <label>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
          {intent === "offset" ? (
            <>
              <label>Amount (cents)</label>
              <input
                type="number"
                value={amountCents}
                onChange={(e) => setAmountCents(Number(e.target.value))}
              />
            </>
          ) : null}
          <div className="row">
            <button className="ghost" type="button" onClick={() => void mint()}>
              1. Mint credential
            </button>
            <button type="button" onClick={() => void act()} disabled={!token}>
              2. Commit write
            </button>
            <button
              className="danger"
              type="button"
              onClick={() => void act("greenwash")}
              disabled={!token}
            >
              Try a refusal
            </button>
            <button className="ghost" type="button" onClick={() => void fleet(false)} disabled={!token}>
              Fleet: in budget
            </button>
            <button type="button" onClick={() => void fleet(true)} disabled={!token}>
              Fleet: spend spike
            </button>
          </div>
          <p className="lede" style={{ marginTop: 14 }}>
            Token {token ? <span className="pill ok">present</span> : <span className="pill no">missing</span>}
            {dashboard?.lastReceiptId ? ` · last ${dashboard.lastReceiptId.slice(0, 8)}` : ""}
          </p>
        </section>
        <section className="card">
          <h2>Receipt</h2>
          <pre>{log}</pre>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Agent card</h2>
        <pre>{JSON.stringify(card, null, 2)}</pre>
      </section>

      <p className="hosts">
        <strong>Host, not sponsor:</strong> Cloudflare (Workers, Durable Objects, Agents SDK, remote MCP).{" "}
        <strong>Organised by</strong> Immersive Commons, Runtype, Cotal, Nebius.{" "}
        <strong>Live evidence:</strong> Tavily. Scopes freeze at mint, Immersive Commons style.
      </p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
