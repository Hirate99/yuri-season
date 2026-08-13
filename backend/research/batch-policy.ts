import type { BatchCandidate, BatchObservation } from "@/domain";

import type { SourceRecord } from "./types";

function isDeterministicCommunityCandidate(candidate: BatchCandidate, observation: BatchObservation) {
  if (candidate.contentClass !== "community_thread" || candidate.sourceIdentity !== "community") return false;
  if (observation.metadata?.bodyCopied !== false || observation.metadata?.originalOpened !== true) return false;
  const replies = Number(observation.metadata?.repliesObserved ?? 0);
  const views = Number(observation.metadata?.viewsObserved ?? 0);
  return observation.metadata?.hotMarker === true
    || observation.metadata?.sustainedRecentActivity === true
    || replies >= 10
    || views >= 500;
}

export function decideBatchCandidate(candidate: BatchCandidate, source: SourceRecord, observation: BatchObservation) {
  const reasons = [...candidate.review.reasons];
  if (candidate.contentClass === "editorial") {
    return { decision: "reject" as const, reasons: [...reasons, "Editorial and operational content is not public feed material."] };
  }
  if (candidate.review.decision !== "publish") return { decision: candidate.review.decision, reasons };
  if (candidate.contentClass === "fanwork") {
    return { decision: "hold" as const, reasons: [...reasons, "New fan works require an administrator review."] };
  }
  if ((candidate.safetyRating ?? "unknown") !== "safe") {
    return { decision: "hold" as const, reasons: [...reasons, "The safety rating is not eligible for automatic publishing."] };
  }
  if ((candidate.spoilerLevel ?? "none") === "major") {
    return { decision: "hold" as const, reasons: [...reasons, "Major spoilers are not published automatically."] };
  }
  if ((candidate.presentationMode ?? "link_only") !== "link_only") {
    return { decision: "hold" as const, reasons: [...reasons, "Automated batches only support link-only presentation."] };
  }
  const deterministicCommunity = source.trustLevel === "community"
    && isDeterministicCommunityCandidate(candidate, observation);
  if (["community", "unverified"].includes(source.trustLevel) && !deterministicCommunity) {
    return { decision: "hold" as const, reasons: [...reasons, "社区与未验证来源需要人工复核"] };
  }
  const threshold = source.trustLevel === "official" ? 0.88 : 0.92;
  if (candidate.review.confidence < threshold) {
    return { decision: "hold" as const, reasons: [...reasons, `Confidence is below ${threshold}.`] };
  }
  return { decision: "publish" as const, reasons };
}
