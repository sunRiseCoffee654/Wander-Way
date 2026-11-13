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

    // 1. Enforce authentication
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tripId);
    const isMock = tripId.startsWith("mock-");

    if (!isUuid && !isMock) {
      return NextResponse.json({ error: "Invalid trip ID format" }, { status: 400 });
    }

    let destination = body.destination || "Jaipur, Rajasthan";
    let startDate = body.startDate;
    let endDate = body.endDate;
    const activities: string[] = body.activities || [];

    // If real trip from database, fetch trip metadata and verify authorization
    if (!isMock) {
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .select("destination, start_date, end_date, owner_id")
        .eq("id", tripId)
        .maybeSingle();

      if (tripErr || !trip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }

      // Check if user is owner or editor in trip_members
      if (trip.owner_id !== user.id) {
        const { data: member } = await supabase
          .from("trip_members")
          .select("role")
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!member || (member.role !== "editor" && member.role !== "owner")) {
          return NextResponse.json({ error: "Forbidden: editor or owner access required" }, { status: 403 });
        }
      }

      destination = trip.destination || destination;
      startDate = trip.start_date || startDate;
      endDate = trip.end_date || endDate;
    }

    // Call Gemini AI Packing Engine
    const result = await generatePackingRecommendations({
      destination,
      startDate,
      endDate,
      activities,
    });

    // If real database trip, persist items into public.packing_items
    if (!isMock) {
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

        const { error: insertError } = await supabase.from("packing_items").insert(itemsToInsert);
        if (insertError) {
          console.warn("Could not persist packing items to Supabase:", insertError);
        }
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
