"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { PackingItemRecommendation } from "@/lib/ai/packing";
import {
  togglePackingItem,
  addCustomPackingItem,
  deletePackingItem,
  assignPackingItem,
  type PackingItemRecord,
} from "@/lib/packing/actions";
import { TripShareButton } from "@/components/trips/trip-share-button";

interface StitchPackingViewProps {
  tripId: string;
  tripTitle?: string;
  destination?: string;
  initialItems: PackingItemRecord[];
  weatherOverview?: {
    expected_conditions?: string;
    temperature_range?: string;
    rain_risk?: "low" | "moderate" | "high";
  };
}

const CATEGORIES = [
  { id: "all", label: "All Items", icon: "inventory_2" },
  { id: "weather_climate", label: "Weather & Climate", icon: "rainy" },
  { id: "footwear_gear", label: "Footwear & Bags", icon: "hiking" },
  { id: "clothing_attire", label: "Attire & Layers", icon: "apparel" },
  { id: "electronics_adapters", label: "Electronics & Adapters", icon: "power" },
  { id: "essentials_health", label: "Essentials & Health", icon: "medical_services" },
];

export function StitchPackingView({
  tripId,
  tripTitle = "Smart Packing & Gear",
  destination = "Destination",
  initialItems,
  weatherOverview = {
    expected_conditions: "Check local forecast for seasonal conditions",
    temperature_range: "Seasonal",
    rain_risk: "low",
  },
}: StitchPackingViewProps) {
  const [items, setItems] = useState<PackingItemRecord[]>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemCat, setNewItemCat] = useState("weather_climate");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemAssignee, setNewItemAssignee] = useState("You");

  // Stats
  const totalCount = items.length;
  const packedCount = items.filter((i) => i.is_packed).length;
  const packedPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // Filter items by category and contributor assignment
  const filteredItems = items.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (assigneeFilter === "mine") return item.assigned_to_name === "You";
    if (assigneeFilter === "unassigned") return !item.assigned_to_name;
    if (assigneeFilter !== "all") return item.assigned_to_name === assigneeFilter;
    return true;
  });

  // Toggle item packed status
  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, is_packed: nextStatus } : it))
    );
    try {
      await togglePackingItem(tripId, itemId, nextStatus);
    } catch (e) {
      console.warn("Toggle failed:", e);
    }
  };

  // Delete item
  const handleDelete = async (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    try {
      await deletePackingItem(tripId, itemId);
    } catch (e) {
      console.warn("Delete failed:", e);
    }
  };

  // Add custom item with contributor assignment
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const added = await addCustomPackingItem(
        tripId,
        newItemName.trim(),
        newItemCat,
        newItemNotes.trim() || undefined,
        newItemQty,
        newItemAssignee.trim() || "You",
        "You"
      );
      setItems((prev) => [added, ...prev]);
      setIsAddModalOpen(false);
      setNewItemName("");
      setNewItemNotes("");
      setNewItemQty(1);
    } catch (e) {
      console.warn("Add item failed:", e);
    }
  };

  // Claim or reassign item to traveler
  const handleClaimItem = async (itemId: string, assignee: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, assigned_to_name: assignee } : it))
    );
    try {
      await assignPackingItem(tripId, itemId, assignee);
    } catch (e) {
      console.warn("Assign failed:", e);
    }
  };

  // AI Regenerate / Refresh
  const handleAIRefresh = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/packing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      const data = await res.json();
      if (data.items) {
        const newRecords: PackingItemRecord[] = (data.items as PackingItemRecommendation[]).map(
          (it, idx) => ({
            id: `gen-${Date.now()}-${idx}`,
            trip_id: tripId,
            category: it.category,
            item_name: it.item_name,
            notes: it.reason,
            quantity: it.quantity,
            is_packed: false,
            is_suggested: true,
            created_at: new Date().toISOString(),
          })
        );
        setItems(newRecords);
      }
    } catch (err) {
      console.warn("AI generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner / Weather Insight Scrim */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-primary-container text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-primary-fixed">
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              {tripTitle} • AI Packing Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Smart Packing & Gear Companion
            </h1>
            <p className="text-sm text-primary-fixed/90 leading-relaxed">
              Curated specifically for <span className="font-semibold text-white">{destination}</span>{" "}
              based on real weather models, temple etiquette, and planned daily activities.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 min-w-[240px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary-fixed uppercase tracking-wider">
                Packing Progress
              </span>
              <span className="text-base font-extrabold font-mono text-white">
                {packedPct}%
              </span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${packedPct}%` }}
              />
            </div>
            <div className="text-[11px] text-white/80 flex items-center justify-between">
              <span>{packedCount} of {totalCount} items in bag</span>
              <span className="font-semibold text-emerald-300">
                {totalCount - packedCount} remaining
              </span>
            </div>
          </div>
        </div>

        {/* Live Weather Insights Strip */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-black/15 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="material-symbols-outlined text-amber-300 text-2xl">thermostat</span>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/70">
                Expected Temps
              </div>
              <div className="text-xs font-semibold text-white">
                {weatherOverview.temperature_range}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/15 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="material-symbols-outlined text-cyan-300 text-2xl">umbrella</span>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/70">
                Rain & Precipitation
              </div>
              <div className="text-xs font-semibold text-white capitalize flex items-center gap-1.5">
                {weatherOverview.rain_risk} Risk (Pack Umbrella)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/15 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="material-symbols-outlined text-emerald-300 text-2xl">temple_buddhist</span>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/70">
                Attire Protocol
              </div>
              <div className="text-xs font-semibold text-white">
                Slip-on shoes & modest layers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const catCount =
              cat.id === "all"
                ? items.length
                : items.filter((i) => i.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-outline-variant/30"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <TripShareButton
            tripId={tripId}
            tripTitle={tripTitle}
            destination={destination}
            variant="secondary"
            label="Share & Invite"
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high border border-outline-variant/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Item
          </button>
          <button
            onClick={handleAIRefresh}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-container disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${isGenerating ? "animate-spin" : ""}`}>
              {isGenerating ? "progress_activity" : "auto_awesome"}
            </span>
            {isGenerating ? "Analyzing Climate..." : "AI Re-analyze"}
          </button>
        </div>
      </div>

      {/* Traveler Contributor Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 bg-surface-container-low/50 p-2.5 rounded-2xl border border-outline-variant/20">
        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-primary">group</span>
          Traveler Filter:
        </span>
        <button
          type="button"
          onClick={() => setAssigneeFilter("all")}
          className={`px-3 py-1 rounded-lg transition-colors font-semibold shrink-0 cursor-pointer text-xs ${
            assigneeFilter === "all"
              ? "bg-primary text-on-primary shadow-2xs"
              : "bg-surface-container text-on-surface-variant hover:text-on-surface"
          }`}
        >
          All Items ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setAssigneeFilter("mine")}
          className={`px-3 py-1 rounded-lg transition-colors font-semibold shrink-0 cursor-pointer text-xs ${
            assigneeFilter === "mine"
              ? "bg-primary text-on-primary shadow-2xs"
              : "bg-surface-container text-on-surface-variant hover:text-on-surface"
          }`}
        >
          My Assigned Gear ({items.filter((i) => i.assigned_to_name === "You").length})
        </button>
        <button
          type="button"
          onClick={() => setAssigneeFilter("unassigned")}
          className={`px-3 py-1 rounded-lg transition-colors font-semibold shrink-0 cursor-pointer text-xs ${
            assigneeFilter === "unassigned"
              ? "bg-primary text-on-primary shadow-2xs"
              : "bg-surface-container text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Unassigned ({items.filter((i) => !i.assigned_to_name).length})
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredItems.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/50 p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 text-primary/40">luggage</span>
            <h3 className="text-sm font-bold text-on-surface">No items in this category</h3>
            <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm mx-auto">
              Add your custom packing items or tap &quot;AI Re-analyze&quot; to generate grounded gear suggestions.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const isPacked = item.is_packed;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: isPacked ? 0.65 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  key={item.id}
                  onClick={() => handleToggle(item.id, isPacked)}
                  className={`group cursor-pointer rounded-2xl p-4 transition-all duration-200 border flex items-start gap-3.5 ${
                    isPacked
                      ? "bg-surface-container-lowest/60 border-outline-variant/20 opacity-70"
                      : "bg-surface-container-lowest hover:bg-surface-container-low border-outline-variant/40 hover:border-primary/40 shadow-xs hover:shadow-md"
                  }`}
                >
                {/* Checkbox */}
                <div
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    isPacked
                      ? "bg-emerald-600 text-white"
                      : "border-2 border-outline hover:border-primary bg-surface"
                  }`}
                >
                  {isPacked && (
                    <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3
                      className={`text-sm font-bold leading-tight ${
                        isPacked
                          ? "line-through text-on-surface-variant/70"
                          : "text-on-surface group-hover:text-primary transition-colors"
                      }`}
                    >
                      {item.item_name}
                    </h3>
                    {item.quantity && item.quantity > 1 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-bold">
                        ×{item.quantity}
                      </span>
                    )}
                    {item.is_suggested && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
                        AI Pick
                      </span>
                    )}
                  </div>

                    {item.notes && (
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                      {item.notes}
                    </p>
                  )}

                  {/* Contributor Assignment Badge */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                    {item.assigned_to_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary-container/50 text-on-secondary-container font-medium border border-outline-variant/30">
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        {item.assigned_to_name === "You" ? "Assigned to You" : `Assigned to ${item.assigned_to_name}`}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-on-surface-variant/70 italic text-[10px]">Unassigned</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimItem(item.id, "You");
                          }}
                          className="px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 transition-colors cursor-pointer"
                        >
                          + Claim Item
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all"
                  title="Remove item"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </motion.div>
            );
          })}
          </AnimatePresence>
        )}
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface">Add Packing Item</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Compression Packing Cubes"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                    Category
                  </label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none"
                  >
                    <option value="weather_climate">Weather & Climate</option>
                    <option value="footwear_gear">Footwear & Bags</option>
                    <option value="clothing_attire">Attire & Layers</option>
                    <option value="electronics_adapters">Electronics & Adapters</option>
                    <option value="essentials_health">Essentials & Health</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Assign to Traveler
                </label>
                <select
                  value={newItemAssignee}
                  onChange={(e) => setNewItemAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none"
                >
                  <option value="You">You (Trip Organizer)</option>
                  <option value="Rohan Mehta">Rohan Mehta (Editor)</option>
                  <option value="Priya Nair">Priya Nair</option>
                  <option value="Ananya Verma">Ananya Verma</option>
                  <option value="">Unassigned (Shared Gear)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">
                  Notes / Why needed
                </label>
                <textarea
                  rows={2}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="e.g. For keeping luggage organized on multi-city trains"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl hover:bg-primary-container shadow-sm transition-colors"
                >
                  Add to Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
