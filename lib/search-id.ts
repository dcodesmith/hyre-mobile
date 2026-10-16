import { z } from "zod";

const searchIdSchema = z.uuid();

export function parseSearchId(
  value: string | string[] | null | undefined,
): string | null {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const trimmed = firstValue?.trim();
  return trimmed && searchIdSchema.safeParse(trimmed).success ? trimmed : null;
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
