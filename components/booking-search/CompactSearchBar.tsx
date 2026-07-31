import {
  BOOKING_TYPE_OPTIONS_MAP,
  type BookingType,
  NIGHT_BOOKING_TYPE,
} from "@/lib/booking-types";
import dayjs from "dayjs";
import { Pressable, Text, View } from "react-native";
import { useBookingSearchDraft } from "./BookingSearchDraftProvider";

type AppliedSearchSummary = {
  readonly from?: string;
  readonly to?: string;
  readonly bookingType?: string;
  readonly pickupTime?: string;
  readonly flightNumber?: string;
};

interface CompactSearchBarProps {
  readonly onPress: () => void;
  /** When true, renders content only (no Pressable). Parent handles tap. */
  readonly asChild?: boolean;
  /** When true, always shows current search state (dates, booking type). When false, shows "When do you need a ride?" if no dates selected. */
  readonly showSearchState?: boolean;
  /** Applied URL search state (source of truth after user submits search). */
  readonly appliedSearch?: AppliedSearchSummary;
}

/**
 * Compact search bar for mobile
 * Shows "When do you need a ride?" in default state, or current search summary when selections exist
 * Opens full search UI on press
 */
export function CompactSearchBar({
  onPress,
  asChild,
  showSearchState = false,
  appliedSearch,
}: CompactSearchBarProps) {
  const { bookingType, dateRange, pickupTime, flightNumber } =
    useBookingSearchDraft();

  const getDateRangeTextFromDraft = () => {
    if (!dateRange.from) {
      return "Select dates";
    }

    const fromFormatted = dayjs(dateRange.from).format("MMM D");

    if (
      !dateRange.to ||
      !dateRange.from ||
      dateRange.from.getTime() === dateRange.to.getTime()
    ) {
      return fromFormatted;
    }

    const toFormatted = dayjs(dateRange.to).format("MMM D");
    return `${fromFormatted} - ${toFormatted}`;
  };

  const getDateRangeTextFromApplied = () => {
    if (!appliedSearch?.from) {
      return "Select dates";
    }

    const fromDate = dayjs(appliedSearch.from);

    if (!fromDate.isValid()) {
      return "Select dates";
    }

    const fromFormatted = fromDate.format("MMM D");

    if (!appliedSearch.to || appliedSearch.from === appliedSearch.to) {
      return fromFormatted;
    }

    const toDate = dayjs(appliedSearch.to);

    if (!toDate.isValid()) {
      return fromFormatted;
    }

    const toFormatted = toDate.format("MMM D");
    return `${fromFormatted} - ${toFormatted}`;
  };

  const getBookingTypeText = (activeBookingType: BookingType) => {
    return BOOKING_TYPE_OPTIONS_MAP[activeBookingType]?.label ?? "Same Day";
  };

  const getAdditionalInfo = (
    activeBookingType: BookingType,
    activePickupTime?: string,
    activeFlightNumber?: string,
  ) => {
    if (activeFlightNumber) {
      return activeFlightNumber;
    }

    if (activePickupTime) {
      return activePickupTime;
    }

    if (activeBookingType === NIGHT_BOOKING_TYPE) {
      return "11 PM";
    }

    return null;
  };

  const hasAppliedSearch = Boolean(appliedSearch);
  const normalizedAppliedBookingType = appliedSearch?.bookingType
    ?.toUpperCase()
    .replace("-", "_") as BookingType | undefined;
  const activeBookingType = hasAppliedSearch
    ? (normalizedAppliedBookingType ?? bookingType)
    : bookingType;
  const activePickupTime = hasAppliedSearch
    ? appliedSearch?.pickupTime
    : pickupTime;
  const activeFlightNumber = hasAppliedSearch
    ? appliedSearch?.flightNumber
    : flightNumber;
  const dateText = hasAppliedSearch
    ? getDateRangeTextFromApplied()
    : getDateRangeTextFromDraft();
  const bookingTypeText = getBookingTypeText(activeBookingType);
  const additionalInfo = getAdditionalInfo(
    activeBookingType,
    activePickupTime,
    activeFlightNumber,
  );

  const hasDraftSelections =
    dateRange.from || dateRange.to || pickupTime || flightNumber;
  const hasAppliedSelections =
    appliedSearch?.from ||
    appliedSearch?.to ||
    appliedSearch?.bookingType ||
    appliedSearch?.pickupTime ||
    appliedSearch?.flightNumber;

  // If applied params are provided, trust them (URL is source-of-truth on results pages).
  const shouldShowState = hasAppliedSearch
    ? Boolean(hasAppliedSelections)
    : showSearchState || Boolean(hasDraftSelections);

  const content = (
    <>
      {shouldShowState ? (
        <Text
          className="flex-1 text-center text-sm font-medium text-gray-900"
          numberOfLines={1}
        >
          {dateText}
          <Text className="text-sm text-gray-300"> • </Text>
          {bookingTypeText}
          {additionalInfo && (
            <>
              <Text className="text-sm text-gray-300"> • </Text>
              {additionalInfo}
            </>
          )}
        </Text>
      ) : (
        <Text className="text-sm font-semibold text-gray-900">
          When do you need a ride?
        </Text>
      )}
    </>
  );

  if (asChild) {
    return (
      <View
        className="w-full flex-row items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-lg"
        accessibilityRole="button"
        accessibilityLabel="Edit search parameters"
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className="w-full flex-row items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-lg"
      accessibilityRole="button"
      accessibilityLabel="Edit search parameters"
    >
      {content}
    </Pressable>
  );
}
