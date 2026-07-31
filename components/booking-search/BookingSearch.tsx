import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useFetchFlightSearch } from "@/hooks/use-flight-search";
import { normalizeFlightNumber } from "@/lib/airport-pickup";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  BOOKING_TYPE_OPTIONS_MAP,
  NIGHT_BOOKING_TYPE,
  TAB_VALUE_TO_BOOKING_TYPE,
} from "@/lib/booking-types";
import {
  ensureDateRangeForPickupTime,
  getFromDateMinDate,
  getToDateMinDate,
  resolveDateRangeOnToChange,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import {
  clearFlightSearchValidation,
  flightSearchValidationFromError,
  flightSearchValidationFromLocalMessage,
  flightSearchValidationFromSuccess,
  type FlightSearchValidation,
} from "@/services/flights";
import dayjs from "dayjs";
import { usePathname, useRouter } from "expo-router";
import { Loader2, Search } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useBookingSearchDraft } from "./BookingSearchDraftProvider";
import { BookingTypeInput } from "./BookingTypeInput";
import { BookingTypeTabs } from "./BookingTypeTabs";

interface BookingSearchProps {
  readonly context?: "hero" | "modal";
  /** Called after search is triggered (e.g. to close modals) */
  readonly onSearchComplete?: () => void;
}

