"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Save, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WizardStepper } from "./wizard-stepper";
import { WhereWhenSection } from "./sections/where-when-section";
import { TravellersBudgetSection } from "./sections/travellers-budget-section";
import { PreferencesSection } from "./sections/preferences-section";
import { ReviewInputsSection } from "./sections/review-inputs-section";
import { Button } from "@/components/ui/button";
import type { BudgetBasis, TravelPace } from "@/lib/ai/types";

const STEPS = [
  { id: "where-when", label: "Where & when" },
  { id: "party-budget", label: "People & budget" },
  { id: "preferences", label: "Preferences" },
  { id: "review", label: "Review brief" },
];

interface WizardFormData {
  tripId?: string;
  title: string;
  destination: string;
  originLocation: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  roomCount: number;
  hasBudget: boolean;
  budgetAmount: string;
  budgetCurrency: string;
  budgetBasis: BudgetBasis;
  travelPace: TravelPace;
  interests: string[];
  notes: string;
}

const DEFAULT_FORM_DATA: WizardFormData = {
  title: "",
  destination: "",
  originLocation: "",
  startDate: "",
  endDate: "",
  adultCount: 1,
  childCount: 0,
  roomCount: 1,
  hasBudget: true,
  budgetAmount: "75000",
  budgetCurrency: "INR",
  budgetBasis: "total",
  travelPace: "balanced",
  interests: ["Culture & Heritage", "Food & Dining"],
  notes: "",
};

const STORAGE_KEY = "wanderway_new_trip_draft";

interface TripWizardProps {
  userId: string;
  initialDestination?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialParty?: string;
  initialBudget?: string;
}

