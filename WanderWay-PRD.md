# WanderWay --- Product Requirements Document (PRD)

**Document type:** Product requirements\
**Product:** WanderWay\
**Version:** 3.0\
**Status:** Product scope definition\
**Primary release focus:** A reliable, end-to-end travel planning and
travel companion experience

------------------------------------------------------------------------

## 1. Product Overview

WanderWay is a travel planning and travel companion platform that helps
people move from the first idea of a trip to the journey itself and,
finally, to preserving the experience.

It brings destination discovery, trip planning, itinerary creation and
editing, travel information, budget tracking, bookings, group
coordination, and in-trip assistance into one connected product.

WanderWay is not intended to be only an AI itinerary generator. It
should help travellers make informed decisions before and during a trip.
It combines:

-   **AI-assisted planning** to turn a traveller's preferences into a
    practical draft itinerary.
-   **Verified travel information** from external providers and official
    sources.
-   **Deterministic calculations** for budgets, distances, durations,
    and totals.
-   **Traveller-controlled decisions** so users can review, change,
    accept, or reject suggestions.
-   **A connected trip record** that keeps itinerary details, costs,
    bookings, documents, and travel updates together.

The product must distinguish clearly between confirmed information,
sourced information, calculated estimates, user-entered information, and
information that is unavailable. It must never present an unverified AI
response as a confirmed real-world fact.

### Product promise

**Discover places. Plan with confidence. Travel with clarity.**

### 1.1 Problem Statement

Planning a trip often requires travellers to switch between many
services: destination guides, maps, weather applications, transport
websites, hotel platforms, spreadsheets, document folders, messaging
applications, and expense trackers.

This creates several problems:

-   Trip information is scattered across different applications and
    conversations.
-   It is difficult to turn broad interests into a feasible day-by-day
    itinerary.
-   AI-generated plans may contain incorrect locations, unrealistic
    travel times, outdated information, or invented prices.
-   Travellers may not know whether a displayed price is a live quote, a
    published price, or only an estimate.
-   Group trips make it difficult to coordinate preferences,
    responsibilities, bookings, and shared expenses.
-   Important changes such as severe weather, transport delays, road
    disruptions, or safety advisories may be missed.
-   Information collected before departure may not be easy to access
    during the journey.

WanderWay aims to reduce this fragmentation and make the planning
process more transparent and manageable.

### 1.2 Product Goals

1.  Help users discover destinations and places relevant to their
    interests.
2.  Create practical trip plans using travel dates, traveller details,
    preferences, and budget.
3.  Make generated itineraries editable and understandable.
4.  Ground places, routes, weather, prices, and travel updates in
    appropriate sources.
5.  Help users understand the expected cost of a trip without presenting
    guesses as confirmed prices.
6.  Keep bookings, documents, packing tasks, expenses, and group
    information connected to the trip.
7.  Provide useful information while the traveller is travelling.
8.  Preserve trip memories and useful information after the journey.
9.  Support individual and group travel.
10. Communicate missing, stale, unavailable, or uncertain information
    honestly.

### 1.3 Non-Goals

WanderWay is not intended to:

-   Issue flight, train, bus, or hotel tickets itself in the initial
    release.
-   Replace the official booking, airline, railway, hotel, or transport
    provider.
-   Guarantee that every third-party provider has complete coverage.
-   Guarantee that a generated itinerary is feasible without validation.
-   Guarantee real-time safety or emergency coverage in every
    destination.
-   Treat AI-generated prices, coordinates, opening hours, or transport
    statuses as verified facts.
-   Replace emergency services or official government travel advisories.

------------------------------------------------------------------------

## 2. Target Users

### 2.1 Individual Travellers

People planning a solo trip who want to discover destinations, build an
itinerary, estimate costs, organise travel details, and access trip
information in one place.

### 2.2 Couples and Families

Travellers planning together who need to account for multiple people,
children, rooms, preferences, activities, and shared costs.

### 2.3 Groups of Friends

Groups that need to coordinate destinations, dates, activities, budgets,
bookings, and expenses.

### 2.4 Frequent Travellers

People who travel regularly and need a reusable place to organise trips,
save places, retain documents, and review past journeys.

### 2.5 Travellers Who Need More Context

People who want to understand destination conditions, local transport,
weather, route disruptions, and relevant official advisories before and
during travel.

------------------------------------------------------------------------

## 3. Core Product Principles

### 3.1 AI Suggests; Verified Services Validate

AI may interpret preferences, suggest destinations, organise activities,
explain options, and draft itinerary content. It must not be the source
of truth for current prices, exact coordinates, live transport status,
weather observations, official advisories, or opening hours.

### 3.2 Every Important Fact Has a Source or an Explicit Status

Where applicable, information should identify its source and when it was
checked. If the product cannot obtain reliable information, it must show
that the information is unavailable or unverified.

