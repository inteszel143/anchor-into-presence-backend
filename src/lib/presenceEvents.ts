import { randomUUID } from "node:crypto";
import { PresenceRevision } from "@/models/PresenceRevision";

// A shared invalidation marker works with standalone MongoDB and multiple workers.
export async function publishPresenceChange() {
  await PresenceRevision.updateOne({ _id: "users" }, { $set: { revision: randomUUID() } }, { upsert: true });
}
export async function presenceRevision(): Promise<string> {
  const value = await PresenceRevision.findById("users").lean<{ revision: string }>();
  return value?.revision ?? "initial";
}
