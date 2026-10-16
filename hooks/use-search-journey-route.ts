import { useRouter } from "expo-router";
import { useEffect } from "react";
import { parseSearchId } from "@/lib/search-id";

export function useSearchJourneyRoute({
  routeSearchId,
  resultSearchId,
}: {
  readonly routeSearchId?: string | string[];
  readonly resultSearchId?: string;
}) {
  const router = useRouter();
  const currentSearchId = parseSearchId(routeSearchId);
  const activeSearchId = currentSearchId ?? parseSearchId(resultSearchId) ?? undefined;

  useEffect(() => {
    if (!activeSearchId || currentSearchId) {
      return;
    }

    router.setParams({ searchId: activeSearchId });
  }, [activeSearchId, currentSearchId, router]);

  return activeSearchId;
}
