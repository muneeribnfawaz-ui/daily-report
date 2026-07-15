import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getINRtoSARRate, getCachedRate } from "@/lib/currency";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const rate = await getINRtoSARRate();

    return NextResponse.json({
      success: true,
      data: {
        rate,
        cachedRate: getCachedRate(),
        from: "INR",
        to: "SAR"
      }
    });
  } catch (error) {
    console.error("Failed to fetch exchange rate", error);
    return NextResponse.json({
      success: true,
      data: {
        rate: getCachedRate(),
        cachedRate: getCachedRate(),
        from: "INR",
        to: "SAR",
        fallback: true
      }
    });
  }
}