### 3.3 Estimates Must Be Explainable

Calculated estimates must disclose the inputs and method used. Users
must be able to understand and adjust assumptions such as distance
rates, food allowances, room counts, and local transport costs.

### 3.4 Users Remain in Control

Generated plans are drafts. Users can edit, remove, reorder, replace, or
manually add itinerary items. Manual edits must not be silently
overwritten by regeneration.

### 3.5 A Trip Is a Connected Record

An itinerary, budget, booking, document, packing task, expense, alert,
and memory should belong to the relevant trip rather than existing as
disconnected features.

### 3.6 Failure Must Be Recoverable

A provider outage or partial data failure should not unnecessarily
prevent users from accessing saved trip information or using unrelated
features.

------------------------------------------------------------------------

## 4. Product Feature Overview

WanderWay is organised around the travel journey:

1.  Discover --- explore destinations and save places.
2.  Plan --- define the trip and generate a proposed itinerary.
3.  Validate --- review routes, timing, prices, assumptions, and missing
    information.
4.  Prepare --- organise bookings, documents, packing, and group
    responsibilities.
5.  Travel --- access the itinerary, map, weather, alerts, and expenses.
6.  Remember --- save memories, notes, and trip summaries.

------------------------------------------------------------------------

# 5. Functional Requirements

## 5.1 Account and Profile Management

### Purpose

Allow users to create an account, access their saved trips, and maintain
basic traveller preferences.

### Features

-   Register or sign in using email verification code (OTP).
-   Sign in using Google.
-   Sign out securely.
-   Restore an authenticated session when reopening the application.
-   Create and update a traveller profile.
-   Store basic profile information such as display name and profile
    image.
-   Manage preferred currency.
-   Manage home location or usual departure location.
-   Store general travel preferences.
-   View and manage account-related settings.
-   Request account deletion and understand the effect on personal and
    shared trip data.

### Requirements

-   Email verification codes must have expiry and resend controls.
-   Authentication errors must be understandable and recoverable.
-   Private trip data must not be accessible to unauthorised users.
-   Profile preferences must not be treated as a substitute for
    trip-specific traveller details.
-   Google Sign-In is supported in the initial release. Apple Sign-In is
    deferred to a later release.

------------------------------------------------------------------------

## 5.2 Destination Discovery and Exploration

### Purpose

Help users discover destinations and places before creating a trip.

### Features

-   Explore destinations by country, region, city, or area.
-   Search for destinations and specific places.
-   Browse destinations by interests such as nature, history, culture,
    food, adventure, shopping, beaches, and relaxation.
-   View destination information and useful travel context.
-   Discover nearby attractions and points of interest.
-   View place descriptions, categories, location, and available
    practical details.
-   Save destinations and places to a personal saved list.
-   Remove saved items.
-   Use saved places as inputs when creating a trip.
-   View relevant destination news and travel advisories when reliable
    information is available.

### Destination Information

A destination record may include:

-   Name and geographic location.
-   Country, region, and locality.
-   Description and relevant highlights.
-   Popular attractions and places.
-   Best-known activities and interests.
-   Weather information when available.
-   Relevant official advisories and safety context.
-   Source and last-checked time for time-sensitive information.

### Requirements

-   Search results must come from a location or place data source, not
    invented AI coordinates.
-   Destination descriptions generated by AI must not be presented as
    official guidance.
-   Users must be able to distinguish editorial information from current
    operational information.
-   Missing provider coverage must be communicated clearly.

------------------------------------------------------------------------

## 5.3 Trip Creation and Planning Inputs

### Purpose

Collect enough information to create a trip plan that reflects the
traveller's real requirements.

### Trip Details

Users can define:

-   Trip name.
-   Starting location.
-   Destination or multiple destinations.
-   Departure date.
-   Return date.
-   Number of travellers.
-   Adult and child counts where supported.
-   Room count and occupancy requirements.
-   Traveller preferences and interests.
-   Preferred travel pace.
-   Preferred activity types.
-   Mobility or accessibility considerations.
-   Transport preferences.
-   Budget amount.
-   Budget currency.
-   Budget basis: per person or total group budget.
-   Budget inclusions and exclusions.

### Requirements

-   The system must validate dates and traveller counts.
-   The system must distinguish a per-person budget from a total group
    budget.
-   Accommodation calculations must account for nights, rooms,
    occupancy, and quoted room rates.
-   Child and adult traveller categories must be retained when a
    provider prices them differently.
-   Users must be able to review their inputs before itinerary
    generation.
-   Incomplete or ambiguous information must be identified rather than
    silently assumed.

------------------------------------------------------------------------

## 5.4 AI-Assisted Itinerary Generation

### Purpose

Generate a useful first draft of a trip itinerary based on the user's
trip details and preferences.

### Features

-   Generate a day-by-day itinerary.
-   Suggest activities relevant to the destination and traveller
    interests.
