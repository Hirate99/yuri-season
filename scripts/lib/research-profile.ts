export const researchProfiles = [
  "routine",
  "social-audit",
  "discovery",
  "account-discovery",
] as const;

export type ResearchProfile = typeof researchProfiles[number];

export function parseResearchProfile(
  value: string | null | undefined,
  fallback: ResearchProfile,
): ResearchProfile {
  const profile = value ?? fallback;
  if (!researchProfiles.includes(profile as ResearchProfile)) {
    throw new Error(`--profile must be one of: ${researchProfiles.join(", ")}`);
  }
  return profile as ResearchProfile;
}

export function campaignPathForProfile(profile: ResearchProfile): string {
  return profile === "routine"
    ? ".research-cache/update-plan.json"
    : ".research-cache/discovery-plan.json";
}

export function withDefaultProfile(arguments_: string[], fallback: ResearchProfile): string[] {
  return arguments_.some((argument) => argument.startsWith("--profile="))
    ? arguments_
    : [...arguments_, `--profile=${fallback}`];
}
