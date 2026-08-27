import { gatherClassEvidence } from "./tavily";

export type Signal = {
  kind: "cloud" | "vendor" | "logistics" | "electricity" | "travel" | "hardware" | "office" | "spike";
  class: "compute" | "logistics" | "electricity" | "travel" | "hardware" | "saas" | "direct";
  evidence: string;
  confidence: number;
  spendUsd?: number;
};

export type FolderScan = {
  path: string;
  signals: Signal[];
  fileCount: number;
  scannedAt: number;
};

export type AutoAssessment = {
  classId: string;
  status: "live" | "modeled" | "refused";
  liveNote: string;
  evidence: number;
  grounded: boolean;
  suggestedSpendUsd?: number;
};

export function deriveSignals(scan: { signals: Signal[] }): { classSignals: Record<string, Signal[]>; cloudProvider: string | null } {
  const classSignals: Record<string, Signal[]> = {};
  let cloudProvider: string | null = null;

  for (const s of scan.signals) {
    (classSignals[s.class] ||= []).push(s);
    if (s.kind === "cloud" && !cloudProvider) cloudProvider = s.evidence;
  }

  return { classSignals, cloudProvider };
}

export async function runAutoAssessment(
  env: Env,
  scan: FolderScan,
  subject: string,
): Promise<AutoAssessment[]> {
  const { classSignals, cloudProvider } = deriveSignals(scan);
  const classIds = ["compute", "logistics", "electricity", "travel", "hardware", "saas", "direct"];
  const results: AutoAssessment[] = [];

  for (const classId of classIds) {
    const sigs = classSignals[classId] || [];
    if (sigs.length === 0) {
      results.push({
        classId,
        status: "modeled",
        liveNote: "No signals found in your folder",
        evidence: 0,
        grounded: false,
      });
      continue;
    }

    const gathered = await gatherClassEvidence(env, classId);
    const location = cloudProvider || (classId === "compute" ? "default-region" : "global");
    const totalSpend = sigs.reduce((sum, s) => sum + (s.spendUsd || 0), 0);
    const note = sigs.map((s) => s.evidence).join("; ").slice(0, 200);

    results.push({
      classId,
      status: gathered.grounded ? "live" : "modeled",
      liveNote: `${sigs.length} signal(s): ${note}`,
      evidence: gathered.evidence.length,
      grounded: gathered.grounded,
      suggestedSpendUsd: totalSpend || undefined,
    });
  }

  return results;
}