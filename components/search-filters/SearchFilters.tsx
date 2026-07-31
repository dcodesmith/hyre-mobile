import { Checkbox } from "@/components/ui/checkbox";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { useCarSearch } from "@/hooks/use-car-search";
import type { CarSearchParams, SearchFacets } from "@/lib/car-types";
import { isExpoWeb } from "@/lib/expo-platform";
import {
  applySearchFiltersToParams,
  CAPACITY_OPTIONS,
  countActiveSearchFilters,
  emptySearchFilters,
  getSliderStep,
  parseSearchFilters,
  PRICE_UNIT_LABELS,
  routeParamsToSearchParams,
  SEARCH_FILTER_PARAM_KEYS,
  searchFiltersToParams,
  SERVICE_TIERS,
  serviceTierLabels,
  VEHICLE_TYPES,
  vehicleTypeLabels,
  type SearchFilterValues,
} from "@/lib/search-filters";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { RangeSlider } from "@react-native-assets/slider";
import * as DialogPrimitive from "@rn-primitives/dialog";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SlidersHorizontal, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SearchFiltersProps {
  /** Facets for the make list (price section is added separately). */
  readonly facets: SearchFacets | null;
  /** Non-filter query params (from/to/bookingType/etc.) merged into the live count. */
  readonly baseParams: CarSearchParams;
  /** Booking type, used to label the price unit ("per day" etc.). */
  readonly bookingType?: string;
  /** Count of applied filters, shown as a badge on the trigger. */
  readonly activeFilterCount: number;
}

function Pill({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "rounded-full border px-4 py-2 active:opacity-80",
        selected
          ? "border-gray-900 bg-gray-900"
          : "border-gray-300 bg-white",
      )}
    >
      <Text
        className={cn(
          "text-sm font-medium",
          selected ? "text-white" : "text-gray-800",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FilterSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-gray-900">{title}</Text>
      {children}
    </View>
  );
}

