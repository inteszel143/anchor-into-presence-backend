import { connectDB } from "@/lib/db";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      console.log("[Bootstrap] Connecting to database...");
      await connectDB();
      console.log("[Bootstrap] Restoring active cron jobs...");
      const { restoreCronJobs } = await import("@/cron/restoreCronJobs");
      await restoreCronJobs();
      console.log("[Bootstrap] Cron jobs restoration completed successfully.");
    } catch (error) {
      console.error("[Bootstrap] Error initializing crons on startup:", error);
    }
  }
}
