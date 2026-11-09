import Link from "next/link";
import type { Route } from "next";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl p-8 sm:p-10 border border-surface-container-high/60 shadow-lg flex flex-col items-center gap-6">
        <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[42px]">explore_off</span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            404 Error • Uncharted Coordinates
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Destination Not Found
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            The itinerary, trip, or document you are looking for does not exist in your travel records or has moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            href={"/trips" as Route}
            className="w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all text-center"
          >
            Go to My Trips
          </Link>
          <Link
            href={"/" as Route}
            className="w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors text-center"
          >
            Home Launcher
          </Link>
        </div>
      </div>
    </div>
  );
}
