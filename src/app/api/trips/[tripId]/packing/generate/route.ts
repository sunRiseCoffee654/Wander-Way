import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePackingRecommendations } from "@/lib/ai/packing";

interface RouteParams {
  params: Promise<{ tripId: string }>;
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { tripId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();

    let destination = body.destination || "Kyoto, Japan";
    let startDate = body.startDate;
    let endDate = body.endDate;
    const activities: string[] = body.activities || [];

    // If real trip from database, fetch trip metadata
    if (!tripId.startsWith("mock-")) {
      const { data: trip } = await supabase
        .from("trips")
        .select("destination_name, start_date, end_date")
        .eq("id", tripId)
        .single();

      if (trip) {
        destination = trip.destination_name;
        startDate = trip.start_date;
        endDate = trip.end_date;
      }
    }

    // Call Gemini AI Packing Engine
    const result = await generatePackingRecommendations({
      destination,
      startDate,
      endDate,
      activities,
    });

    // If real database trip, persist items into public.packing_items
    if (!tripId.startsWith("mock-")) {
      try {
        const itemsToInsert = result.items.map((it) => ({
          trip_id: tripId,
          category: it.category,
          item_name: it.item_name,
          notes: `${it.reason} (Qty: ${it.quantity})`,
          quantity: it.quantity,
          is_suggested: true,
          is_packed: false,
        }));

        await supabase.from("packing_items").insert(itemsToInsert);
      } catch (dbErr) {
        console.warn("Could not persist packing items to Supabase:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      tripId,
      destination,
      weather: result.weather_overview,
      summary: result.summary,
      items: result.items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate packing list";
    console.error("Packing generation error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