-   Organise activities into a practical sequence.
-   Consider trip duration and available time.
-   Consider traveller count and stated preferences.
-   Consider the selected travel pace.
-   Use known places and location records where available.
-   Explain why an activity may suit the trip.
-   Identify information that could not be verified.
-   Allow the user to regenerate a selected day or request alternatives.
-   Allow users to ask for changes using natural language.
-   Support multiple destinations when the trip requires them.

### Itinerary Content

An itinerary activity may include:

-   Activity or place name.
-   Description.
-   Place reference and geographic coordinates from a location provider.
-   Planned date and approximate time.
-   Expected duration.
-   Visit sequence.
-   Travel mode to the next activity.
-   Route or distance reference where available.
-   Booking or ticket requirement, if known.
-   Price observation or estimate reference, if available.
-   Relevant notes and source information.

### Generation Requirements

-   AI must not invent exact GPS coordinates.
-   AI must not create numeric market prices.
-   AI must not claim that a ticket, hotel, or transport option is
    available unless a provider confirms it.
-   AI-generated content must be checked against available place and
    route data.
-   The system must validate obvious timing and route conflicts before
    presenting a plan as ready for review.
-   If a provider is unavailable, the system may generate a partial plan
    and identify the missing information.
-   Generation must support retry and recovery.
-   Users must be told when a result is partial.
-   A generated itinerary is a proposal, not a confirmed reservation.

------------------------------------------------------------------------

## 5.5 Itinerary Management and Editing

### Purpose

Give users control over their trip schedule after generation.

### Features

-   View itinerary by day.
-   View activities in chronological order.
-   Open an activity for more information.
-   Add a new activity manually.
-   Edit activity details.
-   Delete an activity.
-   Reorder activities within a day.
-   Move an activity to another day.
-   Change planned time and duration.
-   Add personal notes.
-   Mark an activity as a priority.
-   Mark an activity as completed during the trip.
-   Replace an activity with an alternative.
-   Regenerate a selected day or portion of a plan.
-   Preserve manual changes when other parts of the itinerary are
    regenerated.

### Requirements

-   Changes must be saved reliably.
-   Conflicting edits must be handled without silently losing user
    changes.
-   Route legs affected by activity changes must be recalculated or
    marked as needing refresh.
-   The system must identify when itinerary information is stale.
-   The user must be able to distinguish planned activities from
    completed activities.

------------------------------------------------------------------------

## 5.6 Map, Places, and Route Information

### Purpose

Help travellers understand where activities are located and how they
connect geographically.

### Features

-   View trip destinations and itinerary places on a map.
-   View the location of an individual place.
-   View route legs between itinerary activities.
-   Select a travel mode where supported.
-   Display route distance and estimated travel duration from a routing
    provider.
-   Recalculate routes after itinerary changes.
-   Open place details from a map location.
-   Identify missing or unresolved place locations.
-   Support map access for saved trips.

### Requirements

-   Coordinates must originate from a location provider or a verified
    user input.
-   Route distances and durations must come from a routing service or a
    clearly disclosed calculation.
-   Route results must include a retrieval time where relevant.
-   Traffic-aware estimates must only be shown when the provider
    supports them.
-   The product must not imply that a route is safe or currently clear
    merely because a route exists.
-   Map and route provider limitations must be communicated.

------------------------------------------------------------------------

## 5.7 Budget Intelligence and Cost Planning

### Purpose

Give travellers a transparent view of expected trip costs and help them
understand what is known, estimated, paid, or still unknown.

Budget Intelligence is a core product capability. It must be more
reliable than a single AI-generated trip-cost number.

### Cost Categories

-   Flights.
-   Train or bus travel.
-   Accommodation.
-   Local transportation.
-   Food.
-   Activities and attractions.
-   Tickets and entry fees.
-   Shopping.
-   Other trip expenses.

### Price Evidence Types

Every numeric price must be associated with an appropriate evidence
type:

1.  **Live Quote** --- a current provider offer for the relevant route,
    dates, traveller details, and conditions.
2.  **Published Price** --- a price published by an official provider or
    business, with source and check date.
3.  **Verified Range** --- a traceable typical price range with source
    and date.
4.  **Calculated Estimate** --- a deterministic calculation using
    disclosed inputs and an identifiable method.
5.  **User Entered** --- an amount supplied or edited by the user.
6.  **Unknown** --- no reliable price is available.

AI-generated guesses must not be stored or displayed as verified numeric
prices.

### Features

-   Show estimated trip cost by category.
-   Show per-person and group totals.
-   Show cost by day where enough information exists.
-   Show quoted, published, calculated, and user-entered amounts
    separately.
