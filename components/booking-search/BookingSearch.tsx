import dayjs from "dayjs";
import { usePathname, useRouter } from "expo-router";
import { Loader2, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
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
  resolveSearchDateRangeChange,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import {
  clearFlightSearchValidation,
  type FlightSearchValidation,
  flightSearchValidationFromError,
  flightSearchValidationFromLocalMessage,
  flightSearchValidationFromSuccess,
} from "@/services/flights";
import { useBookingSearchDraft } from "./BookingSearchDraftProvider";
import { BookingTypeInput } from "./BookingTypeInput";
import { BookingTypeTabs } from "./BookingTypeTabs";
import { SearchDateRangePicker } from "./SearchDateRangePicker";

const searchStyles = {
  shell: {
    boxShadow: "inset 0 0 0 1px #E5E7EB",
  },
  button: {
    backgroundColor: "#18181B",
    boxShadow: "0 1px 1px rgba(0, 0, 0, 0.05)",
  },
} as const;

interface BookingSearchProps {
  /** Called after search is triggered (e.g. to close modals) */
  readonly onSearchComplete?: () => void;
}

export function BookingSearch({ onSearchComplete }: BookingSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sharedDraft = useBookingSearchDraft();
  const fetchFlightSearch = useFetchFlightSearch();
  const [isSearching, setIsSearching] = useState(false);
  const [isValidatingFlight, setIsValidatingFlight] = useState(false);
  const [shortFlightValidationError, setShortFlightValidationError] = useState<
    string | null
  >(null);
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
    [setValidatedFlight, setFlightValidationError],
  );

  const resetFlightValidation = useCallback(() => {
    applyFlightValidation(clearFlightSearchValidation());
  }, [applyFlightValidation]);

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

  const handleDateRangeChange = useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      setDateRange(resolveSearchDateRangeChange(bookingType, from, to));
      resetFlightValidation();
    },
    [bookingType, setDateRange, resetFlightValidation],
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
    [bookingType, dateRange.from, dateRange.to, setDateRange, setPickupTime],
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
            flightSearchValidationFromLocalMessage(
              "Please enter a flight number",
            ),
          );
          return;
        }
        if (!dateRange.from) {
          applyFlightValidation(
            flightSearchValidationFromLocalMessage(
              "Please select a flight date",
            ),
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
  const hasFlightFeedback =
    isAirport && !isValidatingFlight && Boolean(validatedFlight || flightValidationError);

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
    <View
      className="h-[326px] w-full rounded-lg bg-gray-50 px-4 py-6"
      style={searchStyles.shell}
    >
      <BookingTypeTabs
        value={BOOKING_TYPE_OPTIONS_MAP[bookingType].value}
        onValueChange={handleBookingTypeChange}
      />

      <View
        className={cn(
          "mt-6 h-[130px] w-full overflow-visible rounded-lg border border-gray-200 bg-white px-4",
          hasFlightFeedback ? "gap-1.5 py-1.5" : "gap-3 py-3",
        )}
      >
        <SearchDateRangePicker
          bookingType={bookingType}
          fromDate={dateRange.from}
          toDate={dateRange.to}
          onChange={handleDateRangeChange}
          single={isAirport}
        />
        <View className="border-t border-gray-200" />
        <View
          className="flex-col justify-center"
          style={{ overflow: "visible", zIndex: isAirport ? 30 : 0 }}
          collapsable={false}
        >
          <BookingTypeInput {...bookingTypeInputProps} />
        </View>
      </View>

      <Button
        className="mt-6 h-[52px] w-full rounded-md px-4"
        style={searchStyles.button}
        onPress={() => {
          void handleSearch();
        }}
        disabled={isSearching || (isAirport && isFlightUnbookable)}
      >
        {isSearching ? (
          <Loader2 color="#FAFAFA" size={16} strokeWidth={2} />
        ) : (
          <>
            <Search color="#FAFAFA" size={16} strokeWidth={2} />
            <Text
              className="text-sm leading-5"
              style={{ color: "#FAFAFA", fontFamily: "Geist-Medium" }}
            >
              Search
            </Text>
          </>
        )}
      </Button>
    </View>
  );
}
