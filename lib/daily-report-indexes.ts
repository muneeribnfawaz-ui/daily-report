import DailyReport from "@/models/DailyReport";

let syncPromise: Promise<void> | null = null;

export async function ensureDailyReportIndexes() {
  if (!syncPromise) {
    syncPromise = (async () => {
            await DailyReport.syncIndexes();
    })().catch((error) => {
      syncPromise = null;
      throw error;
    });
  }

  return syncPromise;
}
