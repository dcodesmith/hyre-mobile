import { useQuery } from "@tanstack/react-query";

import { fetchReferralSummary } from "@/services/referrals";

export function useReferralSummary(enabled: boolean) {
  return useQuery({
    queryKey: ["referrals", "summary"],
    queryFn: ({ signal }) => fetchReferralSummary({ signal }),
    enabled,
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });
}