-   Show paid and unpaid expenses.
-   Show booked costs separately from unconfirmed planning estimates.
-   Show remaining budget.
-   Allow users to enter or edit a personal estimate.
-   Allow users to set category allowances.
-   Show the source and last-checked time for sourced prices.
-   Show quote expiry or stale status where available.
-   Refresh a quote when supported.
-   Identify categories with unknown costs.
-   Explain how calculated estimates were produced.
-   Provide a breakdown of taxes, fees, quantities, nights, rooms, or
    traveller counts when available.

### Calculation Requirements

-   Money calculations must use safe decimal or integer minor-unit
    arithmetic.
-   Currency conversion must retain the original amount and currency.
-   Currency conversion must identify the exchange rate and retrieval
    time.
-   Accommodation cost must account for nightly price, number of nights,
    room count, occupancy, taxes, and fees where available.
-   Transport prices must account for relevant traveller categories and
    provider conditions.
-   Group totals must not be confused with per-person totals.
-   Unknown values must not be treated as zero.
-   The system must not manufacture a precise total when essential cost
    components are unknown.
-   Estimates must not be described as booking prices.
-   A displayed total must explain which categories are included and
    which remain unknown.

------------------------------------------------------------------------

## 5.8 Weather Information

### Purpose

Help users understand weather conditions relevant to their destinations
and planned travel dates.

### Features

-   View current weather when available.
-   View forecasts for upcoming trip dates when supported.
-   View destination-specific weather.
-   View weather by itinerary day or destination.
-   Show relevant weather warnings when supplied by an authoritative
    provider.
-   Refresh weather information.
-   Identify the forecast provider and last-updated time.
-   Explain when forecast coverage is unavailable or too far in the
    future.

### Requirements

-   Forecasts must be associated with the correct destination and local
    date.
-   Historical, current, and forecast data must not be confused.
-   The product must not fabricate forecasts when a provider has no
    coverage.
-   Severe weather warnings should identify the issuing source and
    validity period.

------------------------------------------------------------------------

## 5.9 Bookings and Reservations Organiser

### Purpose

Give users one place to record and review bookings made through external
providers.

### Features

-   Add a flight booking.
-   Add a train or bus booking.
-   Add an accommodation booking.
-   Add an activity or attraction booking.
-   Add a local transport reservation.
-   Store provider name and external booking reference.
-   Store booking date, travel date, amount, currency, and status.
-   Store booking confirmation details.
-   Attach relevant documents where supported.
-   Open the external provider or booking page.
-   Edit booking details.
-   Mark a booking as cancelled or changed.
-   View bookings associated with the trip.
-   Identify booking details that are incomplete.

### Booking Statuses

-   Idea.
-   Researching.
-   Price selected.
-   Booking in progress externally.
-   Booked.
-   Changed.
-   Cancelled.
-   Completed.

### Requirements

-   Recording a booking must not imply that WanderWay issued or
    confirmed it.
-   External bookings must be clearly identified as externally made.
-   Users must be able to update details after a provider-side change.
-   Booking totals must not be counted twice in the budget.
-   A booking amount must retain its source and currency.

------------------------------------------------------------------------

## 5.10 Expense Tracking and Group Cost Sharing

### Purpose

Help travellers record actual spending and understand how costs are
shared.

### Features

-   Add an expense to a trip.
-   Record amount, currency, category, date, payer, and description.
-   Identify whether an expense is personal or shared.
-   Select group members who share an expense.
-   Define equal or custom expense splits.
-   View expenses by category and member.
-   View each member's paid amount and share.
-   Calculate balances between members.
-   Record settlements between members.
-   Edit or remove an expense with appropriate history.
-   Compare actual spending with the planned budget.

### Requirements

-   Expense calculations must be deterministic.
-   Split amounts must reconcile to the original expense.
-   Currency handling must be explicit.
-   The system must avoid duplicate expense records.
-   Users must be able to distinguish an expense from a booking or
    planned estimate.
-   Changes to shared financial records must be permission-controlled
    and traceable.

------------------------------------------------------------------------

## 5.11 Group Trips and Collaboration

### Purpose

Allow multiple people to plan and manage a shared trip.

### Features

-   Invite people to a trip.
-   Accept or decline a trip invitation.
-   View trip members.
-   Assign trip roles or permissions.
-   Collaborate on itinerary activities.
-   Add comments or notes.
-   Suggest activities.
-   Vote on proposed activities where supported.
-   Share trip details with authorised members.
-   Track shared expenses.
-   View group booking and preparation information.
-   Remove a member or leave a trip according to permissions.

### Requirements

-   Only authorised members may access a private trip.
-   Trip owners must have clear control over membership and permissions.
-   Member actions must respect their assigned role.
-   A user must not gain access to private documents merely by knowing a
    trip identifier.
-   Shared edits must be recoverable and must not silently overwrite one
    another.

------------------------------------------------------------------------

## 5.12 Packing List

### Purpose

Help users prepare for a trip and track what they need to carry.

