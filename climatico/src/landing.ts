const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Climatico — Calculate impact, suggest alternatives, settle &amp; refund</title>
<meta name="description" content="Calculate environmental impact from business activity, discover greener alternatives, and handle automated offset settlement and refunds." />
<meta property="og:title" content="Climatico" />
<meta property="og:description" content="Calculate environmental impact, discover greener alternatives, settle and refund." />
<meta property="og:type" content="website" />
<link rel="icon" href="/assets/climatico-logo.svg" type="image/svg+xml" />
<style>
  :root {
    --paper: #fbfaf6;
    --ink: #1d2820;
    --muted: #5b6a62;
    --muted-2: #8a958e;
    --line: #e3e8e0;
    --accent: #2f7d5b;
    --accent-deep: #1f5a40;
    --clay: #b96846;
    --leaf: #7fb84f;
    --shadow: 0 2px 8px rgba(15, 28, 20, 0.04);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", "Inter", sans-serif;
    color: var(--ink);
    background: var(--paper);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 880px; margin: 0 auto; padding: 56px 24px 96px; }
  header { display: flex; align-items: center; gap: 14px; margin-bottom: 56px; }
  header img { display: block; }
  header .sub {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted-2);
  }
  h1 {
    font-family: "Newsreader", "Iowan Old Style", "Georgia", serif;
    font-weight: 500;
    font-size: clamp(2rem, 4.4vw, 3rem);
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0 0 16px;
  }
  .lede {
    font-size: 18px;
    color: var(--muted);
    max-width: 62ch;
    margin: 0 0 36px;
  }
  .lede b { color: var(--ink); font-weight: 600; }
  .pitch {
    display: grid; gap: 14px;
    grid-template-columns: 1fr;
    margin: 0 0 44px;
  }
  .pitch .row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  }
  .card {
    background: white;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
    box-shadow: var(--shadow);
  }
  .card h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
  }
  .card p {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
  }
  .kicker {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--accent-deep);
    display: inline-flex; align-items: center; gap: 6px;
    margin-bottom: 8px;
  }
  .kicker .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--leaf); display: inline-block; }
  .cta-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 0 0 56px; }
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 15px; font-weight: 600;
    text-decoration: none;
    border: 1px solid var(--accent);
    transition: all 0.15s ease;
  }
  .btn.primary { background: var(--accent); color: white; }
  .btn.primary:hover { background: var(--accent-deep); }
  .btn.ghost { background: white; color: var(--accent); }
  .btn.ghost:hover { background: #f4f7f3; }
  .meta {
    display: flex; flex-wrap: wrap; gap: 24px;
    padding: 20px 0; margin: 0 0 32px;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .meta .item { display: flex; flex-direction: column; gap: 2px; }
  .meta .item .v { font-family: "Newsreader", "Iowan Old Style", "Georgia", serif; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
  .meta .item .k { font-size: 12px; color: var(--muted); }
  .meta .item .k.ok { color: var(--accent); }
  .probe {
    background: #f4f5f1;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 16px 20px;
    margin: 0 0 32px;
    font-size: 13px;
  }
  .probe .kicker { color: var(--muted); margin-bottom: 10px; }
  .probe code {
    font-family: ui-monospace, "SF Mono", "Monaco", "Cascadia Code", monospace;
    background: white;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--line);
    font-size: 12px;
  }
  .probe ol { margin: 0; padding-left: 18px; color: var(--muted); }
  .probe li { margin-bottom: 4px; }
  footer {
    font-size: 13px;
    color: var(--muted-2);
    border-top: 1px solid var(--line);
    padding-top: 24px;
  }
  footer a { color: var(--muted); text-decoration: underline; text-decoration-color: var(--line); }
  footer a:hover { color: var(--accent); }
  @media (max-width: 640px) {
    .wrap { padding: 32px 18px 64px; }
    .pitch .row { grid-template-columns: 1fr; }
    .meta { gap: 16px; }
  }
</style>
</head>
<body>
<div class="wrap">

<header>
  <img src="/assets/climatico-logo.svg" alt="Climatico" width="148" height="40" />
  <span class="sub">desk</span>
</header>

<h1>Calculate impact. Suggest alternatives. Settle and refund.</h1>
<p class="lede">
  <b>Climatico</b> ingests business activity (cloud spend, freight lanes, electricity, vendors), calculates carbon impact backed by live web evidence, suggests lower-carbon alternatives, and handles automated offset settlement and refunds.
</p>

<div class="cta-row">
  <a class="btn primary" href="/app">Open the workspace →</a>
  <a class="btn ghost" href="/deck.html">View the pitch deck</a>
</div>

<div class="meta" id="meta">
  <div class="item"><div class="v" id="m-committed">—</div><div class="k">writes committed</div></div>
  <div class="item"><div class="v" id="m-fleet">—</div><div class="k">fleet calculations</div></div>
  <div class="item"><div class="v" id="m-status">…</div><div class="k" id="m-status-k">checking</div></div>
</div>

<div class="pitch">
  <div class="row">
    <div class="card">
      <span class="kicker"><span class="dot"></span>1. Ingest Business Signals</span>
      <h3>Cloud, freight &amp; vendors</h3>
      <p>Scans business activity at the moment of creation — a cloud bill spike, a shipping booking, a vendor seat count — with strict local privacy (metadata only, zero file contents).</p>
    </div>
    <div class="card">
      <span class="kicker"><span class="dot"></span>2. Calculate Carbon Impact</span>
      <h3>Grounded in live evidence</h3>
      <p>Calculates emissions across seven business classes. Compute is scored from live spend and web factors (Tavily); logistics and energy are backed by transport modes and grid factors.</p>
    </div>
  </div>
  <div class="row">
    <div class="card">
      <span class="kicker"><span class="dot"></span>3. Discover Greener Alternatives</span>
      <h3>Same business, run differently</h3>
      <p>Workers AI &amp; Tavily research actionable reductions for each hotspot: shifting batch compute to clean-grid regions (e.g. FRA), moving freight to rail, or adopting solar PPAs.</p>
    </div>
    <div class="card">
      <span class="kicker"><span class="dot"></span>4. Settle &amp; Claim Refunds</span>
      <h3>Automated payment &amp; refunds</h3>
      <p>Settles token-capped offset receipts when over budget. When switching to a lower-carbon option, automatically claim back the delta refund on prior offsets.</p>
    </div>
  </div>
</div>

<div class="probe">
  <span class="kicker">Try it in 5 calls</span>
  <ol>
    <li>Discover: <code>GET /ai-agent.json</code></li>
    <li>Mint a scoped credential: <code>POST /v1/credentials</code> — scopes freeze at mint</li>
    <li>Calculate fleet spend: <code>POST /v1/fleet/run</code> — <code>SJC</code>, <code>$420</code> → <code>189 kg</code></li>
    <li>Calculate freight shipment: <code>POST /v1/actions</code> with <code>intent: freight, weightKg: 8000, distanceKm: 11000, freightMode: sea</code></li>
    <li>Switch to green option &amp; claim refund: <code>POST /v1/actions</code> with <code>intent: switch, newSolution: "FRA clean grid", priorAmountCents: 3580, amountCents: 500</code></li>
  </ol>
</div>

<footer>
  <p>
    <a href="/app">Workspace</a> ·
    <a href="/deck.html">Deck</a> ·
    <a href="/ai-agent.json">ai-agent.json</a> ·
    <a href="/.well-known/agent-card.json">agent card</a> ·
    <a href="https://github.com/jin-dalrae/agent-natives-climatico">GitHub</a>
  </p>
  <p style="margin-top:8px;">
    Built at the Agent Natives Builders Hackathon · Cloudflare SF · 26–27 Aug 2026.
  </p>
</footer>

</div>

<script>
  (async () => {
    try {
      const r = await fetch('/v1/dashboard');
      if (!r.ok) throw new Error('not ok');
      const d = await r.json();
      document.getElementById('m-committed').textContent = d.committed ?? 0;
      document.getElementById('m-fleet').textContent = d.fleetRuns ?? 0;
      document.getElementById('m-status').textContent = 'LIVE';
      document.getElementById('m-status-k').textContent = 'system status';
      document.getElementById('m-status-k').className = 'k ok';
    } catch (e) {
      document.getElementById('m-status').textContent = 'OFFLINE';
      document.getElementById('m-status-k').textContent = 'system status';
      document.getElementById('m-status-k').className = 'k no';
    }
  })();
</script>
</body>
</html>`;

export function landingPage(): string {
  return LANDING_HTML;
}
