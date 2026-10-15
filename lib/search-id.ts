const SEARCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstString(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function parseSearchId(
  value: string | string[] | null | undefined,
): string | null {
  const trimmed = firstString(value)?.trim();
  return trimmed && SEARCH_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function reusedSearchJourneyId({
  currentSearchId,
  isSameSearchPage,
  currentBookingType,
  nextBookingType,
}: {
  readonly currentSearchId: string | null;
  readonly isSameSearchPage: boolean;
  readonly currentBookingType?: string | null;
  readonly nextBookingType: string;
}): string | null {
  if (!isSameSearchPage || !currentSearchId) {
    return null;
  }

  const current = currentBookingType?.toUpperCase().replace("-", "_");
  return current === nextBookingType ? currentSearchId : null;
}