### Features

-   Create a packing list for a trip.
-   Add items manually.
-   Organise items by category.
-   Mark items as packed or not packed.
-   Remove or edit items.
-   Generate suggested packing items based on destination, trip
    duration, weather, and activities.
-   Allow users to customise generated suggestions.
-   Reuse personal packing items across trips where supported.
-   View packing completion status.

### Requirements

-   Generated packing suggestions are recommendations, not mandatory
    requirements.
-   Weather-dependent suggestions must identify the forecast or
    assumptions used.
-   Users must be able to edit all suggested items.

------------------------------------------------------------------------

## 5.13 Travel Vault and Documents

### Purpose

Keep important trip documents and travel references organised and
accessible.

### Features

-   Upload travel documents.
-   Store booking confirmations.
-   Store tickets and reservation documents.
-   Store accommodation details.
-   Store insurance documents.
-   Store other trip-related files.
-   Add a title, category, and optional note to a document.
-   View or download an authorised document.
-   Remove a document.
-   Associate documents with a trip or booking.
-   Access previously saved documents when offline if the user has
    explicitly downloaded an offline copy and the platform supports it.

### Requirements

-   Documents must be private by default.
-   File access must be permission-controlled.
-   File types and sizes must be validated.
-   Sensitive document links must not be publicly accessible.
-   Users must be informed when a document is available only online.
-   Document storage must not be represented as a government-approved
    digital identity or ticket wallet.

------------------------------------------------------------------------

## 5.14 AI Travel Companion

### Purpose

Allow users to ask questions about their trip and receive contextual
help based on their saved itinerary and available travel information.

### Features

-   Ask questions about the current trip.
-   Ask for itinerary explanations.
-   Ask for alternatives to a planned activity.
-   Ask for suggestions based on available time.
-   Ask about places already included in the trip.
-   Ask for help understanding budget breakdowns.
-   Ask questions about saved trip information.
-   Request itinerary modifications.
-   Summarise relevant trip details.
-   Provide contextual answers using available weather, route, booking,
    and destination data.

### Requirements

-   The companion must distinguish trip data from general knowledge.
-   It must not invent current prices, availability, delays, advisories,
    or opening hours.
-   It must identify when it lacks enough information.
-   It must not silently change the itinerary or bookings.
-   Any requested change must be shown to the user and confirmed before
    being applied.
-   Emergency and safety-related answers must prioritise official
    sources and direct users to appropriate local emergency services.

------------------------------------------------------------------------

## 5.15 Live Travel Intelligence

### Purpose

Provide relevant travel updates before and during a trip, helping users
notice important changes that may affect their plans.

This feature brings together destination news, official safety
information, weather and disaster warnings, transport status, and road
conditions. These information types must remain distinct.

### A. Destination News

Features:

-   Show relevant news for a destination or region.
-   Associate news with its publisher and source.
-   Show publication time and retrieval time.
-   Open the original article.
-   Identify old or potentially stale news.
-   Filter news by destination and relevance to the trip.

Requirements:

-   News coverage is not the same as an official safety advisory.
-   A news headline must not automatically be presented as a verified
    emergency.
-   The system must not infer that a destination is safe merely because
    no negative news was found.

### B. Safety and Official Advisories

Features:

-   Show official travel advisories where available.
-   Show government or recognised authority warnings.
-   Show relevant regional or destination-specific alerts.
-   Provide source links and issue or update times.
-   Show the affected geographic area.
-   Show validity or expiry information where provided.
-   Provide practical next steps from the source where available.

Requirements:

-   Official advisories must be distinguished from news and general
    commentary.
-   The issuing authority must be identifiable.
-   Unverified reports must not be presented as official warnings.
-   The system must not invent emergency phone numbers or safety
    instructions.
-   Missing advisory data must be labelled unavailable, not interpreted
    as an all-clear.

### C. Weather and Disaster Alerts

Features:

-   Show severe weather warnings relevant to a trip.
-   Show official disaster or emergency alerts where supported.
-   Match alerts to the destination, route, and travel dates.
-   Show severity, affected area, source, issue time, and validity.
-   Notify users about relevant changes when reliable notification data
    is available.

Requirements:

-   Alerts must retain source and timing information.
-   Expired alerts must not appear as current.
-   A warning must not be broadened to areas not covered by its source.
-   Provider failure must not be represented as an absence of danger.

### D. Flight Status

Features:

-   Associate a flight with a trip.
-   Store airline, flight number, origin, destination, and scheduled
    time.
-   Show flight status when an authorised data provider supplies it.
-   Show delays, cancellations, gate or terminal information when
    available.
-   Show source and last-updated time.
-   Link to the airline or provider for confirmation.

Requirements:

-   The system must not claim a flight is on time when status is unknown
    or stale.
-   Provider coverage and update frequency must be disclosed where
    relevant.
