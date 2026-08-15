import { getJson } from "@/lib/api-client";
import type { RatesResponse } from "@/lib/car-detail-types";
import { useQuery } from "@tanstack/react-query";

const RATES_QUERY_KEY = ["rates"] as const;

type RatesApiRateRecord = {
  ratePercent?: number | string | null;
  feeType?: string | null;
  active?: boolean | null;
  effectiveSince?: string | null;
};

type RatesApiAddonRateRecord = {
  rateAmount?: number | string | null;
  active?: boolean | null;
  effectiveSince?: string | null;
};

type RatesApiResponse = {
  platformFeeRates?: RatesApiRateRecord[] | null;
  taxRates?: RatesApiRateRecord[] | null;
  addonRates?: RatesApiAddonRateRecord[] | null;
};

const toNumber = (value: unknown): number | undefined => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const pickLatestActive = <
  T extends { active?: boolean | null; effectiveSince?: string | null },
>(
  items: T[] | null | undefined,
): T | undefined => {
  if (!items?.length) return undefined;
  const active = items.filter((item) => item.active !== false);
  const source = active.length ? active : items;
  return [...source].sort((a, b) =>
    String(b.effectiveSince ?? "").localeCompare(
      String(a.effectiveSince ?? ""),
    ),
  )[0];
};

function normalizeRatesResponse(payload: RatesApiResponse): RatesResponse {
  const platformServiceFee = pickLatestActive(
    (payload.platformFeeRates ?? []).filter(
      (fee) => fee.feeType === "PLATFORM_SERVICE_FEE",
    ),
  );
  const latestTaxRate = pickLatestActive(payload.taxRates);
  const latestSecurityRate = pickLatestActive(payload.addonRates);

  return {
    vatRatePercent: toNumber(latestTaxRate?.ratePercent),
    platformCustomerServiceFeeRatePercent:
      toNumber(platformServiceFee?.ratePercent),
    securityDetailRate: toNumber(latestSecurityRate?.rateAmount) ?? 0,
  };
}

async function fetchRates(init?: RequestInit): Promise<RatesResponse> {
  const payload = await getJson<RatesApiResponse>("/api/rates", init);
  return normalizeRatesResponse(payload);
}

export function useRates() {
  return useQuery({
    queryKey: RATES_QUERY_KEY,
    queryFn: ({ signal }) => fetchRates({ signal }),
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });
}
