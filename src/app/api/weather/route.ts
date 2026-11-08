import { NextResponse } from "next/server";
import { getDestinationWeather } from "@/lib/weather/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination") || "Kyoto, Japan";
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    const lat = latStr ? parseFloat(latStr) : undefined;
    const lon = lonStr ? parseFloat(lonStr) : undefined;

    const weather = await getDestinationWeather(destination, lat, lon);

    return NextResponse.json({
      success: true,
      data: weather,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch weather";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