-   The airline remains the authoritative source for operational
    decisions.

### E. Train and Bus Status

Features:

-   Store train or bus details associated with a trip.
-   Show status when an authorised provider is available.
-   Show departure, arrival, delay, cancellation, or platform
    information when supplied.
-   Link to the official provider for confirmation.
-   Allow users to record status manually when no authorised data feed
    is available.

Requirements:

-   The product must not assume access to an undocumented or
    unauthorised railway API.
-   Unknown status must remain unknown.
-   A manually entered status must be labelled as user-provided.

### F. Road and Journey Conditions

Features:

-   View route conditions where a supported provider supplies traffic or
    incident data.
-   Show road closures, incidents, or disruptions when available.
-   Associate an incident with an affected route or area.
-   Show source, retrieval time, and validity where available.
-   Refresh route information before or during a journey.
-   Allow explicit opt-in to location-based journey monitoring if
    supported.

Requirements:

-   The absence of incident data must not be described as a clear or
    safe road.
-   Traffic estimates and hazard reports must be treated as different
    information.
-   Background location tracking must not be enabled by default.
-   Users must be able to start and stop any location-based monitoring.
-   Alerts must be relevant to the user's selected route or trip.

### G. Alert Inbox and Alert Details

Features:

-   Collect relevant travel alerts in one place.
-   Group alerts by trip and affected travel segment.
-   Show severity and verification status.
-   Show source and timestamps.
-   Show whether an alert is current, stale, expired, or unavailable.
-   Open a detailed alert explanation.
-   Link to the source or recommended official action.
-   Allow users to mark alerts as read or dismissed.
-   Retain important alert history for the trip.

### Alert Data Requirements

Where supported, each alert should contain:

-   Alert type.
-   Source and source URL.
-   Issuing organisation.
-   Publication or event time.
-   Retrieval time.
-   Valid-from and valid-until times.
-   Geographic coverage.
-   Severity.
-   Verification status.
-   Affected trip, destination, route, or transport leg.
-   Recommended action or official instructions.

------------------------------------------------------------------------

## 5.16 Notifications

### Purpose

Keep users informed about important trip activity and relevant changes.

### Features

-   Trip invitation notifications.
-   Invitation acceptance or decline notifications.
-   Relevant itinerary collaboration updates.
-   Booking reminders.
-   Upcoming trip reminders.
-   Packing reminders.
-   Relevant weather or official advisory alerts.
-   Relevant transport status changes when supported.
-   Expense or settlement updates.
-   Notification inbox.
-   Read and unread status.
-   Notification preferences.

### Requirements

-   Notifications must be relevant and actionable.
-   Critical alerts must be based on reliable sources.
-   Repeated alerts should be grouped or deduplicated where appropriate.
-   Users must be able to control non-essential notifications.
-   The application must not send emergency-style alerts based on a
    single unverified news item.

------------------------------------------------------------------------

## 5.17 Offline Access and Synchronisation

### Purpose

Keep essential saved trip information usable when network access is
limited.

### Features

-   Access recently saved trip information offline.
-   Access downloaded itinerary details.
-   Access selected saved places and essential trip references.
-   Access explicitly downloaded documents where supported.
-   Record supported changes locally while offline.
-   Synchronise local changes when connectivity returns.
-   Show whether information is saved locally, synchronised, or waiting
    to sync.
-   Recover from interrupted synchronisation.

### Requirements

-   Offline access must not imply that live prices, weather, transport
    status, or alerts are current.
-   Cached information must show its last-updated time.
-   Conflicting edits must be resolved safely.
-   Financial and shared records must not be silently overwritten during
    synchronisation.
-   Failed synchronisation must remain visible and retryable.
-   The user must be able to distinguish a saved local change from a
    server-confirmed change.

------------------------------------------------------------------------

## 5.18 Trip Memories and Notes

### Purpose

Help users preserve useful notes and memories after or during a trip.

### Features

-   Add personal trip notes.
-   Save memorable places.
-   Add photos or media where supported.
-   Associate a memory with a date, day, or place.
-   View memories grouped by trip.
-   Edit or remove memories.
-   Create a trip summary from saved itinerary and memory information.
-   Retain completed trips in trip history.

### Requirements

-   Personal memories must respect trip privacy settings.
-   AI-generated summaries must be based on actual trip information and
    user-provided memories.
-   The system must not fabricate activities or experiences that the
    user did not record.

------------------------------------------------------------------------

## 5.19 Trip Lifecycle and Management

### Purpose

Represent a trip consistently from initial planning through completion.

### Trip States

-   **Planning:** The trip is being created or edited.
-   **Upcoming:** The trip has been prepared and is scheduled to begin.
-   **Active:** The traveller is currently on the trip.
-   **Completed:** The trip has ended.
-   **Archived:** The trip has been retained as history and is no longer
    active.
