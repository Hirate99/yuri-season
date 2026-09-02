import {
  campaignCompletionAudit,
  campaignSummary,
  hasUnfinishedQueries,
  recoverExpiredCampaignQueries,
  type DiscoveryCampaign,
} from "./lib/discovery-campaign";
import { loadResearchEnv, requiredResearchEnv } from "./lib/research-env";
import {
  campaignPathForProfile,
  parseResearchProfile,
  withDefaultProfile,
} from "./lib/research-profile";

const pendingDiffPath = ".research-cache/pending-diff.json";

async function runScript(script: string, args: string[] = []): Promise<number> {
  const child = Bun.spawn([process.execPath, script, ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return child.exited;
}

async function loadCampaign(campaignPath: string): Promise<DiscoveryCampaign | null> {
  const file = Bun.file(campaignPath);
  if (!await file.exists()) return null;
  return file.json() as Promise<DiscoveryCampaign>;
}

async function saveCampaign(campaignPath: string, campaign: DiscoveryCampaign): Promise<void> {
  await Bun.write(campaignPath, JSON.stringify(campaign, null, 2));
}

function option(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function cycle(args: string[]): Promise<void> {
  const profile = parseResearchProfile(option(args, "profile"), "routine");
  const campaignPath = campaignPathForProfile(profile);

  const active = await loadCampaign(campaignPath);
  if (active?.schemaVersion === 3 && recoverExpiredCampaignQueries(active, new Date()) > 0) {
    await saveCampaign(campaignPath, active);
  }
  if (active?.schemaVersion === 3 && hasUnfinishedQueries(active)) {
    if (active.profile && active.profile !== profile) {
      throw new Error(`active ${active.profile} campaign still has unfinished queries; finish it or use --replace explicitly`);
    }
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
    const code = await runScript("scripts/source-diff.ts", ["check", "--profile=routine"]);
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

  const discoveryArgs = withDefaultProfile(
    args.filter((argument) => argument !== "--replace"),
    profile,
  );
  if (!active || active.schemaVersion !== 3 || args.includes("--replace")) discoveryArgs.push("--replace");
  const code = await runScript("scripts/full-discovery.ts", discoveryArgs);
  if (code !== 0) process.exit(code);
}

async function finish(args: string[]): Promise<void> {
  const profile = parseResearchProfile(option(args, "profile"), "routine");
  const campaignPath = campaignPathForProfile(profile);
  const campaign = await loadCampaign(campaignPath);
  if (!campaign || campaign.schemaVersion !== 3) {
    throw new Error("no current v3 research campaign; run research cycle first");
  }
  if (campaign.profile && campaign.profile !== profile) {
    throw new Error(`active ${campaign.profile} campaign does not match requested ${profile} profile`);
  }
  if (recoverExpiredCampaignQueries(campaign, new Date()) > 0) {
    await saveCampaign(campaignPath, campaign);
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
  loadResearchEnv();
  const [routineCampaign, explicitCampaign] = await Promise.all([
    loadCampaign(campaignPathForProfile("routine")),
    loadCampaign(campaignPathForProfile("discovery")),
  ]);
  process.stdout.write(JSON.stringify({
    campaigns: {
      routine: routineCampaign ? campaignSummary(routineCampaign) : null,
      explicit: explicitCampaign ? campaignSummary(explicitCampaign) : null,
    },
    pendingSourceDiff: await Bun.file(pendingDiffPath).exists(),
    environment: {
      radarUrl: Boolean(requiredResearchEnv("YURI_RADAR_URL")),
      adminToken: Boolean(requiredResearchEnv("YURI_ADMIN_TOKEN")),
      accessClient: Boolean(process.env.YURI_ACCESS_CLIENT_ID && process.env.YURI_ACCESS_CLIENT_SECRET),
    },
  }, null, 2));
}

const command = process.argv[2] ?? "status";
const args = process.argv.slice(3);

if (command === "cycle") await cycle(args);
else if (command === "next") process.exit(await runScript("scripts/discovery-campaign.ts", ["next", ...withDefaultProfile(args, "routine")]));
else if (command === "submit") process.exit(await runScript("scripts/discovery-campaign.ts", ["record", ...withDefaultProfile(args, "routine")]));
else if (command === "status") process.exit(await runScript("scripts/discovery-campaign.ts", ["status", ...withDefaultProfile(args, "routine")]));
else if (command === "finish") await finish(args);
else if (command === "doctor") await doctor();
else throw new Error("research command must be cycle, next, submit, status, finish, or doctor");
