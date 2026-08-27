import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { EmissionClass, FounderStory, InboxMessage, SponsorLink, WorkspaceView } from "./insights";
import { OREPATH, OREPATH_GROWTH } from "./insights";
import type { FleetRun, Handoff, Receipt } from "./types";
import "./styles.css";

type Tab = "assess" | "grow" | "pipeline" | "swarm" | "impact" | "ledger" | "inbox" | "agent" | "onboard" | "stack";
const TABS: { id: Tab; label: string }[] = [
  { id: "assess", label: "Assess" },
  { id: "grow", label: "Grow" },
  { id: "pipeline", label: "Fleet Pipeline" },
  { id: "swarm", label: "3-Sided Swarm" },
  { id: "impact", label: "Impact & Abate" },
  { id: "ledger", label: "Ledger & Receipts" },
  { id: "inbox", label: "Inbox" },
  { id: "agent", label: "Agent Clerk" },
  { id: "onboard", label: "Onboard" },
  { id: "stack", label: "Sponsor Stack" },
];

function tabFromUrl(): Tab {
  const value = new URLSearchParams(window.location.search).get("tab");
  return TABS.some((t) => t.id === value) ? (value as Tab) : "assess";
}

function fromDeck(): boolean {
  return new URLSearchParams(window.location.search).get("from") === "deck";
}

function SponsorPills({
  tavilyKey,
  cotalWebhook,
  nebiusKey,
}: {
  tavilyKey?: boolean;
  cotalWebhook?: boolean;
  nebiusKey?: boolean;
}) {
  return (
    <div className="sponsor-matrix">
      <div className="sponsor-badge live">
        <span className="dot ok" />
        <strong>Cloudflare</strong>
        <span className="sub">Workers + DO SQLite</span>
      </div>
      <div className={`sponsor-badge ${tavilyKey ? "live" : "wa"}`}>
        <span className={`dot ${tavilyKey ? "ok" : "wa"}`} />
        <strong>Tavily</strong>
        <span className="sub">{tavilyKey ? "Keyed Grounding (26HACK)" : "Keyless Search"}</span>
      </div>
      <div className="sponsor-badge live">
        <span className="dot ok" />
        <strong>Cotal Mesh</strong>
        <span className="sub">#team.climatico</span>
      </div>
      <div className={`sponsor-badge ${nebiusKey ? "live" : "info"}`}>
        <span className={`dot ${nebiusKey ? "ok" : "info"}`} />
        <strong>Nebius AI</strong>
        <span className="sub">{nebiusKey ? "Studio API (Llama 3.3 70B)" : "GPU Cloud"}</span>
      </div>
      <div className="sponsor-badge info">
        <span className="dot info" />
        <strong>AIsa & Runtype</strong>
        <span className="sub">M2M Rail & Evals</span>
      </div>
    </div>
  );
}

function InboxList({ items }: { items: InboxMessage[] }) {
  if (!items.length) {
    return <p className="lede">No messages yet. Mint a credential and run a spend spike.</p>;
  }
  return (
    <div className="msg-list">
      {items.map((m) => (
        <article className="msg" key={m.id}>
          <div className="msg-meta">
            <span className={`chip ${m.tone}`}>{m.from}</span>
            <span className="channel-tag">{m.channel}</span>
            <span className="timestamp">{new Date(m.createdAt).toLocaleTimeString()}</span>
          </div>
          <h3>{m.title}</h3>
          <p>{m.body}</p>
          <p className="how">
            <b>Next: </b>
            {m.action}
          </p>
        </article>
      ))}
    </div>
  );
}

const GROUNDABLE_CLASS_IDS = new Set([
  "hardware",
  "travel",
  "saas",
  "logistics",
  "electricity",
  "direct",
]);