export function SearchFilters({
  facets,
  baseParams,
  bookingType,
  activeFilterCount,
}: SearchFiltersProps) {
  const router = useRouter();
  const routeParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilterValues>(emptySearchFilters);

  // Debounce the draft so the live count doesn't fire on every tap.
  const draftKey = JSON.stringify(draft);
  const [debouncedKey, setDebouncedKey] = useState(draftKey);
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => setDebouncedKey(draftKey), 300);
    return () => clearTimeout(timeout);
  }, [open, draftKey]);

  const debouncedDraft = useMemo(
    () => JSON.parse(debouncedKey) as SearchFilterValues,
    [debouncedKey],
  );

  const countParams = useMemo<CarSearchParams>(
    () => ({
      ...baseParams,
      ...searchFiltersToParams(debouncedDraft),
      countOnly: true,
      page: 1,
      limit: 1,
    }),
    [baseParams, debouncedDraft],
  );

  const countQuery = useCarSearch(countParams, { enabled: open });
  const countIsCurrent =
    countQuery.isSuccess && !countQuery.isFetching && debouncedKey === draftKey;
  const resultCount = countIsCurrent
    ? countQuery.data?.pagination?.total
    : undefined;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(parseSearchFilters(routeParamsToSearchParams(routeParams)));
    }
    setOpen(next);
  };

  const handleApply = () => {
    const params = routeParamsToSearchParams(routeParams);
    applySearchFiltersToParams(params, draft);
    // setParams merges, so pass undefined for filter keys that are now unset.
    const nextFilterParams = Object.fromEntries(
      SEARCH_FILTER_PARAM_KEYS.map((key) => [key, params.get(key) ?? undefined]),
    );
    setOpen(false);
    // setParams updates /search in place (no navigation), so the sheet's exit
    // animation runs without the portal being torn down mid-draw.
    router.setParams(nextFilterParams);
  };

  const toggleVehicleType = (type: (typeof VEHICLE_TYPES)[number]) => {
    setDraft((prev) => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(type)
        ? prev.vehicleTypes.filter((t) => t !== type)
        : [...prev.vehicleTypes, type],
    }));
  };

  const toggleServiceTier = (tier: (typeof SERVICE_TIERS)[number]) => {
    setDraft((prev) => ({
      ...prev,
      serviceTiers: prev.serviceTiers.includes(tier)
        ? prev.serviceTiers.filter((t) => t !== tier)
        : [...prev.serviceTiers, tier],
    }));
  };

  const setCapacity = (capacity: number | null) => {
    setDraft((prev) => ({ ...prev, minCapacity: capacity }));
  };

  const toggleMake = (make: string, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      makes: checked
        ? [...prev.makes, make]
        : prev.makes.filter((m) => m.toLowerCase() !== make.toLowerCase()),
    }));
  };

  const isMakeSelected = (make: string) =>
    draft.makes.some((m) => m.toLowerCase() === make.toLowerCase());

  // Price slider bounds come from facets; only show when there is a real range.
  const priceBounds =
    facets && facets.price.max > facets.price.min ? facets.price : null;
  const sliderMin = priceBounds?.min ?? 0;
  const sliderMax = priceBounds?.max ?? 0;
  const sliderStep = getSliderStep(sliderMax - sliderMin);
  const sliderValue: [number, number] = [
    Math.max(sliderMin, Math.min(draft.minPrice ?? sliderMin, sliderMax)),
    Math.min(sliderMax, Math.max(draft.maxPrice ?? sliderMax, sliderMin)),
  ];
  const priceUnitLabel = PRICE_UNIT_LABELS[bookingType ?? ""] ?? "per day";

  const handlePriceChange = ([low, high]: [number, number]) => {
    setDraft((prev) => ({
      ...prev,
      minPrice: low <= sliderMin ? null : low,
      maxPrice: high >= sliderMax ? null : high,
    }));
  };

  const draftFilterCount = countActiveSearchFilters(draft);
  const vehicleNoun = resultCount === 1 ? "vehicle" : "vehicles";
  const applyLabel =
    resultCount === undefined
      ? "Show results"
      : `Show ${resultCount} ${vehicleNoun}`;

  return (
    <>
      <Pressable
        onPress={() => handleOpenChange(true)}
        accessibilityRole="button"
        accessibilityLabel="Filters"
        className="relative h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white active:bg-gray-100"
      >
        <SlidersHorizontal size={18} color="#374151" strokeWidth={2} />
        {activeFilterCount > 0 ? (
          <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1">
            <Text className="text-[10px] font-semibold text-white">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "absolute inset-0 z-50 flex-1 items-center justify-end bg-black/50",
              isExpoWeb && "animate-in fade-in-0 fixed cursor-default",
            )}
            asChild={!isExpoWeb}
          >
            <NativeOnlyAnimatedView
              entering={SlideInDown.duration(250)}
              exiting={SlideOutDown.duration(200)}
              className="w-full"
            >
              <DialogPrimitive.Content
                className="w-full rounded-t-3xl bg-white shadow-lg"
                style={{ maxHeight: height * 0.88 }}
                pointerEvents="auto"
              >
                <View className="flex-row items-center justify-between border-b border-gray-200 px-6 py-4">
                  <Text className="text-lg font-semibold text-gray-900">
                    Filters
                  </Text>
                  <DialogPrimitive.Close hitSlop={12} className="p-1">
                    <X size={20} strokeWidth={2} color="#525252" />
                  </DialogPrimitive.Close>
                </View>

                <ScrollView
                  className="px-6"
                  contentContainerStyle={{ paddingVertical: 24, gap: 24 }}
                  showsVerticalScrollIndicator={false}
                >
                  {priceBounds ? (
                    <>
                      <FilterSection
                        title={`Price range (${priceUnitLabel})`}
                      >
                        <RangeSlider
                          range={sliderValue}
                          minimumValue={sliderMin}
                          maximumValue={sliderMax}
                          step={sliderStep}
                          minimumRange={sliderStep}
                          crossingAllowed={false}
                          outboundColor="#E5E7EB"
                          inboundColor="#111827"
                          thumbTintColor="#FFFFFF"
                          trackHeight={8}
                          thumbSize={20}
                          thumbStyle={{
                            borderWidth: 2,
                            borderColor: "#111827",
                          }}
                          trackStyle={{ borderRadius: 999 }}
                          onValueChange={handlePriceChange}
                          style={{ marginHorizontal: 4 }}
                        />
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600">
                            {formatCurrency(sliderValue[0])}
                          </Text>
                          <Text className="text-sm text-gray-600">
                            {formatCurrency(sliderValue[1])}
                            {sliderValue[1] >= sliderMax ? "+" : ""}
                          </Text>
                        </View>
                      </FilterSection>
                      <View className="h-px bg-gray-200" />
                    </>
                  ) : null}

                  <FilterSection title="Vehicle type">
                    <View className="flex-row flex-wrap gap-2">
                      {VEHICLE_TYPES.map((type) => (
                        <Pill
                          key={type}
                          label={vehicleTypeLabels[type]}
                          selected={draft.vehicleTypes.includes(type)}
                          onPress={() => toggleVehicleType(type)}
                        />
                      ))}
                    </View>
                  </FilterSection>

                  <View className="h-px bg-gray-200" />

                  <FilterSection title="Service tier">
                    <View className="flex-row flex-wrap gap-2">
                      {SERVICE_TIERS.map((tier) => (
                        <Pill
                          key={tier}
                          label={serviceTierLabels[tier]}
                          selected={draft.serviceTiers.includes(tier)}
                          onPress={() => toggleServiceTier(tier)}
                        />
                      ))}
                    </View>
                  </FilterSection>

                  <View className="h-px bg-gray-200" />

                  <FilterSection title="Passengers">
                    <View className="flex-row flex-wrap gap-2">
                      <Pill
                        label="Any"
                        selected={draft.minCapacity === null}
                        onPress={() => setCapacity(null)}
                      />
                      {CAPACITY_OPTIONS.map((capacity) => (
                        <Pill
                          key={capacity}
                          label={`${capacity}+`}
                          selected={draft.minCapacity === capacity}
                          onPress={() => setCapacity(capacity)}
                        />
                      ))}
                    </View>
                  </FilterSection>

                  {facets && facets.makes.length > 0 ? (
                    <>
                      <View className="h-px bg-gray-200" />
                      <FilterSection title="Make">
                        <View className="flex-row flex-wrap">
                          {facets.makes.map((make) => (
                            <Pressable
                              key={make.name}
                              onPress={() =>
                                toggleMake(make.name, !isMakeSelected(make.name))
                              }
                              className="w-1/2 flex-row items-center gap-2 py-1.5"
                            >
                              <Checkbox
                                checked={isMakeSelected(make.name)}
                                onCheckedChange={(checked) =>
                                  toggleMake(make.name, checked === true)
                                }
                              />
                              <Text className="flex-1 text-sm text-gray-800">
                                {make.name}{" "}
                                <Text className="text-gray-400">
                                  ({make.count})
                                </Text>
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </FilterSection>
                    </>
                  ) : null}

                  <View className="h-px bg-gray-200" />

                  <FilterSection title="Extras">
                    <View className="flex-row items-center justify-between gap-4">
                      <Text className="text-sm text-gray-800">
                        Fuel included in price
                      </Text>
                      <Switch
                        value={draft.fuelIncluded}
                        onValueChange={(value) =>
                          setDraft((prev) => ({ ...prev, fuelIncluded: value }))
                        }
                      />
                    </View>
                    <View className="flex-row items-center justify-between gap-4">
                      <Text className="text-sm text-gray-800">On promotion</Text>
                      <Switch
                        value={draft.dealsOnly}
                        onValueChange={(value) =>
                          setDraft((prev) => ({ ...prev, dealsOnly: value }))
                        }
                      />
                    </View>
                  </FilterSection>
                </ScrollView>

                <View
                  className="flex-row items-center justify-between border-t border-gray-200 px-6 pt-4"
                  style={{ paddingBottom: Math.max(16, insets.bottom) }}
                >
                  <Pressable
                    onPress={() => setDraft(emptySearchFilters())}
                    disabled={draftFilterCount === 0}
                    className={cn(
                      "px-2 py-2",
                      draftFilterCount === 0 && "opacity-40",
                    )}
                  >
                    <Text className="text-sm font-medium text-gray-900 underline">
                      Clear all
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleApply}
                    className="rounded-full bg-gray-900 px-5 py-3 active:opacity-90"
                  >
                    <Text className="text-sm font-semibold text-white">
                      {applyLabel}
                    </Text>
                  </Pressable>
                </View>
              </DialogPrimitive.Content>
            </NativeOnlyAnimatedView>
          </DialogPrimitive.Overlay>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
