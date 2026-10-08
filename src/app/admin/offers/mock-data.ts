// Fixed snapshot keeps this UI prototype predictable; no live purchase data.
export const snapshotDate = "2026-10-08";
export const redemptions = [
  { id: "demo-01", name: "Maya Reyes", email: "maya.reyes@example.com", code: "ANCHORVIP", plan: "Annual", redeemed: "2025-10-11", expires: "2026-10-11" },
  { id: "demo-02", name: "Oliver Chen", email: "oliver.chen@example.com", code: "ANCHORAMBASSADOR", plan: "Monthly", redeemed: "2026-09-15", expires: "2026-10-15" },
  { id: "demo-03", name: "Sofia Patel", email: "sofia.patel@example.com", code: "ANCHORVIP", plan: "Annual", redeemed: "2025-10-22", expires: "2026-10-22" },
  { id: "demo-04", name: "Liam Santos", email: "liam.santos@example.com", code: "ANCHORAMBASSADOR", plan: "Annual", redeemed: "2025-11-02", expires: "2026-11-02" },
  { id: "demo-05", name: "Amara Wilson", email: "amara.wilson@example.com", code: "ANCHORVIP", plan: "Annual", redeemed: "2026-02-14", expires: "2027-02-14" },
  { id: "demo-06", name: "Noah Kim", email: "noah.kim@example.com", code: "ANCHORAMBASSADOR", plan: "Annual", redeemed: "2026-06-01", expires: "2027-06-01" },
  { id: "demo-07", name: "Isabella Cruz", email: "isabella.cruz@example.com", code: "ANCHORVIP", plan: "Annual", redeemed: "2025-10-03", expires: "2026-10-03" },
  { id: "demo-08", name: "Ethan Brooks", email: "ethan.brooks@example.com", code: "ANCHORAMBASSADOR", plan: "Monthly", redeemed: "2026-08-24", expires: "2026-09-24" },
];

export function daysRemaining(expires: string) {
  return Math.round((Date.parse(expires) - Date.parse(snapshotDate)) / 86_400_000);
}

export function offerStatus(expires: string) {
  const days = daysRemaining(expires);
  return days < 0 ? "Expired" : days <= 30 ? "Ending soon" : "Active";
}

export const endingSoonCount = redemptions.filter(row => offerStatus(row.expires) === "Ending soon").length;

export function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}
