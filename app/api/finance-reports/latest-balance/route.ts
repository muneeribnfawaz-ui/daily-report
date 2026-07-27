import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFinanceReport } from "@/lib/permissions";
import FinanceReport from "@/models/FinanceReport";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!canCreateFinanceReport(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    
    // Find the most recently submitted finance report
    const latestReport = (await FinanceReport.findOne()
      .sort({ reportDate: -1, createdAt: -1 })
      .select("closingCashBalance reportDate")
      .lean()) as { closingCashBalance?: number; reportDate?: string } | null;

    return NextResponse.json({ 
      success: true, 
      data: {
        openingBalance: latestReport?.closingCashBalance ?? 0,
        lastReportDate: latestReport?.reportDate ?? null
      } 
    });
  } catch (error) {
    console.error("Failed to fetch latest finance balance", error);
    return NextResponse.json({ success: false, message: "Failed to fetch latest balance" }, { status: 500 });
  }
}
