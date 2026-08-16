import { getJson, postJson } from "@/lib/api-client";

const PLACES_ENDPOINT = "/api/places";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  types?: string[];
};

export type PlacesAutocompleteResponse = {
  suggestions: PlaceSuggestion[];
  meta?: {
    degraded: boolean;
  };
};

export type ResolvePlaceResponse = {
  placeId: string;
  address: string | null;
  types: string[];
  meta?: {
    degraded: boolean;
  };
};

export async function autocompletePlaces(
  params: {
    input: string;
    sessionToken?: string;
    limit?: number;
  },
  init?: RequestInit,
): Promise<PlacesAutocompleteResponse> {
  const search = new URLSearchParams({
    input: params.input,
    ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
    ...(typeof params.limit === "number"
      ? { limit: String(params.limit) }
      : {}),
  });
  return getJson<PlacesAutocompleteResponse>(
    `${PLACES_ENDPOINT}/autocomplete?${search.toString()}`,
    init,
  );
}

export async function resolvePlace(params: {
  placeId: string;
  sessionToken?: string;
}): Promise<ResolvePlaceResponse> {
  return postJson<
    ResolvePlaceResponse,
    { placeId: string; sessionToken?: string }
  >(`${PLACES_ENDPOINT}/resolve`, {
    placeId: params.placeId,
    ...(params.sessionToken ? { sessionToken: params.sessionToken } : {}),
  });
}
