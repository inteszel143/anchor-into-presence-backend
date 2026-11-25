import type { AppleSubscriber } from "./appleSubscriberTypes";

// Match Apple-provided offer identifiers, never plan duration or catalog price.
export function anchorOfferCode(offerType: unknown, identifier: unknown): "ANCHORVIP" | "ANCHORAMBASSADOR" | null {
  if (offerType !== 3 || typeof identifier !== "string") return null;
  return identifier === "ANCHORVIP" || identifier === "ANCHORAMBASSADOR" ? identifier : null;
}

export function anchorOfferSubscribers(rows: AppleSubscriber[]): AppleSubscriber[] {
  return rows.filter(row => !row.conflict).map(row => ({
    ...row,
    subscriptions: row.subscriptions.filter(sub => anchorOfferCode(sub.offerType, sub.offerIdentifier) !== null),
  })).filter(row => row.subscriptions.length > 0);
}
