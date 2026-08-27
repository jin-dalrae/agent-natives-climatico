import { Agent, callable, getAgentByName } from "agents";
import { getLedger } from "./ledger";
import type { FleetRun } from "./types";

/**
 * Simulates an Orepath employee's agent that monitors cloud spend and
 * proactively files fleet runs. Runs on alarm every ~15 min.
 */
export class OrepathAgent extends Agent<Env, { lastSpend: number; runsFiled: number; active: boolean }> {
  initialState = { lastSpend: 0, runsFiled: 0, active: true };

  async onStart() {
    // nothing yet
  }

  async alarm() {
    if (!this.state.active) return;
    const now = Date.now();
    const hour = new Date(now).getHours();
    // Only run during working hours (8am-8pm)
    if (hour < 8 || hour >= 20) {
      await this.ctx.storage.setAlarm(now + 30 * 60 * 1000);
      return;
    }

    const ledger = await getLedger(this.env);
    const minted = await ledger.mintCredential({
      subject: "orepath-agent:compute-watcher",
      scopes: ["climatico:read", "climatico:transact"],
    });

    // Simulate varying cloud spend (realistic: $200-$600 random spikes)
    const spend = Math.round(200 + Math.random() * 400);
    const locations = ["SJC", "PDX", "IAD", "LHR"];
    const loc = locations[Math.floor(Math.random() * locations.length)];

    const run = await ledger.runFleet({
      source: "cloud",
      location: loc,
      spendUsd: spend,
      monthlyBudgetKg: 50,
      monthToDateKg: Math.round(30 + Math.random() * 40),
    }, minted.principal);

    this.setState({
      lastSpend: spend,
      runsFiled: this.state.runsFiled + 1,
      active: true,
    });

    console.log(JSON.stringify({
      message: "orepath agent filed fleet run",
      location: loc,
      spend,
      status: run.status,
      runsFiled: this.state.runsFiled + 1,
    }));

    // Next check in 15 min
    await this.ctx.storage.setAlarm(now + 15 * 60 * 1000);
  }

  @callable()
  getStatus() {
    return {
      agent: "orepath:compute-watcher",
      runsFiled: this.state.runsFiled,
      lastSpend: this.state.lastSpend,
      active: this.state.active,
    };
  }

  @callable()
  start() {
    this.setState({ ...this.state, active: true });
    this.ctx.storage.setAlarm(Date.now() + 10_000);
    return { ok: true };
  }

  @callable()
  stop() {
    this.setState({ ...this.state, active: false });
    this.ctx.storage.deleteAlarm();
    return { ok: true };
  }
}

export async function getOrepathAgent(env: Env) {
  return getAgentByName(env.OrepathAgent, "main") as unknown as InstanceType<typeof OrepathAgent>;
}

export type OrepathAgentApi = {
  getStatus: () => Promise<{ agent: string; runsFiled: number; lastSpend: number; active: boolean }>;
  start: () => Promise<{ ok: boolean }>;
  stop: () => Promise<{ ok: boolean }>;
};