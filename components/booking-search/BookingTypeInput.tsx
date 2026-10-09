import { Text, View } from "react-native";
import { FlightAutocompleteInput } from "@/components/ui/flight-autocomplete-input";
import { formatFlightSearchInlineSuccess } from "@/lib/airport-pickup";
import type { BookingType } from "@/lib/booking-types";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  DAY_BOOKING_TYPE,
  FULL_DAY_BOOKING_TYPE,
  NIGHT_BOOKING_TYPE,
} from "@/lib/booking-types";
import { cn } from "@/lib/utils";
import type { ValidatedFlight } from "@/services/flights";
import { TimePicker } from "./TimePicker";

interface BookingTypeInputProps {
  readonly bookingType: BookingType;
  readonly pickupTime: string | undefined;
  readonly flightNumber: string | undefined;
  readonly dateRange: { from?: Date; to?: Date };
  readonly onPickupTimeChange: (value: string) => void;
  readonly onFlightNumberChange: (value: string) => void;
  /** Called after user picks an airline suggestion (formatted flight number). */
  readonly onFlightSelected?: (flightNumber: string) => void;
  readonly isCompact?: boolean;
  readonly variant?: "inline" | "form";
  readonly hasError?: boolean;
  readonly isValidatingFlight?: boolean;
  readonly validatedFlight?: ValidatedFlight | null;
  readonly validationMessage?: string | null;
  readonly shortValidationMessage?: string | null;
}

/**
 * Renders all input variants but only shows the active one.
 * This prevents layout shifts when switching between booking types.
 */
export function BookingTypeInput({
  bookingType,
  pickupTime,
  flightNumber,
  dateRange,
  onPickupTimeChange,
  onFlightNumberChange,
  onFlightSelected,
  isCompact = false,
  variant = "inline",
  hasError = false,
  isValidatingFlight = false,
  validatedFlight = null,
  validationMessage = null,
  shortValidationMessage = null,
}: BookingTypeInputProps) {
  const isNight = bookingType === NIGHT_BOOKING_TYPE;
  const isAirport = bookingType === AIRPORT_PICKUP_BOOKING_TYPE;
  const isTimePicker =
    bookingType === DAY_BOOKING_TYPE || bookingType === FULL_DAY_BOOKING_TYPE;

  if (variant === "form") {
    if (isNight) {
      return (
        <View className="h-10 w-full justify-center rounded-md border border-neutral-200 bg-white px-3">
          <Text className="text-sm text-gray-900 leading-tight">11:00 PM</Text>
        </View>
      );
    }

    if (isAirport) {
      return (
        <FlightAutocompleteInput
          value={flightNumber ?? ""}
          onChangeText={onFlightNumberChange}
          onFlightSelected={onFlightSelected}
          placeholder="e.g. BA123"
          hasError={hasError}
          isValidating={isValidatingFlight}
          variant="form"
        />
      );
    }

    return (
      <TimePicker
        date={dateRange.from}
        value={pickupTime}
        onValueChange={onPickupTimeChange}
        bookingType={bookingType}
        placeholder="Select pickup time"
        variant="form"
        triggerClassName={hasError ? "border-red-500" : undefined}
      />
    );
  }

  if (isNight) {
    return (
      <View className="w-full flex-row items-center justify-between gap-4 py-3">
        <Text
          className="text-sm leading-[14px] text-gray-800"
          style={{ fontFamily: "Geist-SemiBold" }}
        >
          Time
        </Text>
        <Text
          className="text-sm leading-[14px] text-gray-800"
          style={{ fontFamily: "Geist-Regular" }}
        >
          11:00 PM
        </Text>
      </View>
    );
  }

  if (isTimePicker) {
    return (
      <TimePicker
        date={dateRange.from}
        value={pickupTime}
        onValueChange={onPickupTimeChange}
        bookingType={bookingType}
        label="Time"
        placeholder={isCompact ? "Select time" : "Select pickup time"}
        variant="inline"
      />
    );
  }

  let validationContent: string | null = null;
  let validationClassName = "text-gray-500";
  if (validatedFlight && !isValidatingFlight) {
    validationContent = formatFlightSearchInlineSuccess(validatedFlight);
    validationClassName = "text-green-600";
  } else if (validationMessage && !isValidatingFlight) {
    validationContent = shortValidationMessage ?? validationMessage;
  }

  return (
    <View className="w-full" collapsable={false}>
      <View className="w-full flex-row items-center justify-between gap-4 py-3">
        <Text
          className="shrink-0 text-sm leading-[14px] text-gray-800"
          style={{ fontFamily: "Geist-SemiBold" }}
        >
          Flight number
        </Text>
        <FlightAutocompleteInput
          value={flightNumber ?? ""}
          onChangeText={onFlightNumberChange}
          onFlightSelected={onFlightSelected}
          placeholder="E.g BA123"
          isValidating={isValidatingFlight}
          variant="inline"
          className="min-w-0 flex-1"
          inputClassName="text-right text-gray-800"
        />
      </View>
      {validationContent ? (
        <Text
          selectable
          className={cn(
            "pb-2 text-right text-xs leading-tight",
            validationClassName,
          )}
        >
          {validationContent}
        </Text>
      ) : null}
    </View>
  );
}
