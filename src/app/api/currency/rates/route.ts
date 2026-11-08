import { NextResponse } from "next/server";
import { getLiveExchangeRates } from "@/lib/currency/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const base = searchParams.get("base") || "INR";

    const ratesData = await getLiveExchangeRates(base);

    return NextResponse.json({
      success: true,
      data: ratesData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch exchange rates";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
