import {
  campaignCompletionAudit,
  campaignSummary,
  hasUnfinishedQueries,
  recoverExpiredCampaignQueries,
  type DiscoveryCampaign,
} from "./lib/discovery-campaign";
import { loadResearchEnv, requiredResearchEnv } from "./lib/research-env";
import { readResearchJson, writeResearchJson } from "./lib/research-cache";
import type { SourceBacklog } from "./lib/source-backlog";
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

function option(args: string[], name: string): string | null {
  const prefix = `--${name}=`;

  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export async function cycle(args: string[], run = runScript): Promise<void> {
  const profile = parseResearchProfile(option(args, "profile"), "routine");
  const campaignPath = campaignPathForProfile(profile);

  // Source detection and timeline planning are independent. A failed source check
  // is reported, but never prevents planning or resuming timeline work.
  let sourceCode: number | null = null;
  if (profile === "routine") {
    sourceCode = await run("scripts/source-diff.ts", ["check", "--profile=routine"]);
    if (sourceCode !== 0) {
      process.stderr.write("Source check failed; continuing timeline planning.\n");
      process.exitCode = sourceCode;
    }
  }

  const active = await readResearchJson<DiscoveryCampaign | null>(campaignPath, null);

  if (active?.schemaVersion === 3 && recoverExpiredCampaignQueries(active, new Date()) > 0) {
    await writeResearchJson(campaignPath, active);
  }

  if (active?.schemaVersion === 3 && hasUnfinishedQueries(active)) {
    if (active.profile && active.profile !== profile) {
      throw new Error(
        `active ${active.profile} campaign still has unfinished queries; finish it or use --replace explicitly`,
      );
    }

    process.stdout.write(
      JSON.stringify(
        {
          stages: { sources: sourceCode, timelines: "resumed" },
          resumed: true,
          ...campaignSummary(active),
        },
        null,
        2,
      ),
    );

    return;
  }

  const discoveryArgs = withDefaultProfile(
    args.filter((argument) => argument !== "--replace"),
    profile,
  );

  if (!active || active.schemaVersion !== 3 || args.includes("--replace"))
    discoveryArgs.push("--replace");

  const code = await run("scripts/full-discovery.ts", discoveryArgs);
  process.stdout.write(
    JSON.stringify(
      {
        stages: { sources: sourceCode, timelines: code },
        next:
          code === 0
            ? "inspect planned timelines and ready stories; resolve source issues independently"
            : "timeline planning failed; continue available source and story work",
      },
      null,
      2,
    ),
  );
  if (code !== 0) process.exitCode = code;
}

async function finish(args: string[]): Promise<void> {
  const profile = parseResearchProfile(option(args, "profile"), "routine");
  const campaignPath = campaignPathForProfile(profile);
  const campaign = await readResearchJson<DiscoveryCampaign | null>(campaignPath, null);

  if (!campaign || campaign.schemaVersion !== 3) {
    throw new Error("no current v3 research campaign; run research cycle first");
  }

  if (campaign.profile && campaign.profile !== profile) {
    throw new Error(
      `active ${campaign.profile} campaign does not match requested ${profile} profile`,
    );
  }

  if (recoverExpiredCampaignQueries(campaign, new Date()) > 0) {
    await writeResearchJson(campaignPath, campaign);
  }

  const summary = campaignSummary(campaign);
  const converged = summary.pending === 0 && summary.leased === 0;
  const audit = campaignCompletionAudit(campaign);
  const coverageComplete = converged && summary.blocked === 0 && audit.anomalies.length === 0;
  const sourceBacklog =
    profile === "routine"
      ? await readResearchJson<SourceBacklog | null>(pendingDiffPath, null)
      : null;
  const pendingSourceChanges =
    profile === "routine"
      ? (sourceBacklog?.catalogChanges.length ?? 0) + (sourceBacklog?.feedChanges.length ?? 0)
      : null;
  const sourceErrors = sourceBacklog?.errors ?? [];

  process.stdout.write(
    JSON.stringify(
      {
        ...summary,
        scope: "campaign_snapshot_only",
        editorialCompletion: "requires_source_content_and_public_readback_reconciliation",
        pendingSourceChanges,
        sourceErrors,
        converged,
        coverageComplete,
        audit,
        message: !converged
          ? "due work remains"
          : coverageComplete
            ? "all planned coverage completed"
            : audit.anomalies.length > 0
              ? "coverage completed with suspicious cross-account results"
              : "campaign converged with platform blockers",
      },
      null,
      2,
    ),
  );
  if (!coverageComplete || (pendingSourceChanges ?? 0) > 0 || sourceErrors.length > 0)
    process.exitCode = 1;
}

async function doctor(): Promise<void> {
  loadResearchEnv();

  const [routineCampaign, explicitCampaign, backlog] = await Promise.all([
    readResearchJson<DiscoveryCampaign | null>(campaignPathForProfile("routine"), null),
    readResearchJson<DiscoveryCampaign | null>(campaignPathForProfile("discovery"), null),
    readResearchJson<SourceBacklog | null>(pendingDiffPath, null),
  ]);

  process.stdout.write(
    JSON.stringify(
      {
        campaigns: {
          routine: routineCampaign ? campaignSummary(routineCampaign) : null,
          explicit: explicitCampaign ? campaignSummary(explicitCampaign) : null,
        },
        pendingSourceChanges:
          (backlog?.catalogChanges.length ?? 0) + (backlog?.feedChanges.length ?? 0),
        sourceErrors: backlog?.errors ?? [],
        environment: {
          radarUrl: Boolean(requiredResearchEnv("YURI_RADAR_URL")),
          adminToken: Boolean(requiredResearchEnv("YURI_ADMIN_TOKEN")),
          accessClient: Boolean(
            process.env.YURI_ACCESS_CLIENT_ID && process.env.YURI_ACCESS_CLIENT_SECRET,
          ),
        },
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) {
  const command = process.argv[2] ?? "status";
  const args = process.argv.slice(3);

  if (command === "cycle") await cycle(args);
  else if (command === "sources")
    process.exit(await runScript("scripts/source-diff.ts", ["check", "--profile=routine"]));
  else if (command === "plan")
    process.exit(await runScript("scripts/full-discovery.ts", withDefaultProfile(args, "routine")));
  else if (command === "next" || command === "submit" || command === "status")
    process.exit(
      await runScript("scripts/discovery-campaign.ts", [
        command === "submit" ? "record" : command,
        ...withDefaultProfile(args, "routine"),
      ]),
    );
  else if (command === "finish") await finish(args);
  else if (command === "doctor") await doctor();
  else
    throw new Error(
      "research command must be sources, plan, cycle, next, submit, status, finish, or doctor",
    );
}