export function TripWizard({
  userId,
  initialDestination,
  initialStartDate,
  initialEndDate,
  initialParty,
  initialBudget,
}: TripWizardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(() => {
    let base: WizardFormData = { ...DEFAULT_FORM_DATA };

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          base = { ...base, ...JSON.parse(saved) };
        }
      } catch {
        // Ignore storage error
      }
    }

    // Incoming URL parameters override cached drafts
    if (initialDestination) {
      base.destination = initialDestination;
      base.title = `${initialDestination} Journey`;
    }
    if (initialStartDate) {
      base.startDate = initialStartDate;
    }
    if (initialEndDate) {
      base.endDate = initialEndDate;
    }
    if (initialParty) {
      const p = parseInt(initialParty, 10);
      if (!isNaN(p) && p > 0) base.adultCount = p;
    }
    if (initialBudget) {
      base.hasBudget = true;
      base.budgetAmount = String(initialBudget);
    }

    return base;
  });

  // Synchronize state during render when query props change (React-idiomatic pattern)
  const [prevProps, setPrevProps] = useState({
    initialDestination,
    initialStartDate,
    initialEndDate,
    initialParty,
    initialBudget,
  });

  if (
    prevProps.initialDestination !== initialDestination ||
    prevProps.initialStartDate !== initialStartDate ||
    prevProps.initialEndDate !== initialEndDate ||
    prevProps.initialParty !== initialParty ||
    prevProps.initialBudget !== initialBudget
  ) {
    setPrevProps({
      initialDestination,
      initialStartDate,
      initialEndDate,
      initialParty,
      initialBudget,
    });
    setFormData((prev) => {
      const next = { ...prev };
      if (initialDestination) {
        next.destination = initialDestination;
        if (!prev.title || prev.title.endsWith("Journey")) {
          next.title = `${initialDestination} Journey`;
        }
      }
      if (initialStartDate) next.startDate = initialStartDate;
      if (initialEndDate) next.endDate = initialEndDate;
      if (initialParty) {
        const p = parseInt(initialParty, 10);
        if (!isNaN(p) && p > 0) next.adultCount = p;
      }
      if (initialBudget) {
        next.hasBudget = true;
        next.budgetAmount = String(initialBudget);
      }
      return next;
    });
  }

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSavedMessage, setDraftSavedMessage] = useState(false);

  // Debounced autosave to localStorage on form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch {
        // Ignore storage error
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData]);

  function updateFormData(updated: Partial<WizardFormData>) {
    setFormData((prev) => ({ ...prev, ...updated }));
    setErrors({});
  }

  function validateCurrentStep(): boolean {
    const errs: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.destination || formData.destination.trim().length < 2) {
        errs.destination = "Destination is required.";
      }
      if (!formData.startDate) {
        errs.startDate = "Start date is required.";
      }
      if (!formData.endDate) {
        errs.endDate = "End date is required.";
      } else if (formData.startDate && formData.endDate < formData.startDate) {
        errs.endDate = "End date must be on or after start date.";
      }
    } else if (currentStep === 1) {
      if (formData.adultCount < 1) {
        errs.adultCount = "At least one adult traveller is required.";
      }
      if (formData.hasBudget && formData.budgetAmount) {
        const val = Number(formData.budgetAmount);
        if (isNaN(val) || val < 0) {
          errs.budgetAmount = "Please enter a valid positive budget amount.";
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((c) => c + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((c) => c - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Persists the trip row to Supabase
  async function saveTripRecord(state: "draft" = "draft"): Promise<string> {
    const budgetMinor =
      formData.hasBudget && formData.budgetAmount
        ? Math.round(Number(formData.budgetAmount) * 100)
        : 0;

    const payload = {
      owner_id: userId,
      title: formData.title.trim() || `Trip to ${formData.destination}`,
      destination: formData.destination,
      origin_location: formData.originLocation || null,
      start_date: formData.startDate,
      end_date: formData.endDate,
      traveler_count: formData.adultCount + formData.childCount,
      adult_count: formData.adultCount,
      child_count: formData.childCount,
      room_count: formData.roomCount,
      budget_minor_units: budgetMinor,
      budget_currency: formData.budgetCurrency,
      budget_basis: formData.budgetBasis,
      travel_pace: formData.travelPace,
      trip_state: state,
      preferences: {
        interests: formData.interests,
        notes: formData.notes,
      },
    };

    if (formData.tripId) {
      const { error } = await supabase
        .from("trips")
        .update(payload)
        .eq("id", formData.tripId);
      if (error) throw error;
      return formData.tripId;
    } else {
      const { data, error } = await supabase
        .from("trips")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) throw error;
      setFormData((prev) => ({ ...prev, tripId: data.id }));
      return data.id;
    }
  }

  async function handleSaveDraftAndExit() {
    try {
      setIsSubmitting(true);
      if (formData.destination && formData.startDate && formData.endDate) {
        await saveTripRecord("draft");
      }
      setDraftSavedMessage(true);
      setTimeout(() => {
        router.push("/trips");
      }, 500);
    } catch (err) {
      console.error("Failed to save draft:", err);
      router.push("/trips");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateProposal() {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const tripId = await saveTripRecord("draft");

      const budgetMinor =
        formData.hasBudget && formData.budgetAmount
          ? Math.round(Number(formData.budgetAmount) * 100)
          : null;

      const response = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          destination: formData.destination,
          startDate: formData.startDate,
          endDate: formData.endDate,
          adultCount: formData.adultCount,
          childCount: formData.childCount,
          roomCount: formData.roomCount,
          budgetMinorUnits: budgetMinor,
          budgetCurrency: formData.budgetCurrency,
          budgetBasis: formData.budgetBasis,
          travelPace: formData.travelPace,
          interests: formData.interests,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to start proposal generation.");
      }

      const { proposalId } = await response.json();
      localStorage.removeItem(STORAGE_KEY);
      router.push(`/trips/${tripId}/review/${proposalId}` as Route);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }

  async function handleStartManual() {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const tripId = await saveTripRecord("draft");
      localStorage.removeItem(STORAGE_KEY);
      router.push(`/trips/${tripId}` as Route);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-form">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <Button
          as="a"
          href="/trips"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-text-secondary"
        >
          <ArrowLeft className="size-4" />
          <span>Back to trips</span>
        </Button>

        <button
          type="button"
          onClick={handleSaveDraftAndExit}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated transition-colors cursor-pointer"
        >
          {draftSavedMessage ? (
            <>
              <Check className="size-3.5 text-success-fg" />
              <span className="text-success-fg">Draft saved</span>
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              <span>Save draft & exit</span>
            </>
          )}
        </button>
      </div>

      {/* Editorial Stepper */}
      <div className="mt-6 mb-8">
        <WizardStepper
          steps={STEPS}
          currentStepIndex={currentStep}
          onStepClick={(idx) => setCurrentStep(idx)}
        />
      </div>

      {/* Wizard Step Surface */}
      <div className="rounded-panel border border-border-subtle bg-surface p-6 sm:p-10 shadow-xs">
        {currentStep === 0 && (
          <WhereWhenSection
            data={{
              title: formData.title,
              destination: formData.destination,
              originLocation: formData.originLocation,
              startDate: formData.startDate,
              endDate: formData.endDate,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        )}

        {currentStep === 1 && (
          <TravellersBudgetSection
            data={{
              adultCount: formData.adultCount,
              childCount: formData.childCount,
              roomCount: formData.roomCount,
              hasBudget: formData.hasBudget,
              budgetAmount: formData.budgetAmount,
              budgetCurrency: formData.budgetCurrency,
              budgetBasis: formData.budgetBasis,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        )}

        {currentStep === 2 && (
          <PreferencesSection
            data={{
              travelPace: formData.travelPace,
              interests: formData.interests,
              notes: formData.notes,
            }}
            onChange={updateFormData}
            errors={errors}
          />
        )}

        {currentStep === 3 && (
          <ReviewInputsSection
            data={formData}
            onJumpToStep={(idx) => setCurrentStep(idx)}
            onGenerate={handleGenerateProposal}
            onStartManual={handleStartManual}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}

        {/* Step Navigation Controls (Steps 0, 1, 2) */}
        {currentStep < 3 && (
          <div className="mt-10 flex items-center justify-between border-t border-border-subtle pt-6">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              <span>Previous</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNext}
              className="gap-2 shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
