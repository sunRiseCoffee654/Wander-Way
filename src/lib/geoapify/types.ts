// Geoapify type definitions for the Geocoding / Places Autocomplete flow.
//
// All shape declarations are derived from the Geoapify Geocoding API
// (v1/geocode/autocomplete and v1/geocode/reverse). Fields that the app does
// not consume are intentionally omitted so the contract stays tight.

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lon: number;
  formatted: string;
  category: string | null;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formatted: string;
  address: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
    countryCode?: string | null;
  };
  location: { lat: number; lon: number };
  categories: string[];
  timezone?: string | null;
}

export interface GeoapifyError {
  message: string;
  status?: number;
}