function Hotspots({
  classes,
  hotId,
  onGround,
  busy,
}: {
  classes: EmissionClass[];
  hotId?: string;
  onGround?: (classId: string) => void;
  busy?: boolean;
}) {
  const max = Math.max(...classes.map((c) => c.modeledT), 1);
  return (
    <div className="hotspots-grid">
      {classes.map((c) => (
        <div
          className={`hotspot ${c.status === "live" ? "live" : ""} ${c.id === hotId ? "story" : ""}`}
          key={c.id}
        >
          <div className="hotspot-head">
            <div>
              <strong>{c.name}</strong>
              <div className="scope">{c.scope}</div>
            </div>
            <span className="tonnage">
              <b>{c.modeledT} t</b> <span className="unc">±{c.uncertaintyPct}%</span>{" "}
              <span className={`chip ${c.status === "live" ? "ok" : "wa"}`}>{c.status.toUpperCase()}</span>
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.round((c.modeledT / max) * 100)}%` }} />
          </div>
          <div className="standard-cite">
            <span>{c.restsOn}</span>
          </div>
          {c.liveNote ? <div className="live-pill">⚡ {c.liveNote}</div> : null}
          {c.status === "modeled" && onGround && GROUNDABLE_CLASS_IDS.has(c.id) ? (
            <button type="button" className="ghost" disabled={busy} onClick={() => onGround(c.id)}>
              Ground with Tavily
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PipelineView({
  runs,
  handoffs,
  onRunFleet,
  busy,
  location,
}: {
  runs: FleetRun[];
  handoffs: Handoff[];
  onRunFleet: (spend: number, budget: number, mtd: number) => void;
  busy: boolean;
  location: string;
}) {
  const lastRun = runs[0] ?? null;
  const [selectedRunId, setSelectedRunId] = useState<string | null>(lastRun?.id ?? null);
  const activeRun = runs.find((r) => r.id === (selectedRunId || lastRun?.id)) ?? lastRun;

  return (
    <div className="pipeline-container">
      <div className="pipeline-header card">
        <div className="pipeline-intro">
          <span className="kicker">Fleet</span>
          <h3>Turn a spend spike into a receipt</h3>
          <p className="lede">
            One click runs three steps: ingest reads the spend and location, audit scores it and cites real
            sources, settle writes an offset receipt if the month is over budget. Every step is saved.
          </p>
        </div>
        <div className="pipeline-controls">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => onRunFleet(420, 50, 40)}
          >
            {busy ? "Running Fleet…" : `Trigger $420 Cloud Spike @ ${location}`}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => onRunFleet(15, 50, 20)}
          >
            Trigger In-Budget $15 Spike
          </button>
        </div>
      </div>

      {activeRun ? (
        <div className="pipeline-flow card">
          <div className="flow-meta">
            <span className="chip ok">RUN: {activeRun.id.slice(0, 8)}</span>
            <span>Status: <b>{activeRun.status.toUpperCase()}</b></span>
            <span>Location: <b>{activeRun.ingest.location}</b></span>
            <span>Created: {new Date(activeRun.createdAt).toLocaleTimeString()}</span>
          </div>

          <div className="pipeline-stages">
            {/* STAGE 1: INGEST */}
            <div className="stage-card">
              <div className="stage-num">1</div>
              <div className="stage-body">
                <div className="stage-title">
                  <strong>Ingest Agent</strong>
                  <span className="channel-pill">fleet.ingest</span>
                </div>
                <p className="stage-desc">Reads the spend and location</p>
                <div className="stage-data">
                  <div>Source: <code>{activeRun.ingest.source}</code></div>
                  <div>Spend: <code>${activeRun.ingest.spendUsd} USD</code></div>
                  <div>MTD Booked: <code>{activeRun.ingest.monthToDateKg} kg</code></div>
                  <div>Budget: <code>{activeRun.ingest.monthlyBudgetKg} kg</code></div>
                </div>
              </div>
            </div>

            <div className="stage-arrow">➔</div>

            {/* STAGE 2: AUDIT */}
            <div className="stage-card active-stage">
              <div className="stage-num">2</div>
              <div className="stage-body">
                <div className="stage-title">
                  <strong>Audit Agent</strong>
                  <span className="channel-pill">fleet.audit</span>
                </div>
                <p className="stage-desc">Scores it and cites real sources</p>
                {activeRun.audit ? (
                  <div className="stage-data">
                    <div>Scored: <strong className="highlight">{activeRun.audit.kgCO2e} kgCO₂e</strong></div>
                    <div>Projected Month: <code>{activeRun.audit.projectedMonthKg} kg</code></div>
                    <div>
                      Diff vs Budget:{" "}
                      <span className={activeRun.audit.overBudgetKg > 0 ? "text-refuse" : "text-ok"}>
                        {activeRun.audit.overBudgetKg > 0 ? `+${activeRun.audit.overBudgetKg} kg over` : "Within budget"}
                      </span>
                    </div>
                    <div className="tavily-evidence-box">
                      <span className="evidence-head">🔍 Tavily Evidence ({activeRun.audit.evidence.length} sources):</span>
                      <ul className="evidence-list">
                        {activeRun.audit.evidence.slice(0, 3).map((e, idx) => (
                          <li key={idx}>
                            <a href={e.url} target="_blank" rel="noreferrer">
                              {e.title || e.url}
                            </a>
                            <p className="snippet">{e.snippet}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-refuse">Audit refused / ungrounded.</p>
                )}
              </div>
            </div>

            <div className="stage-arrow">➔</div>

            {/* STAGE 3: SETTLE */}
            <div className="stage-card">
              <div className="stage-num">3</div>
              <div className="stage-body">
                <div className="stage-title">
                  <strong>Settle Agent</strong>
                  <span className="channel-pill">fleet.settle</span>
                </div>
                <p className="stage-desc">Writes the offset receipt</p>
                {activeRun.offsetReceipt ? (
                  <div className="stage-data">
                    <div>Receipt: <code>{activeRun.offsetReceipt.id.slice(0, 8)}</code></div>
                    <div>Amount: <strong>${(activeRun.offsetReceipt.amountCents ?? 0) / 100} USD</strong></div>
                    <div>Status: <span className="chip ok">COMMITTED</span></div>
                    <div>Scope Ceiling: <code>5 000¢ checked</code></div>
                    <div className="idempotency">Key: {activeRun.offsetReceipt.idempotencyKey}</div>
                  </div>
                ) : (
                  <div className="stage-data">
                    <div>Action: <code>{activeRun.settlement?.action ?? "none"}</code></div>
                    <div>Reason: <code>{activeRun.settlement?.reason ?? "within_budget"}</code></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p>No fleet runs yet. Click a button above to trigger one.</p>
        </div>
      )}

      {/* DURABLE HANDOFF LOG */}
      <div className="card">
        <span className="kicker">Handoff log</span>
        <h3>Recent handoffs ({handoffs.length})</h3>
        <div className="table-wrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>TIME</th>
                <th>FROM</th>
                <th>TO</th>
                <th>CHANNEL</th>
                <th>KIND</th>
                <th>RUN ID</th>
              </tr>
            </thead>
            <tbody>
              {handoffs.slice(0, 10).map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.createdAt).toLocaleTimeString()}</td>
                  <td><span className="chip ok">{h.from}</span></td>
                  <td><span className="chip info">{h.to}</span></td>
                  <td><code>{h.channel}</code></td>
                  <td><strong>{h.kind}</strong></td>
                  <td><code>{h.runId.slice(0, 8)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function intensity(t: number, arrM: number) {
  return Math.round((t / arrM) * 10) / 10;
}

function GrowthChart({
  quarters,
}: {
  quarters: { label: string; arrM: number; defaultT: number; climaT: number }[];
}) {
  const w = 640;
  const h = 220;
  const pad = { l: 40, r: 16, t: 18, b: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxT = Math.max(...quarters.flatMap((q) => [q.defaultT, q.climaT]));
  const x = (i: number) => pad.l + (i / Math.max(quarters.length - 1, 1)) * innerW;
  const yT = (t: number) => pad.t + innerH - (t / maxT) * innerH;
  const poly = (key: "defaultT" | "climaT") =>
    quarters.map((q, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yT(q[key]).toFixed(1)}`).join(" ");

  return (
    <svg className="grow-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Modeled EI default vs Climatico path as ARR grows">
      {quarters.map((q, i) => (
        <g key={q.label}>
          <line x1={x(i)} x2={x(i)} y1={pad.t} y2={pad.t + innerH} stroke="var(--line)" strokeWidth="1" />
          <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {q.label}
          </text>
        </g>
      ))}
      <path d={poly("defaultT")} fill="none" stroke="var(--clay)" strokeWidth="2.5" />
      <path d={poly("climaT")} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      {quarters.map((q, i) => (
        <g key={`${q.label}-dots`}>
          <circle cx={x(i)} cy={yT(q.defaultT)} r="4" fill="var(--clay)" />
          <circle cx={x(i)} cy={yT(q.climaT)} r="4" fill="var(--accent-deep)" />
        </g>
      ))}
    </svg>
  );
}

function GrowView({
  lastKg,
  busy,
  onWrite,
}: {
  lastKg: number | null;
  busy: boolean;
  onWrite: (id: string) => void;
}) {
  const { stages, quarters, nowArrM, nowT, customers, pilots, acv, burnK } = OREPATH_GROWTH;
  const [stageId, setStageId] = useState<(typeof stages)[number]["id"]>("build");
  const stage = stages.find((s) => s.id === stageId) ?? stages[0];
  const last = quarters[quarters.length - 1];
  const nowInt = intensity(nowT, nowArrM);
  const defInt = intensity(last.defaultT, last.arrM);
  const climaInt = intensity(last.climaT, last.arrM);

  return (
    <div className="grow">
      <section className="card">
        <span className="kicker">Orepath's growth</span>
        <h3>Does the footprint have to grow with the company?</h3>
        <p className="lede">
          As Orepath builds, sells, and gets paid, Climatico can attach to those same moments — a
          region choice, a buyer question, an invoice. This chart compares two paths: the default, and
          one where Climatico writes actually happen. It's <b>modeled</b> until a write lands.
        </p>
        <div className="metrics" style={{ marginTop: 14 }}>
          <div className="metric">
            <div className="k">ARR now</div>
            <div className="v">${nowArrM}M</div>
            <div className="d">
              {customers} paying · {pilots} pilots · {acv}
            </div>
          </div>
          <div className="metric foot">
            <div className="k">Modeled EI now</div>
            <div className="v">{nowT}</div>
            <div className="d">tCO₂e / yr · seven classes</div>
          </div>
          <div className="metric hand">
            <div className="k">Intensity now</div>
            <div className="v">{nowInt}</div>
            <div className="d">t per $1M ARR</div>
          </div>
          <div className="metric">
            <div className="k">Burn</div>
            <div className="v">${burnK}k</div>
            <div className="d">/ month · spending is what's cheapest to capture</div>
          </div>
        </div>
      </section>

      <div className="ops-rail">
        {stages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`ops-step ${s.id === stageId ? "on" : ""} ${s.live ? "" : "later"}`}
            onClick={() => setStageId(s.id)}
          >
            <span className="ops-n">{i + 1}</span>
            <span className="ops-v">{s.verb}</span>
            <span className={`chip ${s.live ? "ok" : "wa"}`}>{s.live ? "live write" : "modeled"}</span>
          </button>
        ))}
      </div>

      <div className="grid g2">
        <section className="card">
          <span className="kicker">{stage.verb}</span>
          <h3>{stage.company}</h3>
          <div className="callout">
            <strong>Where an agent already is</strong>
            {stage.moment}
          </div>
          <div className={`callout ${stage.live ? "" : "clay"}`}>
            <strong>What Climatico does</strong>
            {stage.climatico}
          </div>
          {lastKg != null && (stage.id === "build" || stage.id === "pay") ? (
            <p className="live-pill">Last live compute write: {lastKg} kg on the ledger</p>
          ) : null}
          {(() => {
            const action = stage.write;
            if (!action) {
              return <p className="lede">No write on Grow. The chart is a projector, not a receipt.</p>;
            }
            return (
              <div className="row">
                <button type="button" className="primary" disabled={busy} onClick={() => onWrite(action)}>
                  {action === "fleet"
                    ? "File a cloud spike"
                    : action === "brief"
                      ? "Ground a sell-side brief"
                      : action === "refuse"
                        ? "Refuse greenwash"
                        : "Run"}
                </button>
                {stage.id === "sell" ? (
                  <button type="button" className="ghost" disabled={busy} onClick={() => onWrite("refuse")}>
                    Refuse a green chain
                  </button>
                ) : null}
              </div>
            );
          })()}
        </section>

        <section className="card">
          <span className="kicker">Tonnes per $1M ARR, not total tonnes</span>
          <h3>Same growth, different footprint</h3>
          <div className="chart-legend">
            <span>
              <i className="swatch clay" /> Default (footprint scales with revenue)
            </span>
            <span>
              <i className="swatch leaf" /> With Climatico writes
            </span>
          </div>
          <GrowthChart quarters={quarters} />
          <table className="dataTable">
            <thead>
              <tr>
                <th>When</th>
                <th>ARR</th>
                <th>Default t</th>
                <th>Climatico t</th>
                <th>t / $M</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((q) => (
                <tr key={q.label}>
                  <td>{q.label}</td>
                  <td>${q.arrM}M</td>
                  <td>{q.defaultT}</td>
                  <td>{q.climaT}</td>
                  <td>
                    <span className="chip wa">{intensity(q.defaultT, q.arrM)}</span>
                    {" → "}
                    <span className="chip ok">{intensity(q.climaT, q.arrM)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="callout clay">
            <strong>At +24 months</strong>
            Default path: ~{defInt} t/$M ({last.defaultT} t on ${last.arrM}M). Climatico path: {climaInt}{" "}
            t/$M ({last.climaT} t) — only if the writes actually happen. Modeled, not measured.
          </div>
        </section>
      </div>
    </div>
  );
}

function LedgerView({ receipts }: { receipts: Receipt[] }) {
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(receipts[0] ?? null);

  return (
    <div className="ledger-container">
      <div className="grid g2">
        <div className="card">
          <span className="kicker">Receipts</span>
          <h3>Every write, committed or refused ({receipts.length})</h3>
          <p className="lede">
            A refusal is saved the same way a commit is — same id, same subject, same token, same
            timestamp. Click a row to see why it was accepted or refused.
          </p>
          <div className="receipt-list">
            {receipts.map((r) => (
              <div
                key={r.id}
                className={`receipt-row ${r.status === "committed" ? "committed" : "refused"} ${
                  selectedReceipt?.id === r.id ? "selected" : ""
                }`}
                onClick={() => setSelectedReceipt(r)}
              >
                <div className="r-head">
                  <span className={`chip ${r.status === "committed" ? "ok" : "no"}`}>
                    {r.status.toUpperCase()}
                  </span>
                  <strong>{r.intent}</strong>
                  <span className="r-loc">{r.location ?? "global"}</span>
                </div>
                <div className="r-meta">
                  <span>ID: <code>{r.id.slice(0, 8)}</code></span>
                  <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card receipt-detail">
          <span className="kicker">Inspector</span>
          {selectedReceipt ? (
            <div>
              <h3>
                Receipt <code>{selectedReceipt.id}</code>
              </h3>
              <div className="detail-status">
                <span className={`chip ${selectedReceipt.status === "committed" ? "ok" : "no"}`}>
                  {selectedReceipt.status.toUpperCase()}
                </span>
                {selectedReceipt.amountCents != null ? (
                  <span className="price">${selectedReceipt.amountCents / 100} USD</span>
                ) : null}
              </div>

              <div className="field-group">
                <label>What & where</label>
                <p>Intent: <code>{selectedReceipt.intent}</code> · Location: <code>{selectedReceipt.location ?? "—"}</code></p>
              </div>

              <div className="field-group">
                <label>Who asked</label>
                <p>Subject: <code>{selectedReceipt.subject}</code> · Token: <code>{selectedReceipt.tokenId}</code></p>
              </div>

              {selectedReceipt.refusalCode ? (
                <div className="field-group refuse-box">
                  <label className="text-refuse">Why it was refused: {selectedReceipt.refusalCode}</label>
                  <p>{selectedReceipt.refusalReason}</p>
                </div>
              ) : null}

              {selectedReceipt.evidence && selectedReceipt.evidence.length > 0 ? (
                <div className="field-group">
                  <label>Sources ({selectedReceipt.evidence.length})</label>
                  <ul className="evidence-list">
                    {selectedReceipt.evidence.map((ev, idx) => (
                      <li key={idx}>
                        <a href={ev.url} target="_blank" rel="noreferrer">
                          {ev.title || ev.url}
                        </a>
                        <p className="snippet">{ev.snippet}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedReceipt.idempotencyKey ? (
                <div className="field-group">
                  <label>Retry key</label>
                  <p><code>{selectedReceipt.idempotencyKey}</code></p>
                </div>
              ) : null}
            </div>
          ) : (
            <p>Select a receipt on the left to see its details.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ClerkPane() {
  const agent = useAgent({ agent: "Clerk", name: "desk" });
  const { messages, sendMessage, status } = useAgentChat({ agent });
  const [draft, setDraft] = useState(
    "Rae’s Oakland freight is the modeled hotspot. What can I file today vs what’s still modeled?",
  );

  return (
    <div className="card">
      <span className="kicker">Clerk</span>
      <h3>Ask the clerk</h3>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        Ask about your footprint, or ask it to file a write. It uses the same tools an agent would.
        Status: <b>{status}</b>.
      </p>
      <div className="feed">
        {messages.length === 0 ? (
          <p>Ask for the assessment, a refusal reason, or to run the fleet.</p>
        ) : (
          messages.map((msg: { id: string; role: string; parts: Array<{ type: string; text?: string }> }) => (
            <p key={msg.id} className={msg.role === "user" ? "you" : "bot"}>
              <b>{msg.role === "user" ? "you" : "clerk"} · </b>
              {msg.parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("")}
            </p>
          ))
        )}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          void sendMessage({ text: draft });
          setDraft("");
        }}
      >
        <input
          style={{ flex: 1, minWidth: 160 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the clerk…"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

function SwarmView({
  runs,
  receipts,
  handoffs,
  onRunFleet,
  onRunAction,
  onVerifyBuyer,
  buyerAudit,
  busy,
}: {
  runs: FleetRun[];
  receipts: Receipt[];
  handoffs: Handoff[];
  onRunFleet: (source: string, location: string, spend: number) => void;
  onRunAction: (intent: string, location: string) => void;
  onVerifyBuyer: () => void;
  buyerAudit: { count: number; at: number } | null;
  busy: boolean;
}) {
  const [clientType, setClientType] = useState<"orepath" | "hardware">("orepath");

  return (
    <div className="swarm-container">
      <div className="swarm-header card">
        <div>
          <span className="kicker">Simulation</span>
          <h3>A company's agents, Climatico, and the buyer checking the claim</h3>
          <p className="lede">
            A company's agents trigger real events — a cloud spike, a booking, a PO. Climatico checks each
            one against policy and real sources, then writes a receipt. A buyer can read those receipts
            with a read-only token before trusting a supply-chain claim.
          </p>
        </div>
        <div className="client-toggle">
          <span>Client Persona: </span>
          <button
            type="button"
            className={clientType === "orepath" ? "primary" : "ghost"}
            onClick={() => setClientType("orepath")}
          >
            Orepath (Cloud & Battery Compute)
          </button>
          <button
            type="button"
            className={clientType === "hardware" ? "primary" : "ghost"}
            onClick={() => setClientType("hardware")}
          >
            Hardware Co (Factory & Port Freight)
          </button>
        </div>
      </div>

      <div className="swarm-grid">
        {/* LEFT COLUMN: CLIENT AGENTS */}
        <div className="swarm-col card">
          <div className="swarm-col-head">
            <span className="chip wa">Company</span>
            <h4>{clientType === "orepath" ? "Orepath's agents" : "Hardware Co's agents"}</h4>
            <p className="sub">{clientType === "orepath" ? "Tracer software" : "Factory & supply chain"}</p>
          </div>

          <div className="agent-cards">
            {clientType === "orepath" ? (
              <>
                <div className="agent-box">
                  <div className="agent-title">
                    <strong>1. Tracer's compute</strong>
                    <span className="role-tag">Cloud spend</span>
                  </div>
                  <p>Runs the batch jobs that trace battery materials, in SJC.</p>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => onRunFleet("cloud", "SJC", 420)}
                  >
                    Trigger $420 cloud spike (SJC)
                  </button>
                </div>

                <div className="agent-box">
                  <div className="agent-title">
                    <strong>2. Port booking</strong>
                    <span className="role-tag">Freight</span>
                  </div>
                  <p>Books container freight through Oakland port.</p>
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy}
                    onClick={() => onRunAction("brief", "Oakland port")}
                  >
                    Ground an Oakland port brief
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="agent-box">
                  <div className="agent-title">
                    <strong>1. Factory PO</strong>
                    <span className="role-tag">Supplier token</span>
                  </div>
                  <p>Files a purchase order with the factory, using a supplier-only token.</p>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => onRunAction("assess", "Shenzhen assembly facility")}
                  >
                    Assess the Shenzhen factory
                  </button>
                </div>

                <div className="agent-box">
                  <div className="agent-title">
                    <strong>2. Ocean freight</strong>
                    <span className="role-tag">Port booking</span>
                  </div>
                  <p>Books shipping from the factory to Oakland port.</p>
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy}
                    onClick={() => onRunAction("watch", "Oakland port")}
                  >
                    Watch the port continuously
                  </button>
                </div>
              </>
            )}

            <div className="agent-box rogue">
              <div className="agent-title">
                <strong className="text-refuse">3. A bad-faith claim</strong>
                <span className="role-tag refuse">Marketing</span>
              </div>
              <p>Tries to file a "zero-carbon" claim with no evidence behind it.</p>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => onRunAction("greenwash", clientType === "orepath" ? "Orepath battery" : "Zero carbon device")}
              >
                Try the greenwash claim (it gets refused)
              </button>
            </div>

            <div className="agent-box">
              <div className="agent-title">
                <strong>4. Buyer's auditor</strong>
                <span className="role-tag">Read-only</span>
              </div>
              <p>Checks the ledger with a read-only token before trusting a claim.</p>
              <div className="buyer-stat">
                Receipts checked: <b>{receipts.length}</b> (committed &amp; refused)
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: PROTOCOL & BOUNDARY */}
        <div className="swarm-col boundary-col card">
          <div className="swarm-col-head">
            <span className="chip info">In between</span>
            <h4>How an agent connects</h4>
            <p className="sub">Discovery, then a scoped login</p>
          </div>

          <div className="boundary-steps">
            <div className="b-step">
              <span className="b-icon">🔍</span>
              <div>
                <strong>Find the desk</strong>
                <code>/.well-known/agent-card.json</code>
              </div>
            </div>

            <div className="b-step">
              <span className="b-icon">🔑</span>
              <div>
                <strong>Mint a scoped token</strong>
                <p>Permissions lock in at mint · capped at $50</p>
              </div>
            </div>

            <div className="b-step">
              <span className="b-icon">🌐</span>
              <div>
                <strong>Cotal mesh</strong>
                <code>#team.climatico · wss://hack.cotal.ai</code>
              </div>
            </div>

            <div className="b-step">
              <span className="b-icon">🛡️</span>
              <div>
                <strong>Policy check</strong>
                <p>A refusal is saved the same way a commit is</p>
              </div>
            </div>
          </div>

          <div className="live-handoff-feed">
            <span className="feed-head">Recent handoffs ({handoffs.length}):</span>
            <div className="mini-feed">
              {handoffs.slice(0, 5).map((h) => (
                <div key={h.id} className="mini-h-row">
                  <span className="h-time">{new Date(h.createdAt).toLocaleTimeString()}</span>
                  <code>{h.from}➔{h.to}</code>
                  <span>{h.kind}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLIMATICO SERVICE AGENTS */}
        <div className="swarm-col card">
          <div className="swarm-col-head">
            <span className="chip ok">Climatico</span>
            <h4>Climatico's agents</h4>
            <p className="sub">Cloudflare + Nebius + Tavily</p>
          </div>

          <div className="agent-cards">
            <div className="agent-box">
              <div className="agent-title">
                <strong>1. Ingest</strong>
                <span className="role-tag ok">fleet.ingest</span>
              </div>
              <p>Reads the spend spike and checks it against this month's budget.</p>
              <div className="agent-stat">Runs processed: <b>{runs.length}</b></div>
            </div>

            <div className="agent-box">
              <div className="agent-title">
                <strong>2. Audit</strong>
                <span className="role-tag ok">fleet.audit</span>
              </div>
              <p>Scores the spend and cites real sources.</p>
              <div className="agent-stat">
                Sources: <b>{runs[0]?.audit?.evidence.length ?? 5} per spike</b>
              </div>
            </div>

            <div className="agent-box">
              <div className="agent-title">
                <strong>3. Settle</strong>
                <span className="role-tag ok">fleet.settle</span>
              </div>
              <p>Writes the offset receipt to the ledger.</p>
              <div className="agent-stat">
                Offsets committed: <b>{receipts.filter((r) => r.status === "committed").length}</b>
              </div>
            </div>

            <div className="agent-box">
              <div className="agent-title">
                <strong>4. Policy</strong>
                <span className="role-tag ok">ledger</span>
              </div>
              <p>Refuses anything outside the rules, and logs why.</p>
              <div className="agent-stat">
                Refusals stored: <b className="text-refuse">{receipts.filter((r) => r.status === "refused").length}</b>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHTMOST COLUMN: BUYER ECOSYSTEM */}
        <div className="swarm-col card">
          <div className="swarm-col-head">
            <span className="chip info">Buyer</span>
            <h4>The buyer checking the claim</h4>
            <p className="sub">Can read receipts, can't write</p>
          </div>

          <div className="agent-cards">
            <div className="agent-box">
              <div className="agent-title">
                <strong>1. Buyer's compliance check</strong>
                <span className="role-tag">climatico:read</span>
              </div>
              <p>Mints a read-only credential, then checks the ledger before accepting a claim.</p>
              <button type="button" className="primary" disabled={busy} onClick={onVerifyBuyer}>
                Check the ledger (read-only)
              </button>
              <div className="agent-stat">
                {buyerAudit ? (
                  <>
                    Last check: <b>{buyerAudit.count}</b> receipts at {new Date(buyerAudit.at).toLocaleTimeString()}
                  </>
                ) : (
                  "No check run yet"
                )}
              </div>
            </div>

            <div className="agent-box">
              <div className="agent-title">
                <strong>2. Regulator / analyst</strong>
                <span className="role-tag">evidence</span>
              </div>
              <p>Uses the grounded offsets and refusals for Scope 3 disclosure.</p>
              <div className="agent-stat">
                Committed: <b>{receipts.filter((r) => r.status === "committed").length}</b> · Refused:{" "}
                <b className="text-refuse">{receipts.filter((r) => r.status === "refused").length}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SponsorCard({ s }: { s: SponsorLink }) {
  return (
    <article className="card">
      <span className="kicker">{s.role}</span>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <h3>{s.name}</h3>
        <span
          className={`chip ${s.status === "live" || s.status === "host" ? "ok" : s.status === "prize" ? "wa" : "info"}`}
        >
          {s.status.toUpperCase()}
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, minHeight: 40 }}>{s.insight}</p>
      <p className="how">
        <b>Try: </b>
        {s.how}{" "}
        <a href={s.href} target="_blank" rel="noreferrer">
          open ↗
        </a>
      </p>
    </article>
  );
}

function StackView({ sponsors }: { sponsors: SponsorLink[] }) {
  const inPath = sponsors.filter((s) => s.status === "live" || s.status === "host");
  const notYet = sponsors.filter((s) => s.status === "booth" || s.status === "prize");

  return (
    <div className="stack-view">
      <section>
        <span className="kicker">In the write path</span>
        <h3>These actually run inside Climatico's code today</h3>
        <div className="grid g3">
          {inPath.map((s) => (
            <SponsorCard s={s} key={s.id} />
          ))}
        </div>
      </section>
      <section style={{ marginTop: 20 }}>
        <span className="kicker">Not yet — credits, booths, or prizes only</span>
        <h3>Named honestly, not wired in. No fake calls to make it look busy.</h3>
        <div className="grid g3">
          {notYet.map((s) => (
            <SponsorCard s={s} key={s.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const [ws, setWs] = useState<WorkspaceView | null>(null);
  const [token, setToken] = useState("");
  const [location, setLocation] = useState("SJC");
  const [busy, setBusy] = useState(false);
  const [buyerAudit, setBuyerAudit] = useState<{ count: number; at: number } | null>(null);
  const decked = fromDeck();
  const embedded = window.self !== window.top;

  const load = useCallback(async () => {
    try {
      const data = (await fetch("/v1/workspace").then((r) => r.json())) as WorkspaceView;
      setWs(data);
    } catch (err) {
      console.error("Failed to load workspace", err);
    }
  }, []);

  async function mint() {
    setBusy(true);
    try {
      const res = await fetch("/v1/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "desk-session",
          scopes: ["climatico:read", "climatico:transact"],
        }),
      });
      const body = (await res.json()) as { token?: string };
      if (body.token) {
        setToken(body.token);
        sessionStorage.setItem("climatico.token", body.token);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("climatico.token");
    if (saved) setToken(saved);
    void load();
  }, [load]);

  async function write(path: string, body: unknown) {
    if (!token) await mint();
    const t = token || sessionStorage.getItem("climatico.token");
    setBusy(true);
    try {
      await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t ?? ""}`,
        },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function verifyBuyer() {
    setBusy(true);
    try {
      const cred = (await fetch("/v1/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "ev-buyer-auditor", scopes: ["climatico:read"] }),
      }).then((r) => r.json())) as { token?: string };
      if (!cred.token) throw new Error("buyer read-only mint failed");
      const data = (await fetch("/v1/receipts", {
        headers: { Authorization: `Bearer ${cred.token}` },
      }).then((r) => r.json())) as { receipts?: unknown[] };
      setBuyerAudit({ count: data.receipts?.length ?? 0, at: Date.now() });
    } catch (err) {
      console.error("Buyer audit failed", err);
    } finally {
      setBusy(false);
    }
  }

  function goTab(id: Tab) {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  const d = ws?.dashboard;
  const classes = ws?.classes ?? [];
  const modeled = useMemo(
    () => Math.round(classes.reduce((sum, c) => sum + c.modeledT, 0) * 10) / 10,
    [classes],
  );
  const liveClass = classes.find((c) => c.status === "live");
  const firstAction = ws?.next?.[0] ?? "Mint a credential, then assess a spend spike.";
  const story: FounderStory = ws?.story ?? OREPATH;

  function runStoryTool(id: string) {
    if (id === "brief-oakland") {
      void write("/v1/actions", { intent: "brief", location: "Oakland port" });
      return;
    }
    if (id === "watch-oakland") {
      void write("/v1/actions", { intent: "watch", location: "Oakland port" });
      return;
    }
    if (id === "fleet-sjc") {
      void write("/v1/fleet/run", {
        source: "cloud",
        location: "SJC",
        spendUsd: 420,
        monthlyBudgetKg: 50,
        monthToDateKg: 40,
      });
      return;
    }
    if (id === "refuse-greenwash") {
      void write("/v1/actions", { intent: "greenwash", location: "Orepath supply chain" });
    }
  }

  const title: Record<Tab, string> = {
    assess: "Your emissions, by class",
    grow: "Growth vs. footprint",
    pipeline: "Fleet: ingest, audit, settle",
    swarm: "Who's talking to whom",
    impact: "Impact & abatement — the modeled cascade and the same business, run differently",
    ledger: "Receipts & refusals",
    inbox: "Inbox",
    agent: "Ask the clerk",
    onboard: "Getting started",
    stack: "Who's actually in the write path",
  };

  return (
    <div className={`shell${embedded ? " embed" : ""}`}>
      <header className="top">
        <a className="brand" href="/">
          <img src="/assets/climatico-logo.svg" alt="Climatico" width="148" height="40" />
          <span className="sub">desk</span>
        </a>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={tab === t.id} onClick={() => goTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        {embedded ? null : (
          <div className="top-links">
            {decked ? (
              <a className="pill back" href="/deck.html#slide-4">
                Back to deck
              </a>
            ) : (
              <a className="pill" href="/deck.html">
                Deck
              </a>
            )}
          </div>
        )}
      </header>

      <main className="main">
        <section className="cover">
          <SponsorPills
            tavilyKey={ws?.tavilyKey}
            cotalWebhook={ws?.cotalWebhook}
            nebiusKey={ws?.nebiusKey}
          />
          <p className="kicker">Climatico</p>
          <h1>{title[tab]}</h1>
          <p className="lede">
            A footprint estimate across seven emission classes. Compute is live today, backed by real
            sources. The rest is modeled until it becomes a write. Try it: mint a credential, then run one
            of the buttons below.
          </p>
          <div className="row">
            <button type="button" className="primary" disabled={busy} onClick={() => void mint()}>
              Mint credential
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void write("/v1/fleet/run", {
                  source: "cloud",
                  location,
                  spendUsd: 420,
                  monthlyBudgetKg: 50,
                  monthToDateKg: 40,
                })
              }
            >
              Assess a spend spike ($420)
            </button>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => void write("/v1/actions", { intent: "greenwash", location })}
            >
              Test Forbidden Claim (Greenwash)
            </button>
          </div>
        </section>

        <div className="metrics">
          <div className="metric foot">
            <div className="k">Modeled EI</div>
            <div className="v">{modeled || "—"}</div>
            <div className="d">tCO₂e / year · seven classes</div>
          </div>
          <div className="metric hand">
            <div className="k">Live compute</div>
            <div className="v">{liveClass ? "LIVE" : "MODELED"}</div>
            <div className="d">{liveClass?.liveNote ?? "Run a grounded fleet spike"}</div>
          </div>
          <div className="metric">
            <div className="k">Committed</div>
            <div className="v">{d?.committed ?? 0}</div>
            <div className="d">writes that landed</div>
          </div>
          <div className="metric">
            <div className="k">Refused</div>
            <div className="v">{d?.refused ?? 0}</div>
            <div className="d">receipts that said no</div>
          </div>
          <div className="metric">
            <div className="k">Fleet Runs</div>
            <div className="v">{d?.fleetRuns ?? 0}</div>
            <div className="d">Ingest → Audit → Settle</div>
          </div>
        </div>

        {tab === "assess" ? (
          <>
            <section className="identity">
              <img src="/assets/rae.jpg" alt="Rae Jin" width="72" height="72" />
              <div>
                <div className="name">
                  {story.name} · {story.company}
                </div>
                <div className="domain">
                  {story.role} · {story.stage}
                </div>
                <p>{story.product}</p>
                <p>
                  <b>Spark. </b>
                  {story.spark}
                </p>
              </div>
              <span className="badge">logistics · modeled</span>
            </section>
            <div className="grid g2">
              <section className="card">
                <span className="kicker">Hotspots</span>
                <h3>Logistics is the biggest class. Compute is what we can file today.</h3>
                <p className="lede" style={{ marginBottom: 12 }}>
                  {story.hotspotWhy}
                </p>
                <Hotspots
                  classes={classes}
                  hotId={story.hotspotClass}
                  busy={busy}
                  onGround={(classId) =>
                    void write("/v1/actions", { intent: "assess", source: classId, location })
                  }
                />
                <div className="callout">
                  <strong>Try this first: </strong>
                  {firstAction}
                </div>
                <div className="callout clay">
                  <strong>Why an agent, not a form: </strong>
                  The cheapest moment to capture this is a PO, a booking, a bill spike — and Rae's team
                  already runs those through agents, not a dashboard they'd visit twice a year.
                </div>
                <label>Location / region</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </section>
              <section className="card">
                <span className="kicker">Practical tools</span>
                <h3>Try it now</h3>
                <p className="lede" style={{ marginBottom: 12 }}>
                  Run real writes against Rae's data. Click Run below — 4 tools are live, 1 is next.
                </p>
                <div className="tools">
                  {story.tools.map((t) => (
                    <article className={`act-item ${t.live ? "" : "later"}`} key={t.id}>
                      <div className="act-head">
                        <span className={`chip ${t.live ? "ok" : "wa"}`}>{t.live ? "live" : "next"}</span>
                        <span className="title">{t.title}</span>
                      </div>
                      <p className="how">{t.how}</p>
                      {t.live ? (
                        <button type="button" disabled={busy} onClick={() => runStoryTool(t.id)}>
                          Run
                        </button>
                      ) : (
                        <p className="lede">Not built yet — we won't fake it. It needs supplier/buyer tokens first.</p>
                      )}
                    </article>
                  ))}
                </div>
                <InboxList items={(ws?.inbox ?? []).slice(0, 3)} />
              </section>
            </div>
          </>
        ) : null}

        {tab === "grow" ? (
          <GrowView
            lastKg={liveClass && ws?.runs?.[0]?.audit?.kgCO2e != null ? ws.runs[0].audit!.kgCO2e : null}
            busy={busy}
            onWrite={(kind) => {
              if (kind === "fleet") runStoryTool("fleet-sjc");
              else if (kind === "brief") runStoryTool("brief-oakland");
              else if (kind === "watch") runStoryTool("watch-oakland");
              else if (kind === "refuse") runStoryTool("refuse-greenwash");
            }}
          />
        ) : null}

        {tab === "pipeline" ? (
          <PipelineView
            runs={ws?.runs ?? []}
            handoffs={ws?.handoffs ?? []}
            onRunFleet={(spend, budget, mtd) =>
              void write("/v1/fleet/run", {
                source: "cloud",
                location,
                spendUsd: spend,
                monthlyBudgetKg: budget,
                monthToDateKg: mtd,
              })
            }
            busy={busy}
            location={location}
          />
        ) : null}

        {tab === "swarm" ? (
          <SwarmView
            runs={ws?.runs ?? []}
            receipts={ws?.receipts ?? []}
            handoffs={ws?.handoffs ?? []}
            onRunFleet={(source, loc, spend) =>
              void write("/v1/fleet/run", {
                source,
                location: loc,
                spendUsd: spend,
                monthlyBudgetKg: 50,
                monthToDateKg: 40,
              })
            }
            onRunAction={(intent, loc) =>
              void write("/v1/actions", {
                intent,
                location: loc,
              })
            }
            onVerifyBuyer={() => void verifyBuyer()}
            buyerAudit={buyerAudit}
            busy={busy}
          />
        ) : null}

        {tab === "impact" ? (
          <section className="card">
            <span className="kicker">Impact & abatement · modeled, not measured</span>
            <h3>The cascade — and the same business, run differently</h3>
            <p className="lede">
              CO₂e is the modeled core. Water, air pollution and e-waste are upstream knock-ons, named
              but not scored — Climatico refuses to print a number it can't back. Each row is a business
              source an agent already touches (a PO, a booking, a port). File an abatement plan with
              <span className="inline"> intent: abate</span> to record the alternative + modeled projection.
            </p>
            <div className="metrics">
              <div className="metric">
                <div className="k">Today (modeled)</div>
                <div className="v">{ws?.abatement?.nowT ?? "—"} t</div>
              </div>
              <div className="metric">
                <div className="k">+24m abating</div>
                <div className="v">{ws?.abatement?.quarters?.[4]?.climaT ?? "—"} t</div>
              </div>
              <div className="metric">
                <div className="k">+24m if nothing changes</div>
                <div className="v">{ws?.abatement?.quarters?.[4]?.defaultT ?? "—"} t</div>
              </div>
              <div className="metric">
                <div className="k">Abate plans filed</div>
                <div className="v">{ws?.abatementPlans ?? 0}</div>
              </div>
            </div>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Business source</th>
                  <th>Impact (t CO₂e/yr)</th>
                  <th>Upstream knock-ons</th>
                  <th>Same business, differently</th>
                  <th>Abatement lever</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(ws?.impact ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="sub">{row.scope}</div>
                    </td>
                    <td>
                      {row.modeledT} t <small>±{row.uncertaintyPct}%</small>
                    </td>
                    <td>
                      {row.upstream}
                      {(row.knockOns ?? [])
                        .filter((k) => !k.scored)
                        .map((k) => (
                          <div key={k.category} className="sub">
                            <span className="chip info">{k.category}</span> {k.lever}
                          </div>
                        ))}
                    </td>
                    <td>{row.alternative}</td>
                    <td>{row.lever}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() =>
                          void write("/v1/actions", {
                            intent: "abate",
                            location,
                            source: row.id,
                            note: row.alternative,
                          })
                        }
                      >
                        File abatement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sub" style={{ marginTop: 10 }}>
              AIsa{" "}
              {ws?.aisaConfigured
                ? "is connected — this desk can read the real wallet balance (GET /v1/credits/balance), free and read-only. Machine-to-machine payment settlement stays off: that write needs a specific, bounded, human-confirmed instruction, not a standing key."
                : "is the machine-payment rail (M2M). Not collected here yet — offsets settle on our ledger. No fake call."}
            </p>
          </section>
        ) : null}

        {tab === "ledger" ? <LedgerView receipts={ws?.receipts ?? []} /> : null}

        {tab === "inbox" ? (
          <section className="card">
            <span className="kicker">Inbox</span>
            <h3>Everything happening, in one list</h3>
            <InboxList items={ws?.inbox ?? []} />
          </section>
        ) : null}

        {tab === "agent" ? (
          <div className="grid g2">
            <ClerkPane />
            <section className="card">
              <span className="kicker">What the clerk sees</span>
              <h3>The same inbox, if you'd rather click than type</h3>
              <InboxList items={(ws?.inbox ?? []).slice(0, 5)} />
              <div className="row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void write("/v1/fleet/run", {
                      source: "cloud",
                      location,
                      spendUsd: 12,
                      monthlyBudgetKg: 50,
                      monthToDateKg: 40,
                    })
                  }
                >
                  In-budget run
                </button>
                <button
                  className="danger"
                  type="button"
                  disabled={busy}
                  onClick={() => void write("/v1/actions", { intent: "greenwash", location })}
                >
                  Try a forbidden claim
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "onboard" ? (
          <section className="card">
            <span className="kicker">Getting started</span>
            <h3>Each level unlocks with a real write, not a checkbox</h3>
            <div className="steps">
              {(ws?.maturity ?? []).map((m) => (
                <div className={`goal-row ${m.done ? "done" : ""}`} key={m.level}>
                  <div className="step-n">{m.done ? "✓" : `L${m.level}`}</div>
                  <div>
                    <b>{m.name}</b>
                    <p>{m.how}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="row">
              <button type="button" onClick={() => void mint()}>
                L1 mint
              </button>
              <button
                type="button"
                onClick={() => void write("/v1/actions", { intent: "brief", location: "Houston, TX" })}
              >
                L2 brief
              </button>
              <button
                type="button"
                onClick={() =>
                  void write("/v1/fleet/run", {
                    source: "cloud",
                    location,
                    spendUsd: 420,
                    monthlyBudgetKg: 50,
                    monthToDateKg: 40,
                  })
                }
              >
                L3–L4 fleet
              </button>
              <button
                className="ghost"
                type="button"
                onClick={() => void write("/v1/actions", { intent: "watch", location })}
              >
                L5 watch
              </button>
            </div>
          </section>
        ) : null}

        {tab === "stack" ? (
          <StackView sponsors={ws?.sponsors ?? []} />
        ) : null}
      </main>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
