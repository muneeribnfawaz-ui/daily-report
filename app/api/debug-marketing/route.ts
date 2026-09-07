import { NextResponse } from "next/server";
import db from "@/lib/db";
export async function GET() {
  const reports = await db.dailyReport.findMany({
    orderBy: { createdAt: "desc" },
    include: { marketingSelfItems: true, marketingClientItems: true },
    take: 5
  });
  return NextResponse.json(reports.map(r => ({
    name: r.name,
    teamName: r.teamName,
    selfCount: r.marketingSelfItems?.length,
    clientCount: r.marketingClientItems?.length
  })));
}