export function BookingSearch({
  context = "hero",
  onSearchComplete,
}: BookingSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sharedDraft = useBookingSearchDraft();
  const fetchFlightSearch = useFetchFlightSearch();
  const [isSearching, setIsSearching] = useState(false);
  const [isValidatingFlight, setIsValidatingFlight] = useState(false);
  const [shortFlightValidationError, setShortFlightValidationError] =
    useState<string | null>(null);
  const [isFlightUnbookable, setIsFlightUnbookable] = useState(false);

  const {
    bookingType,
    setBookingType,
    dateRange,
    setDateRange,
    pickupTime,
    setPickupTime,
    flightNumber,
    setFlightNumber,
    validatedFlight,
    setValidatedFlight,
    flightValidationError,
    setFlightValidationError,
  } = sharedDraft;

  const applyFlightValidation = useCallback(
    (validation: FlightSearchValidation) => {
      setValidatedFlight(validation.flight);
      setFlightValidationError(validation.message);
      setShortFlightValidationError(validation.shortMessage);
      setIsFlightUnbookable(validation.unbookable);
    },
    [
      setValidatedFlight,
      setFlightValidationError,
    ],
  );

  const resetFlightValidation = useCallback(() => {
    applyFlightValidation(clearFlightSearchValidation());
  }, [applyFlightValidation]);

  const fromDateMinDate = useMemo(
    () => getFromDateMinDate(bookingType),
    [bookingType],
  );

  const handleBookingTypeChange = useCallback(
    (tabValue: string) => {
      const newBookingType = TAB_VALUE_TO_BOOKING_TYPE[tabValue];
      if (newBookingType) {
        setBookingType(newBookingType);
        setDateRange({ from: undefined, to: undefined });
        setPickupTime(undefined);
        setFlightNumber(undefined);
        resetFlightValidation();
      }
    },
    [
      setBookingType,
      setDateRange,
      setPickupTime,
      setFlightNumber,
      resetFlightValidation,
    ],
  );

  const handleFromDateChange = useCallback(
    (date: Date | null) => {
      let d: Date | undefined;
      if (date) {
        const selectedDate = dayjs(date).startOf("day");
        const minDate = dayjs(fromDateMinDate).startOf("day");
        d = selectedDate.isBefore(minDate) ? fromDateMinDate : date;
      }

      let toDate: Date | undefined;
      if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
        toDate = d;
      } else if (dateRange.to && d && dateRange.to < d) {
        toDate = undefined;
      } else {
        toDate = dateRange.to;
      }

      setDateRange({ from: d, to: toDate });
      resetFlightValidation();
    },
    [
      bookingType,
      dateRange.to,
      fromDateMinDate,
      setDateRange,
      resetFlightValidation,
    ],
  );

  const toDateMinDate = useMemo(
    () => getToDateMinDate(bookingType, dateRange.from),
    [bookingType, dateRange.from],
  );

  const handleToDateChange = useCallback(
    (date: Date | null) => {
      const next = resolveDateRangeOnToChange(
        bookingType,
        dateRange.from,
        date ?? undefined,
      );
      if (!next) return;

      setDateRange(next);
      resetFlightValidation();
    },
    [
      bookingType,
      dateRange.from,
      setDateRange,
      resetFlightValidation,
    ],
  );

  const handlePickupTimeChange = useCallback(
    (value: string) => {
      const filled = ensureDateRangeForPickupTime(
        bookingType,
        dateRange.from,
        dateRange.to,
      );
      if (filled) {
        setDateRange(filled);
      }
      setPickupTime(value);
    },
    [
      bookingType,
      dateRange.from,
      dateRange.to,
      setDateRange,
      setPickupTime,
    ],
  );

  const handleFlightNumberChange = useCallback(
    (value: string) => {
      setFlightNumber(value);
      resetFlightValidation();
    },
    [setFlightNumber, resetFlightValidation],
  );

  const runFlightSearchValidation = useCallback(
    async (normalized: string, date: string) => {
      try {
        const result = await fetchFlightSearch(normalized, date);
        applyFlightValidation(flightSearchValidationFromSuccess(result));
        return true;
      } catch (error) {
        applyFlightValidation(flightSearchValidationFromError(error));
        return false;
      }
    },
    [fetchFlightSearch, applyFlightValidation],
  );

  const validateFlightForSearch = useCallback(
    async (normalized: string, date: string) => {
      setIsValidatingFlight(true);
      try {
        return await runFlightSearchValidation(normalized, date);
      } finally {
        setIsValidatingFlight(false);
      }
    },
    [runFlightSearchValidation],
  );

  const handleFlightSelected = useCallback(
    async (selected: string) => {
      const normalized = normalizeFlightNumber(selected);
      setFlightNumber(normalized);
      resetFlightValidation();

      if (!normalized || !/\d/.test(normalized)) {
        return;
      }
      if (!dateRange.from) {
        applyFlightValidation(
          flightSearchValidationFromLocalMessage("Please select a flight date"),
        );
        return;
      }

      await validateFlightForSearch(
        normalized,
        dayjs(dateRange.from).format("YYYY-MM-DD"),
      );
    },
    [
      dateRange.from,
      setFlightNumber,
      resetFlightValidation,
      applyFlightValidation,
      validateFlightForSearch,
    ],
  );

  const handleSearch = useCallback(async () => {
    setIsSearching(true);

    try {
      const params = new URLSearchParams();
      params.set("bookingType", bookingType);

      if (dateRange.from) {
        params.set("from", dayjs(dateRange.from).format("YYYY-MM-DD"));
      }

      if (dateRange.to) {
        params.set("to", dayjs(dateRange.to).format("YYYY-MM-DD"));
      }

      if (bookingType === AIRPORT_PICKUP_BOOKING_TYPE) {
        const normalizedFlight = normalizeFlightNumber(flightNumber);
        if (!normalizedFlight) {
          applyFlightValidation(
            flightSearchValidationFromLocalMessage("Please enter a flight number"),
          );
          return;
        }
        if (!dateRange.from) {
          applyFlightValidation(
            flightSearchValidationFromLocalMessage("Please select a flight date"),
          );
          return;
        }

        const date = dayjs(dateRange.from).format("YYYY-MM-DD");
        const ok = await runFlightSearchValidation(normalizedFlight, date);
        if (!ok) return;

        setFlightNumber(normalizedFlight);
        params.set("flightNumber", normalizedFlight);
      } else {
        resetFlightValidation();
        const effectivePickupTime =
          bookingType === NIGHT_BOOKING_TYPE ? "11 PM" : pickupTime;
        if (effectivePickupTime) {
          params.set("pickupTime", effectivePickupTime);
        }
      }

      const searchUrl: `/search?${string}` = `/search?${params.toString()}`;
      const isOnSearchPage = pathname === "/search";

      const navigate = () => {
        if (isOnSearchPage) {
          router.replace(searchUrl);
        } else {
          router.push(searchUrl);
        }
      };

      // Close sheet before navigate — simultaneous unmount + push crashes Android
      if (onSearchComplete) {
        onSearchComplete();
        setTimeout(navigate, 0);
      } else {
        navigate();
      }
    } catch (error) {
      applyFlightValidation(flightSearchValidationFromError(error));
    } finally {
      setIsSearching(false);
    }
  }, [
    bookingType,
    dateRange,
    pickupTime,
    flightNumber,
    router,
    pathname,
    onSearchComplete,
    setFlightNumber,
    applyFlightValidation,
    resetFlightValidation,
    runFlightSearchValidation,
  ]);

  const isAirport = bookingType === AIRPORT_PICKUP_BOOKING_TYPE;

  const bookingTypeInputProps = {
    bookingType,
    pickupTime,
    flightNumber,
    dateRange,
    onPickupTimeChange: handlePickupTimeChange,
    onFlightNumberChange: handleFlightNumberChange,
    onFlightSelected: handleFlightSelected,
    isValidatingFlight,
    validatedFlight,
    validationMessage: flightValidationError,
    shortValidationMessage: shortFlightValidationError,
    isCompact: false,
  };

  return (
    <View className="w-full">
      {/* Booking Type Tabs */}
      <View className="mb-4">
        <BookingTypeTabs
          value={BOOKING_TYPE_OPTIONS_MAP[bookingType].value}
          onValueChange={handleBookingTypeChange}
          variant={context}
        />
      </View>

      {/* White card / pill - overflow-visible so date picker dropdown can extend below */}
      <View className="w-full overflow-visible rounded-3xl border border-gray-200 bg-white shadow-2xl">
        {/* Row 1: From | To - always render both to maintain stable layout */}
        <View className="min-h-[60px] flex-row items-center gap-2 px-4 py-3">
          <DatePicker
            label={isAirport ? "Date" : "From"}
            value={dateRange.from ?? null}
            onChange={(d) => handleFromDateChange(d ? dayjs(d).toDate() : null)}
            placeholder="Select date"
            minDate={fromDateMinDate}
            triggerClassName="flex-1 min-w-0"
          />
          {/* Always render To picker but hide for Airport to prevent layout shifts */}
          <View
            className={cn(
              "flex-1 min-w-0",
              isAirport && "opacity-0 pointer-events-none",
            )}
          >
            <DatePicker
              label="To"
              value={dateRange.to ?? null}
              onChange={(d) => handleToDateChange(d ? dayjs(d).toDate() : null)}
              placeholder="Select date"
              minDate={toDateMinDate}
              triggerClassName="flex-1 min-w-0"
            />
          </View>
        </View>
        {/* Row 2: Pickup time / Flight number — overflow visible so flight suggestions sit below the input */}
        <View
          className="min-h-[60px] flex-col justify-center border-t border-gray-200 px-4 py-3"
          style={{ overflow: "visible", zIndex: isAirport ? 30 : 0 }}
          collapsable={false}
        >
          <BookingTypeInput {...bookingTypeInputProps} />
        </View>

        {/* Search button */}
        <View className="flex-row items-center justify-center border-t border-gray-200 px-4 py-3 min-h-[60px]">
          <Button
            className="h-12 w-full rounded-full bg-primary px-6"
            onPress={() => {
              void handleSearch();
            }}
            disabled={isSearching || (isAirport && isFlightUnbookable)}
          >
            {isSearching ? (
              <Loader2 color="#FFFFFF" size={20} strokeWidth={2} />
            ) : (
              <>
                <Search color="#FFFFFF" size={20} strokeWidth={2} />
                <Text className="ml-2 font-semibold text-primary-foreground">
                  Search
                </Text>
              </>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
}
