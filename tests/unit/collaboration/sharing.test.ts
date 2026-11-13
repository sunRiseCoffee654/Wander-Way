import { describe, it, expect } from "vitest";
import {
  sendTripEmailInvitation,
  getTripInvitations,
  getInvitationByCode,
  acceptTripInvitation,
  revokeTripInvitation,
  getTripMembers,
} from "@/lib/collaboration/actions";
import {
  addCustomPackingItem,
  assignPackingItem,
  getPackingItems,
} from "@/lib/packing/actions";

describe("Trip Email Sharing & Multi-Traveler Collaboration", () => {
  const tripId = "test-trip-collab-1";

  it("sends an email invitation with valid code, shareUrl, and mailto link", async () => {
    const invite = await sendTripEmailInvitation({
      tripId,
      invitedEmail: "chennamvishnu123@gmail.com",
      role: "editor",
      inviterName: "Alice Organizer",
      tripTitle: "Kyoto Autumn Expedition",
      destination: "Kyoto, Japan",
      personalMessage: "Join me to plan our temple and tea ceremony days!",
    });

    expect(invite).toBeDefined();
    expect(invite.success).toBe(true);
    expect(invite.invitation.invited_email).toBe("chennamvishnu123@gmail.com");
    expect(invite.invitation.role).toBe("editor");
    expect(invite.inviteCode).toMatch(/^WW-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(invite.shareUrl).toContain(`/trips/join?code=${invite.inviteCode}`);
    expect(invite.mailtoUrl).toContain("mailto:chennamvishnu123@gmail.com");
    expect(invite.mailtoUrl).toContain(encodeURIComponent("Kyoto Autumn Expedition"));
    expect(invite.invitation.inviter_name).toBe("Alice Organizer");
  });

  it("validates that invalid emails are rejected", async () => {
    await expect(
      sendTripEmailInvitation({
        tripId,
        invitedEmail: "invalid-email-no-at",
        role: "editor",
      })
    ).rejects.toThrow("valid email address");
  });

  it("lists pending invitations for a trip", async () => {
    const invitations = await getTripInvitations(tripId);
    expect(Array.isArray(invitations)).toBe(true);
    const found = invitations.find((i) => i.invited_email === "chennamvishnu123@gmail.com");
    expect(found).toBeDefined();
    expect(found?.status).toBe("pending");
  });

  it("retrieves invitation details by invite code", async () => {
    const created = await sendTripEmailInvitation({
      tripId,
      invitedEmail: "contributor@wanderway.app",
      role: "viewer",
      tripTitle: "Kyoto Journey",
    });

    const fetched = await getInvitationByCode(created.inviteCode);
    expect(fetched.valid).toBe(true);
    expect(fetched.invitation?.invited_email).toBe("contributor@wanderway.app");
    expect(fetched.invitation?.role).toBe("viewer");
  });

  it("allows invited user to accept invitation and enroll into trip members", async () => {
    const invite = await sendTripEmailInvitation({
      tripId: "test-trip-accept",
      invitedEmail: "chennamvishnu123@gmail.com",
      role: "editor",
      tripTitle: "Tokyo Food Tour",
    });

    const result = await acceptTripInvitation(invite.inviteCode, "Vishnu Chennam");
    expect(result.success).toBe(true);
    expect(result.tripId).toBe("test-trip-accept");
    expect(result.role).toBe("editor");

    // Verify member exists in trip members
    const members = await getTripMembers("test-trip-accept");
    const member = members.find(
      (m) =>
        m.profile?.display_name === "Vishnu Chennam" ||
        m.profile?.email === "chennamvishnu123@gmail.com"
    );
    expect(member).toBeDefined();
    expect(member?.role).toBe("editor");
  });

  it("allows revoking an invitation so it can no longer be accepted", async () => {
    const invite = await sendTripEmailInvitation({
      tripId: "test-trip-revoke",
      invitedEmail: "revoked@wanderway.app",
      role: "viewer",
    });

    await revokeTripInvitation("test-trip-revoke", invite.invitation.id);

    const res = await acceptTripInvitation(invite.inviteCode, "Revoked User");
    expect(res.success).toBe(false);
    expect(res.error).toContain("revoked");
  });
});

describe("Multi-Traveler Packing Collaboration", () => {
  const tripId = "test-trip-packing-collab";

  it("allows adding custom items with contributor assignment", async () => {
    const item = await addCustomPackingItem(
      tripId,
      "Universal Power Adapter (Type A/C)",
      "electronics_adapters",
      "Shared gear for hotel room charging",
      2,
      "chennamvishnu123@gmail.com",
      "Alice Organizer"
    );

    expect(item).toBeDefined();
    expect(item.item_name).toBe("Universal Power Adapter (Type A/C)");
    expect(item.assigned_to_name).toBe("chennamvishnu123@gmail.com");
    expect(item.created_by_name).toBe("Alice Organizer");
  });

  it("allows claiming or reassigning gear items between travelers", async () => {
    // Add item without assignee
    const item = await addCustomPackingItem(
      tripId,
      "Compact Travel Umbrella",
      "weather_climate",
      "Waterproof wind-resistant canopy",
      1,
      undefined,
      "Alice Organizer"
    );

    // Another traveler claims the item
    const res = await assignPackingItem(tripId, item.id, "Marco Chen");
    expect(res.success).toBe(true);

    const items = await getPackingItems(tripId);
    const updated = items.find((i) => i.id === item.id);
    expect(updated?.assigned_to_name).toBe("Marco Chen");
  });
});
