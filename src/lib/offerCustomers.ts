import { connectDB } from "@/lib/db";
import { UserPurchase } from "@/models/UserPurchase";
import { User } from "@/models/User";

export type OfferCustomer = {
  status: "matched" | "unmatched" | "conflict";
  name: string | null;
  email: string | null;
};

// Admin reporting only. These are app-recorded associations, not verified ownership.
export async function findOfferCustomers(keys: string[], platform: "ios" | "android"): Promise<Map<string, OfferCustomer>> {
  const result = new Map<string, OfferCustomer>();
  if (!keys.length) return result;
  await connectDB();
  const field = platform === "android" ? "purchaseToken" : "purchaseId";
  const purchases = await UserPurchase.find({
    [field]: { $in: [...new Set(keys)] },
    ...(platform === "ios" ? { $or: [{ platform: "ios" }, { platform: { $exists: false } }] } : { platform }),
  }).select(`${field === "purchaseToken" ? "+purchaseToken" : "purchaseId"} userId`).lean();
  const users = await User.find({ _id: { $in: purchases.map(p => p.userId) } }).select("name email").lean();
  const byId = new Map(users.map(user => [String(user._id), user]));
  for (const key of keys) {
    const ids = [...new Set(purchases.filter(p => p[field] === key).map(p => String(p.userId)))];
    const user = ids.length === 1 ? byId.get(ids[0]) : undefined;
    result.set(key, ids.length > 1 ? { status: "conflict", name: null, email: null } : user
      ? { status: "matched", name: typeof user.name === "string" ? user.name : null, email: typeof user.email === "string" ? user.email : null }
      : { status: "unmatched", name: null, email: null });
  }
  return result;
}
