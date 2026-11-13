import { NextResponse } from "next/server";
import { getCountryAdvisory } from "@/lib/advisories/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination") || "Jaipur, Rajasthan";

    const advisory = getCountryAdvisory(destination);

    return NextResponse.json({
      success: true,
      data: advisory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch advisory";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
