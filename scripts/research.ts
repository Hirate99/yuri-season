import {
  campaignCompletionAudit,
  campaignSummary,
  hasUnfinishedQueries,
  type DiscoveryCampaign,
} from "./lib/discovery-campaign";

const campaignPath = ".research-cache/discovery-plan.json";
const pendingDiffPath = ".research-cache/pending-diff.json";

async function runScript(script: string, args: string[] = []): Promise<number> {
  const child = Bun.spawn([process.execPath, script, ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return child.exited;
}

async function loadCampaign(): Promise<DiscoveryCampaign | null> {
  const file = Bun.file(campaignPath);
  if (!await file.exists()) return null;
  return file.json() as Promise<DiscoveryCampaign>;
}

function option(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function cycle(args: string[]): Promise<void> {
  const profile = option(args, "profile") ?? "routine";
  if (!["routine", "social-audit"].includes(profile)) {
    throw new Error("--profile must be routine or social-audit");
  }

  const active = await loadCampaign();
  if (active?.schemaVersion === 3 && hasUnfinishedQueries(active)) {
    process.stdout.write(JSON.stringify({ resumed: true, ...campaignSummary(active) }, null, 2));
    return;
  }

  if (profile === "routine") {
    if (await Bun.file(pendingDiffPath).exists()) {
      process.stdout.write(JSON.stringify({
        state: "pending_source_diff",
        path: pendingDiffPath,
        next: "process/import the pending diff, then run research cycle again",
      }, null, 2));
      return;
    }
    const code = await runScript("scripts/source-diff.ts", ["check"]);
    if (code !== 0) process.exit(code);
    if (await Bun.file(pendingDiffPath).exists()) {
      process.stdout.write(JSON.stringify({
        state: "pending_source_diff",
        path: pendingDiffPath,
        next: "process/import the pending diff, then run research cycle again",
      }, null, 2));
      return;
    }
  }

  const discoveryArgs = args.filter((argument) => argument !== "--replace");
  if (!active || active.schemaVersion !== 3 || args.includes("--replace")) discoveryArgs.push("--replace");
  const code = await runScript("scripts/full-discovery.ts", discoveryArgs);
  if (code !== 0) process.exit(code);
}

async function finish(): Promise<void> {
  const campaign = await loadCampaign();
  if (!campaign || campaign.schemaVersion !== 3) {
    throw new Error("no current v3 research campaign; run research cycle first");
  }
  const summary = campaignSummary(campaign);
  const converged = summary.pending === 0 && summary.leased === 0;
  const audit = campaignCompletionAudit(campaign);
  const coverageComplete = converged && summary.blocked === 0 && audit.anomalies.length === 0;
  process.stdout.write(JSON.stringify({
    ...summary,
    converged,
    coverageComplete,
    audit,
    message: !converged
      ? "due work remains"
      : coverageComplete ? "all planned coverage completed"
        : audit.anomalies.length > 0 ? "coverage completed with suspicious cross-account results"
          : "campaign converged with platform blockers",
  }, null, 2));
  if (!coverageComplete) process.exitCode = 1;
}

async function doctor(): Promise<void> {
  const campaign = await loadCampaign();
  process.stdout.write(JSON.stringify({
    campaignSchema: campaign?.schemaVersion ?? null,
    campaign: campaign ? campaignSummary(campaign) : null,
    pendingSourceDiff: await Bun.file(pendingDiffPath).exists(),
    environment: {
      radarUrl: Boolean(process.env.YURI_RADAR_URL),
      adminToken: Boolean(process.env.YURI_ADMIN_TOKEN),
      accessClient: Boolean(process.env.YURI_ACCESS_CLIENT_ID && process.env.YURI_ACCESS_CLIENT_SECRET),
    },
  }, null, 2));
}

const command = process.argv[2] ?? "status";
const args = process.argv.slice(3);

if (command === "cycle") await cycle(args);
else if (command === "next") process.exit(await runScript("scripts/discovery-campaign.ts", ["next", ...args]));
else if (command === "submit") process.exit(await runScript("scripts/discovery-campaign.ts", ["record", ...args]));
else if (command === "status") process.exit(await runScript("scripts/discovery-campaign.ts", ["status"]));
else if (command === "finish") await finish();
else if (command === "doctor") await doctor();
else throw new Error("research command must be cycle, next, submit, status, finish, or doctor");