-   **Cancelled:** The trip has been cancelled and remains identifiable
    as cancelled.

### Features

-   Create a trip.
-   Save a trip draft.
-   Update trip details.
-   Review trip readiness.
-   Mark a trip as upcoming when appropriate.
-   Activate a trip.
-   Complete a trip.
-   Archive a trip.
-   Cancel a trip.
-   Restore or reopen a trip where permitted.
-   View past trips.
-   Duplicate a previous trip as a starting point for a new trip.

### Requirements

-   Trip state must not be confused with itinerary-generation state or
    booking state.
-   A cancelled trip must not be silently deleted.
-   Completing a trip must not remove its bookings, expenses, documents,
    or memories.
-   State changes must preserve relevant history.

------------------------------------------------------------------------

# 6. Main Product Areas

The following are the major areas of the product, described by
responsibility rather than visual layout.

  -----------------------------------------------------------------------
  Product area                        Responsibility
  ----------------------------------- -----------------------------------
  Home                                Present relevant trip activity,
                                      upcoming travel, saved content, and
                                      useful entry points into planning

  Explore                             Discover destinations, attractions,
                                      and travel information

  Saved                               Keep destinations and places the
                                      user wants to revisit

  Trips                               Create, access, and manage personal
                                      and shared trips

  Trip Overview                       Provide a consolidated view of one
                                      trip and its readiness

  Itinerary                           Organise and edit day-by-day
                                      activities

  Map and Routes                      Display places and travel
                                      connections

  Budget                              Explain expected costs, actual
                                      spending, and remaining budget

  Bookings                            Record and organise externally made
                                      reservations

  Packing                             Track trip preparation items

  Travel Vault                        Store private travel documents and
                                      references

  Group                               Coordinate members, itinerary
                                      decisions, and shared expenses

  Travel Companion                    Answer contextual questions and
                                      assist with trip changes

  Travel Intelligence                 Present relevant news, advisories,
                                      weather warnings, transport status,
                                      and road incidents

  Notifications                       Present trip updates and relevant
                                      alerts

  Memories                            Preserve trip notes and experiences

  Profile and Settings                Manage account details and travel
                                      preferences
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 7. Permissions and User Responsibilities

## 7.1 Personal Trip Owner

The owner can:

-   Edit trip details.
-   Manage invitations and membership.
-   Manage trip permissions.
-   Edit the itinerary.
-   Manage trip records.
-   Manage documents and shared trip content.
-   Manage shared expenses and settlements.
-   Archive or cancel the trip.

## 7.2 Trip Member

A member's capabilities depend on the permissions granted by the trip
owner. Supported permissions may include:

-   View trip details.
-   Suggest itinerary activities.
-   Comment on activities.
-   Vote on proposed activities.
-   Edit permitted itinerary content.
-   Add expenses.
-   View shared expenses.
-   Access documents explicitly shared with them.

## 7.3 Guest or Unauthenticated User

A guest may be allowed to:

-   Explore public destination information.
-   Search for places.
-   Create a temporary local trip draft.
-   Save temporary planning inputs on the current device.

An account is required for persistent cloud trips, cross-device access,
invitations, shared collaboration, and private document storage.

------------------------------------------------------------------------

# 8. Data Quality, Trust, and Transparency Requirements

These requirements apply across the entire product.

## 8.1 Information Status

Information should be identifiable as one of the following where
applicable:

-   Confirmed by a provider.
-   Published by an official source.
-   Retrieved from a named source.
-   Calculated from disclosed inputs.
-   Entered by the user.
-   AI-generated suggestion.
-   Unverified.
-   Stale.
-   Unavailable.
-   Expired.

## 8.2 Source Attribution

Time-sensitive or decision-critical information should retain:

-   Source name.
-   Source reference or URL where available.
-   Retrieval time.
-   Publication or event time where relevant.
-   Validity period where supplied.

## 8.3 No False Certainty

The product must not:

-   Present model-generated prices as market prices.
-   Present invented coordinates as real places.
-   Claim a booking is confirmed without provider or user confirmation.
-   Claim transport is on time when status is unknown.
-   Claim roads are clear because no incident was returned.
-   Treat the absence of an advisory as proof of safety.
-   Hide stale data.
-   Convert unknown costs into zero.
-   Present estimates as exact totals.

## 8.4 Partial Availability

When a provider fails or lacks coverage:

-   Continue with independent features where possible.
-   Preserve saved trip information.
-   Identify which information is missing.
-   Allow retry where appropriate.
-   Avoid substituting fabricated information.
-   Show a clear unavailable or stale status.

------------------------------------------------------------------------

# 9. Release Scope

## 9.1 Version 3.0 --- Reliable Core

The initial release should prioritise a complete and dependable core
journey.

### Included

-   Email OTP authentication.
-   Google Sign-In.
-   User profile and travel preferences.
-   Destination discovery and place search.
-   Saved destinations and places.
-   Trip creation and editing.
-   Traveller, date, preference, and budget inputs.
-   AI-assisted itinerary generation.
-   Itinerary review and manual editing.
-   Place resolution and route information.
-   Weather information.
-   Budget Intelligence with price evidence and transparent estimates.
-   Trip overview and lifecycle management.
-   Manual booking organiser.
-   Core trip notifications.
-   Essential offline access to saved trip information.
-   Baseline privacy, permissions, and secure data handling.

### Release 3.0 Requirements

-   A user must be able to create, save, reopen, and edit a trip.
-   A user must be able to generate and manually adjust an itinerary.
-   Places and routes must use real provider or user-supplied location
    data.
-   Every numeric price must have a valid evidence type.
-   Unknown prices must remain unknown.
-   Budget totals must be calculated consistently.
-   Private trip data must be protected.
-   Core user journeys must be tested.

## 9.2 Version 3.1 --- Travel Preparation and Collaboration Expansion

Potential additions:

-   Expanded packing features.
-   Travel Vault and document management.
-   Group invitations and collaboration.
-   Shared expenses and settlements.
-   More provider integrations and quote coverage.
-   Better offline access and synchronisation.
-   Expanded travel alerts and transport coverage.
-   Apple Sign-In.
-   Additional usability and reliability improvements.

## 9.3 Version 3.2 --- Advanced Travel Companion

Potential additions:

-   More advanced contextual travel assistance.
-   Broader live travel intelligence.
-   More predictive and proactive trip support.
-   Expanded provider coverage.
-   Richer trip memories and summaries.
-   Advanced offline capabilities.
-   More sophisticated group planning tools.

Security, privacy, correct financial calculations, data persistence, and
truthful information are foundational requirements. They must not be
postponed as optional enhancements.

------------------------------------------------------------------------

# 10. Success Measures

WanderWay should measure whether users can successfully plan and manage
trips, not merely how often they interact with AI.

Suggested product measures:

-   Percentage of users who successfully create and save a trip.
-   Percentage of generated itineraries that users retain or edit rather
    than discard.
-   Time taken to create a usable itinerary.
-   Percentage of itinerary activities linked to resolved places.
-   Percentage of displayed numeric prices with valid evidence and
    source metadata.
-   Budget calculation error rate.
-   Percentage of trips reopened after creation.
-   Booking and document organisation usage.
-   Group invitation acceptance and collaboration activity.
-   Offline access and synchronisation success rate.
-   Travel alert relevance and stale-alert rate.
-   User-reported accuracy of itinerary and travel information.
-   Crash-free sessions and critical journey completion rate.

Metrics must be interpreted with context. For example, a high number of
generated itineraries is not evidence of quality if users regularly
discard them because of incorrect places, routes, or prices.

------------------------------------------------------------------------

# 11. Key Acceptance Criteria

The product is ready for a release only when the relevant release scope
meets these conditions:

1.  Users can create and access their own trips securely.
2.  Trip information remains available after the application is closed
    and reopened.
3.  Users can generate, review, edit, and save an itinerary.
4.  Manual itinerary changes are not silently overwritten.
5.  Place coordinates are sourced or user-provided.
6.  Route information comes from a routing provider or a disclosed
    calculation.
7.  Numeric prices have traceable evidence or a documented calculation.
8.  Unknown prices and unavailable information are clearly represented.
9.  Per-person and group totals are calculated correctly.
10. Accommodation calculations account for room and night quantities.
11. Bookings are not represented as confirmed merely because they are
    recorded in WanderWay.
12. Shared trip data respects member permissions.
13. Private documents are not publicly accessible.
14. Offline information displays its last-updated status.
15. Synchronisation does not silently discard conflicting changes.
16. Transport and safety statuses do not claim certainty when source
    data is unavailable.
17. Alerts identify their source and relevant timestamps.
18. Critical user journeys have automated or repeatable tests.
19. Provider failures do not cause unrelated saved trip data to
    disappear.
20. Users can understand what is confirmed, estimated, user-entered,
    stale, or unknown.

------------------------------------------------------------------------

# 12. Product Summary

WanderWay is a connected travel planning and travel companion product.
It helps users discover destinations, create practical itineraries,
validate places and routes, understand trip costs, organise bookings and
documents, coordinate with other travellers, and access relevant
information during the journey.

Its defining characteristic is not simply the use of AI. It is the
combination of AI-assisted planning with verified external information,
deterministic calculations, clear data provenance, and user control.

The product should make travel planning easier without pretending that
uncertain information is certain. When reliable data exists, WanderWay
should present it with context. When only an estimate is possible, it
should explain the calculation. When information is missing, it should
say so.

**WanderWay's core objective is to help travellers make better-informed
decisions throughout the complete travel journey.**
